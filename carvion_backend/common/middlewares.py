import logging
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger("carvion.security")
api_logger = logging.getLogger("carvion.api")

class SecuritySanitizationMiddleware(MiddlewareMixin):
    """
    Middleware to sanitize inbound requests and enforce security measures.
    - Limits standard file upload size to 5MB.
    - White-lists specific MIME types for file uploads (PDF and DOCX).
    """
    def process_request(self, request):
        # 1. Enforce content-length limits for file uploads
        content_type = request.META.get("CONTENT_TYPE", "")
        if "multipart/form-data" in content_type:
            content_length = request.META.get("CONTENT_LENGTH")
            if content_length:
                try:
                    size_bytes = int(content_length)
                    if size_bytes > 5 * 1024 * 1024:  # 5MB Limit
                        logger.warning(
                            "Blocked request: Content-Length %d exceeds maximum allowed limit (5MB).",
                            size_bytes
                        )
                        return JsonResponse(
                            {
                                "success": False,
                                "error": {
                                    "message": "Maximum allowed upload size is 5MB.",
                                    "code": "PayloadTooLarge",
                                    "details": None
                                }
                            },
                            status=400
                        )
                except ValueError:
                    pass

            # 2. Enforce white-listed file MIME types
            for field_name, uploaded_file in request.FILES.items():
                mime_type = getattr(uploaded_file, "content_type", "")
                allowed_mimes = [
                    "application/pdf",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"  # .docx
                ]
                
                if mime_type not in allowed_mimes:
                    logger.warning(
                        "Blocked request: File '%s' has disallowed MIME type '%s'.",
                        uploaded_file.name,
                        mime_type
                    )
                    return JsonResponse(
                        {
                            "success": False,
                            "error": {
                                "message": "Invalid file type. Only PDF and DOCX documents are supported.",
                                "code": "UnsupportedMediaType",
                                "details": None
                            }
                        },
                        status=400
                    )
        return None


class GlobalExceptionMiddleware(MiddlewareMixin):
    """
    Middleware safety net to intercept any unhandled python exceptions
    occurring outside standard DRF route scopes and return standard JSON.
    """
    def process_exception(self, request, exception):
        # Log error trace to api.log
        api_logger.exception(
            "GlobalExceptionMiddleware caught exception on route %s: %s",
            request.path,
            str(exception)
        )
        
        return JsonResponse(
            {
                "success": False,
                "error": {
                    "message": "An internal server error occurred.",
                    "code": "InternalServerError",
                    "details": None
                }
            },
            status=500
        )


class MaintenanceModeMiddleware(MiddlewareMixin):
    """
    Middleware to intercept non-admin requests when maintenance mode is active.
    Permits public authentication and static assets, and allows logged-in admins to pass.
    """
    def process_request(self, request):
        try:
            from apps.admin.models import SystemConfig
            config = SystemConfig.get_settings()
        except Exception:
            return None

        if config.enable_maintenance_mode:
            path = request.path
            
            # Allow static files and authentication routes
            if path.startswith("/static/") or path.startswith("/media/"):
                return None
            if any(x in path for x in ["/auth/login/", "/auth/admin-login/", "/auth/logout/", "/auth/refresh/"]):
                return None
                
            # Allow access if the user is authenticated as an admin
            from common.utils import parse_http_only_cookies, decode_jwt
            from django.conf import settings
            import jwt
            
            is_admin = False
            access_token, _ = parse_http_only_cookies(request)
            if access_token:
                try:
                    payload = decode_jwt(access_token, settings.JWT_ACCESS_SECRET)
                    user_id = payload.get("user_id")
                    if user_id:
                        from apps.authentication.models import User
                        user = User.objects(id=user_id).first()
                        if user and user.role == "admin":
                            is_admin = True
                except Exception:
                    pass
                    
            if is_admin:
                return None
                
            return JsonResponse(
                {
                    "success": False,
                    "error": {
                        "message": getattr(config, "maintenance_message", None) or "System settings are undergoing administrative adjustments.",
                        "code": "MaintenanceMode",
                        "estimated_completion": getattr(config, "estimated_completion_time", None) or "TBD"
                    }
                },
                status=503
            )
        return None
