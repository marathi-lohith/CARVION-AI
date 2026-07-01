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
