from django.urls import path
from apps.authentication.views import (
    register_view, login_view, google_oauth_view,
    token_refresh_view, logout_view, me_view,
    delete_account_view, cancel_deletion_view
)

urlpatterns = [
    path("register/", register_view, name="auth_register"),
    path("login/", login_view, name="auth_login"),
    path("google/", google_oauth_view, name="auth_google"),
    path("refresh/", token_refresh_view, name="auth_refresh"),
    path("logout/", logout_view, name="auth_logout"),
    path("me/", me_view, name="auth_me"),
    path("delete-account/", delete_account_view, name="auth_delete_account"),
    path("cancel-deletion/", cancel_deletion_view, name="auth_cancel_deletion"),
]
