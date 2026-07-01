import logging
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import APIException


logger = logging.getLogger("carvion.api")

def custom_exception_handler(exc, context):
    """
    Custom exception handler to standardize all API error responses.
    Formats the response data as:
    {
        "success": False,
        "error": {
            "message": "A human-readable description",
            "code": "ErrorCodeString",
            "details": {...} or None
        }
    }
    """
    from rest_framework.views import exception_handler
    # Call DRF's default exception handler first to get the standard error response
    response = exception_handler(exc, context)

    if response is not None:
        # Extract messages and codes from the default exception
        details = response.data
        message = "A validation or request processing error occurred."
        
        if isinstance(details, dict):
            if "detail" in details:
                message = details["detail"]
            elif len(details) == 1:
                key, val = list(details.items())[0]
                if isinstance(val, list) and len(val) > 0:
                    message = f"{key}: {val[0]}"
                else:
                    message = f"{key}: {val}"
        elif isinstance(details, list) and len(details) > 0:
            message = details[0]
            
        code = getattr(exc, "default_code", exc.__class__.__name__)
        
        response.data = {
            "success": False,
            "error": {
                "message": message,
                "code": code,
                "details": details
            }
        }
    else:
        # Unhandled Django or Python exception (e.g. Database failures, TypeError, etc.)
        # Log the full traceback for system administrators
        logger.exception("An unhandled exception occurred in the request context: %s", str(exc))
        
        response = Response(
            {
                "success": False,
                "error": {
                    "message": "An unexpected internal server error occurred.",
                    "code": "InternalServerError",
                    "details": None
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response


# Standardized Custom Exception Classes
class AuthenticationFailed(APIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Incorrect credentials or expired authentication session."
    default_code = "authentication_failed"


class InvalidToken(APIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "The token provided is invalid or expired."
    default_code = "token_not_valid"


class PermissionDenied(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "You do not have the required permissions to perform this action."
    default_code = "permission_denied"


class BadRequest(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Bad request."
    default_code = "bad_request"


class NotFound(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "The requested resource was not found."
    default_code = "not_found"
