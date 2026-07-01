import datetime
import requests
import logging
from django.conf import settings
from apps.authentication.models import User, RefreshToken
from common.utils import generate_access_token, generate_refresh_token

logger = logging.getLogger("carvion.security")

def verify_google_oauth_token(id_token: str) -> dict:
    """
    Verify incoming Google ID Token using Google API Token Info endpoint.
    Returns decoded user metadata if valid, else raises Exception.
    """
    try:
        response = requests.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}",
            timeout=5
        )
        if response.status_code != 200:
            logger.warning("Google token verification endpoint returned status: %d", response.status_code)
            raise ValueError("Invalid Google OAuth token credentials.")
            
        payload = response.json()
        
        # Validate that the audience is our client ID
        import os
        google_client_id = os.environ.get("GOOGLE_CLIENT_ID") or os.environ.get("GOOGLE_OAUTH_CLIENT_ID", "")
        if aud != google_client_id:
            # If Google OAuth client id is not configured or differs, log a security flag but proceed if in debug
            if not settings.DEBUG:
                logger.error("Audience mismatch in Google Token: %s", aud)
                raise ValueError("Unauthorized client audience ID.")
                
        return {
            "email": payload.get("email"),
            "name": payload.get("name"),
            "email_verified": payload.get("email_verified") == "true" or payload.get("email_verified") is True
        }
    except Exception as exc:
        logger.exception("Google token verification failed: %s", str(exc))
        raise ValueError("Google OAuth token authentication failed.") from exc


def issue_user_session(user: User, response) -> dict:
    """
    Generate access & refresh tokens, track refresh token in database,
    and configure HTTP-only response cookies.
    """
    user_id_str = str(user.id)
    
    # 1. Create tokens
    access_token = generate_access_token(user_id_str, user.email, user.role)
    refresh_token = generate_refresh_token(user_id_str, user.email)
    
    # 2. Save Refresh Token in Database (with TTL handling)
    expires_delta = datetime.timedelta(days=settings.JWT_REFRESH_LIFETIME_DAYS)
    expires_at = datetime.datetime.utcnow() + expires_delta
    
    # Revoke old active sessions to prevent infinite active sessions per user
    RefreshToken.objects(user=user).delete()
    
    token_doc = RefreshToken(
        user=user,
        token=refresh_token,
        expires_at=expires_at
    )
    token_doc.save()

    # 3. Configure HTTP-Only cookies on the response object
    # Set Access Token cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=settings.JWT_ACCESS_LIFETIME_MINUTES * 60,
        path="/",
        domain=None,
        secure=not settings.DEBUG,  # False for local HTTP, True in production
        httponly=True,
        samesite="Lax"
    )
    
    # Set Refresh Token cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=settings.JWT_REFRESH_LIFETIME_DAYS * 24 * 60 * 60,
        path="/",
        domain=None,
        secure=not settings.DEBUG,
        httponly=True,
        samesite="Lax"
    )
    
    from apps.authentication.serializers import UserSerializer
    return UserSerializer(user).data



def clear_user_session(request, response):
    """
    Revoke current refresh token database records and clear cookies from response.
    """
    refresh_token = request.COOKIES.get("refresh_token")
    if refresh_token:
        try:
            RefreshToken.objects(token=refresh_token).delete()
        except Exception:
            logger.exception("Error deleting refresh token document during logout.")

    # Expire cookies on the browser side
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
