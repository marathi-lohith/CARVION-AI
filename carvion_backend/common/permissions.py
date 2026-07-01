import logging
import jwt
from rest_framework.authentication import BaseAuthentication
from rest_framework.permissions import BasePermission
from django.conf import settings
from common.exceptions import AuthenticationFailed, InvalidToken
from common.utils import parse_http_only_cookies, decode_jwt

logger = logging.getLogger("carvion.security")

class MongoJWTAuthentication(BaseAuthentication):
    """
    Custom DRF Authentication class for MongoEngine.
    Extracts access token from HTTP-Only cookie or Bearer Authorization header,
    verifies it, and resolves it into a MongoEngine User document.
    """
    def authenticate_header(self, request):
        return 'Bearer'

    def authenticate(self, request):
        access_token, _ = parse_http_only_cookies(request)
        if not access_token:
            return None  # Let other authentication classes try, or fall back to default
            
        try:
            payload = decode_jwt(access_token, settings.JWT_ACCESS_SECRET)
        except jwt.ExpiredSignatureError as exc:
            logger.warning("Expired access token attempt.")
            raise InvalidToken("Session expired. Please log in again.") from exc
        except jwt.InvalidTokenError as exc:
            logger.warning("Invalid token attempt: %s", str(exc))
            raise InvalidToken("Invalid authentication credentials.") from exc

        user_id = payload.get("user_id")
        if not user_id:
            raise AuthenticationFailed("Malformed authentication token.")

        # Lazy import of User model to avoid circular dependencies
        try:
            from apps.authentication.models import User
        except ImportError:
            logger.error("Failed to import MongoEngine User model. Check authentication app installation.")
            raise AuthenticationFailed("Internal user resolution error.")

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            logger.warning("Token references non-existent user ID: %s", user_id)
            raise AuthenticationFailed("User account not found.")

        # The MongoEngine User model already has is_authenticated as a property returning True
        return (user, None)


class IsAdminUser(BasePermission):
    """Allows access only to users with 'admin' role."""
    def has_permission(self, request, view):
        return (
            request.user 
            and hasattr(request.user, "role") 
            and request.user.role == "admin"
        )


class IsStandardUser(BasePermission):
    """Allows access only to users with 'standard' role."""
    def has_permission(self, request, view):
        return (
            request.user 
            and hasattr(request.user, "role") 
            and request.user.role == "standard"
        )
