import datetime
import jwt
from django.conf import settings
from django.contrib.auth.hashers import make_password as django_make_password, check_password as django_check_password

def make_password(password: str) -> str:
    """Securely hash a password using Django's default PBKDF2 algorithm."""
    return django_make_password(password)

def check_password(password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a hashed database password."""
    return django_check_password(password, hashed_password)

def generate_jwt(payload: dict, secret: str, lifetime_delta: datetime.timedelta) -> str:
    """Generate a JWT token signed with the provided secret and expiration delta."""
    full_payload = payload.copy()
    now = datetime.datetime.utcnow()
    full_payload.update({
        "iat": now,
        "exp": now + lifetime_delta
    })
    return jwt.encode(full_payload, secret, algorithm="HS256")

def decode_jwt(token: str, secret: str) -> dict:
    """
    Decode and validate a JWT token.
    Raises:
        jwt.ExpiredSignatureError: If the token has expired.
        jwt.InvalidTokenError: If the token signature is invalid.
    """
    return jwt.decode(token, secret, algorithms=["HS256"])

def generate_access_token(user_id: str, email: str, role: str) -> str:
    """Helper to generate a standard access token."""
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "type": "access"
    }
    lifetime = datetime.timedelta(minutes=settings.JWT_ACCESS_LIFETIME_MINUTES)
    return generate_jwt(payload, settings.JWT_ACCESS_SECRET, lifetime)

def generate_refresh_token(user_id: str, email: str) -> str:
    """Helper to generate a standard refresh token."""
    payload = {
        "user_id": user_id,
        "email": email,
        "type": "refresh"
    }
    lifetime = datetime.timedelta(days=settings.JWT_REFRESH_LIFETIME_DAYS)
    return generate_jwt(payload, settings.JWT_REFRESH_SECRET, lifetime)

def parse_http_only_cookies(request) -> tuple:
    """
    Helper to extract access and refresh tokens from HTTP-only cookies
    or the standard authorization headers.
    """
    access_token = request.COOKIES.get("access_token")
    refresh_token = request.COOKIES.get("refresh_token")
    
    # Fallback to Authorization Header for access token
    auth_header = request.headers.get("Authorization")
    if not access_token and auth_header and auth_header.startswith("Bearer "):
        access_token = auth_header.split(" ")[1]
        
    return access_token, refresh_token


def log_user_activity(user, module: str, activity_type: str, description: str, status: str = "success", metadata: dict = None):
    """
    Log user activity event into MongoDB collection.
    Safely handles import errors and document write exceptions.
    """
    try:
        from apps.profiles.models import UserActivityLog
        log = UserActivityLog(
            user=user,
            module=module,
            activity_type=activity_type,
            description=description,
            status=status,
            metadata=metadata or {}
        )
        log.save()

        # Dispatch system notification alert for admin users
        try:
            from apps.authentication.models import User as AuthUser
            from apps.notifications.services import send_notification
            
            # Map module/activity type to friendly type and title
            type_map = {
                "auth": "System",
                "profile": "System",
                "resumes": "System",
                "jobs": "Job Alert",
                "learning": "Course Suggestion",
                "assessments": "Mock Test Result",
                "system": "System",
            }
            type_str = type_map.get(module, "System")
            
            # Form clean title and message
            title = f"{module.capitalize()} Event: {activity_type.replace('_', ' ').title()}"
            message = f"User {user.name or user.email}: {description}"
            if status == "failed" or status == "warning":
                title = f"Warning: {title}"
                message = f"System Warning/Error: {description}"
            
            admins = AuthUser.objects(role="admin")
            for admin in admins:
                # Do not notify administrators of their own logged actions to prevent recursion
                if str(admin.id) != str(user.id):
                    send_notification(admin, type_str, title, message)
        except Exception as alert_exc:
            import logging
            logger = logging.getLogger("carvion.api")
            logger.error(f"Failed to send admin activity notification: {alert_exc}")

    except Exception as e:
        import logging
        logger = logging.getLogger("carvion.api")
        logger.error(f"Failed to log user activity: {e}")


