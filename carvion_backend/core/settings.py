# Triggering dev server auto-reload
import os
from pathlib import Path
import environ
import mongoengine

# Initialize environment variables
env = environ.Env()
# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Read .env file if it exists
env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(str(env_file))
else:
    # Try reading from parent if we run from apps
    environ.Env.read_env(str(BASE_DIR.parent / ".env"))

SECRET_KEY = env("SECRET_KEY", default="django-insecure-replace-this-with-a-secure-key-in-production")
DEBUG = env.bool("DEBUG", default=True)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# Application definition
INSTALLED_APPS = [
    # Required django apps 
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    
    # Third-party apps
    "rest_framework",
    "corsheaders",
    
    # Project apps
    "apps.authentication",
    "apps.profiles",
    "apps.resumes",
    "apps.recommendations",
    "apps.learning",
    "apps.assessments",
    "apps.chatbot",
    "apps.notifications",
    "apps.admin",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "common.middlewares.SecuritySanitizationMiddleware",  # Custom middleware
    "common.middlewares.MaintenanceModeMiddleware",       # Custom middleware
    "common.middlewares.GlobalExceptionMiddleware",      # Custom middleware
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"
ASGI_APPLICATION = "core.asgi.application"

# Database Configuration
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# MongoEngine Connection
MONGODB_URI = env("MONGODB_URI", default="mongodb://localhost:27017/carvion_db")
mongoengine.connect(host=MONGODB_URI)

# Password validation (if needed, although authentication uses custom models)
AUTH_PASSWORD_VALIDATORS = []

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Default primary key field type (Not used for MongoEngine)
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CORS configuration
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["http://localhost:5173", "http://127.0.0.1:5173"])
CORS_ALLOW_CREDENTIALS = True

# Security Settings
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=False)
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

# JWT Config
JWT_ACCESS_SECRET = env("JWT_ACCESS_SECRET", default="access-secret-change-me")
JWT_REFRESH_SECRET = env("JWT_REFRESH_SECRET", default="refresh-secret-change-me")
JWT_ACCESS_LIFETIME_MINUTES = env.int("JWT_ACCESS_LIFETIME_MINUTES", default=15)
JWT_REFRESH_LIFETIME_DAYS = env.int("JWT_REFRESH_LIFETIME_DAYS", default=7)

# Centralized Logging and Telemetry Configuration
LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} - {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {asctime} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "api_file": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(LOGS_DIR / "api.log"),
            "maxBytes": 10 * 1024 * 1024,  # 10MB
            "backupCount": 5,
            "formatter": "verbose",
        },
        "security_file": {
            "level": "WARNING",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(LOGS_DIR / "security.log"),
            "maxBytes": 10 * 1024 * 1024,  # 10MB
            "backupCount": 5,
            "formatter": "verbose",
        },
        "console": {
            "level": "INFO",
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console", "api_file"],
            "level": "INFO",
            "propagate": True,
        },
        "carvion.api": {
            "handlers": ["api_file", "console"],
            "level": "INFO",
            "propagate": False,
        },
        "carvion.security": {
            "handlers": ["security_file", "console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}

# DRF configuration
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "common.permissions.MongoJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    # Disable Django's built-in AnonymousUser — this project uses MongoEngine
    # and excludes django.contrib.auth/contenttypes from INSTALLED_APPS.
    # Without this, DRF tries to import AnonymousUser on every unauthenticated
    # request (including AllowAny endpoints like /register), causing a RuntimeError.
    "UNAUTHENTICATED_USER": None,
    "EXCEPTION_HANDLER": "common.exceptions.custom_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/day",
        "user": "5000/day",
    },
}
