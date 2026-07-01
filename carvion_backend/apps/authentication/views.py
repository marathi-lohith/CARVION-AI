import datetime
import logging
import jwt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings

from apps.authentication.models import User, RefreshToken
from apps.authentication.serializers import (
    RegisterSerializer, LoginSerializer, 
    GoogleOAuthSerializer, UserSerializer
)
from apps.authentication.services import (
    verify_google_oauth_token, issue_user_session, clear_user_session
)
from common.exceptions import AuthenticationFailed, BadRequest, PermissionDenied
from common.utils import decode_jwt

logger = logging.getLogger("carvion.api")

@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    """Register a new credentials user and auto-login."""
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "error": {
                    "message": "Validation failed.",
                    "code": "ValidationError",
                    "details": serializer.errors
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    validated_data = serializer.validated_data
    user = User(
        name=validated_data["name"],
        username=validated_data["username"],
        email=validated_data["email"],
        role="standard"
    )
    user.set_password(validated_data["password"])
    user.save()

    response = Response({"success": True}, status=status.HTTP_201_CREATED)
    user_data = issue_user_session(user, response)
    response.data["data"] = user_data

    from common.utils import log_user_activity
    log_user_activity(user, "auth", "register", "Account registered and logged in successfully")

    return response


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    """Authenticate standard user credentials and set HTTP-only token cookies."""
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "error": {
                    "message": "Validation failed.",
                    "code": "ValidationError",
                    "details": serializer.errors
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    email = serializer.validated_data["email"].lower().strip()
    password = serializer.validated_data["password"]
    portal = serializer.validated_data.get("portal", "user")

    user = User.objects(email=email).first()
    from common.utils import log_user_activity
    if not user or not user.check_password(password):
        if user:
            log_user_activity(user, "auth", "failed_login", "Failed login attempt (incorrect password)", status="failed")
        raise AuthenticationFailed("Incorrect email or password details.")

    # Portal-based role enforcement
    if portal == "user" and user.role == "admin":
        raise PermissionDenied("Administrator accounts must sign in through the Administrator Portal.")
    if portal == "admin" and user.role != "admin":
        raise PermissionDenied("This account is not authorized for the Administrator Portal.")

    if not user.is_active:
        log_user_activity(user, "auth", "failed_login", "Failed login attempt (deactivated account)", status="failed")
        raise AuthenticationFailed("This user account has been deactivated.")

    response = Response({"success": True})
    user_data = issue_user_session(user, response)
    response.data["data"] = user_data

    # Log successful login with user agent details
    ua = request.META.get("HTTP_USER_AGENT", "unknown")
    log_user_activity(user, "auth", "login", f"Successful login", metadata={"user_agent": ua})

    return response


@api_view(["POST"])
@permission_classes([AllowAny])
def google_oauth_view(request):
    """Authenticate Google OAuth client credentials, matching/creating MongoDB User documents."""
    serializer = GoogleOAuthSerializer(data=request.data)
    if not serializer.is_valid():
        raise BadRequest("Google token parameter is required.")

    token = serializer.validated_data["token"]
    portal = serializer.validated_data.get("portal", "user")
    try:
        google_payload = verify_google_oauth_token(token)
    except ValueError as exc:
        raise AuthenticationFailed(str(exc))

    email = google_payload["email"].lower().strip()
    user = User.objects(email=email).first()

    if not user:
        # Auto-create user document if it does not exist (Social Registration)
        user = User(
            email=email,
            name=google_payload["name"],
            role="standard"
        )
        user.save()

    # Portal-based role enforcement
    if portal == "user" and user.role == "admin":
        raise PermissionDenied("Administrator accounts must sign in through the Administrator Portal.")
    if portal == "admin" and user.role != "admin":
        raise PermissionDenied("This account is not authorized for the Administrator Portal.")

    if not user.is_active:
        raise AuthenticationFailed("This user account has been deactivated.")

    response = Response({"success": True})
    user_data = issue_user_session(user, response)
    response.data["data"] = user_data
    return response


@api_view(["POST"])
@permission_classes([AllowAny])
def token_refresh_view(request):
    """Validate refresh token from cookies and issue fresh cookies."""
    refresh_token = request.COOKIES.get("refresh_token")
    if not refresh_token:
        raise AuthenticationFailed("Session expired. Please log in again.")

    # Validate that token is registered in DB
    token_doc = RefreshToken.objects(token=refresh_token).first()
    if not token_doc or token_doc.expires_at < datetime.datetime.utcnow():
        raise AuthenticationFailed("Invalid or expired refresh session.")

    try:
        decode_jwt(refresh_token, settings.JWT_REFRESH_SECRET)
    except jwt.ExpiredSignatureError as exc:
        token_doc.delete()
        raise AuthenticationFailed("Refresh session has expired.") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthenticationFailed("Invalid token signatures.") from exc

    user = token_doc.user
    if not user or not user.is_active:
        raise AuthenticationFailed("Associated user account is deactivated or missing.")

    response = Response({"success": True})
    user_data = issue_user_session(user, response)
    response.data["data"] = user_data
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Revoke refresh session database records and flush HTTP cookies."""
    from common.utils import log_user_activity
    log_user_activity(request.user, "auth", "logout", "User logged out")
    response = Response({"success": True})
    clear_user_session(request, response)
    return response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Resolve and return current authenticated user metadata."""
    serializer = UserSerializer(request.user)
    return Response({
        "success": True,
        "data": serializer.data
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def delete_account_view(request):
    """
    Schedule the user account for deletion.
    Requires password verification for security.
    """
    user = request.user
    password = request.data.get("password")
    
    # Verify password if user has password_hash
    if user.password_hash:
        if not password or not user.check_password(password):
            return Response(
                {
                    "success": False,
                    "error": {
                        "message": "Incorrect password. Please try again.",
                        "code": "IncorrectPassword"
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
            
    # Calculate deletion date (30 days from now)
    now = datetime.datetime.utcnow()
    deletion_date = now + datetime.timedelta(days=30)
    
    user.is_pending_deletion = True
    user.scheduled_deletion_date = deletion_date
    user.deletion_requested_at = now
    user.save()
    
    from common.utils import log_user_activity
    log_user_activity(user, "auth", "delete_requested", f"Account deletion scheduled for {deletion_date.strftime('%B %d, %Y')}")
    
    response = Response({
        "success": True,
        "message": "Account deletion scheduled successfully.",
        "data": {
            "scheduled_deletion_date": deletion_date.isoformat(),
            "formatted_date": deletion_date.strftime("%B %d, %Y")
        }
    })
    
    # Log the user out immediately after scheduling
    clear_user_session(request, response)
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cancel_deletion_view(request):
    """
    Cancel a scheduled account deletion and restore user status.
    """
    user = request.user
    if not user.is_pending_deletion:
        return Response({
            "success": False,
            "error": {
                "message": "This account is not scheduled for deletion.",
                "code": "NotPendingDeletion"
            }
        }, status=status.HTTP_400_BAD_REQUEST)
        
    user.is_pending_deletion = False
    user.scheduled_deletion_date = None
    user.deletion_requested_at = None
    user.save()
    
    from common.utils import log_user_activity
    log_user_activity(user, "auth", "delete_cancelled", "Account deletion scheduled request cancelled")
    
    serializer = UserSerializer(user)
    return Response({
        "success": True,
        "message": "Welcome back! Your scheduled account deletion has been cancelled successfully.",
        "data": serializer.data
    })

