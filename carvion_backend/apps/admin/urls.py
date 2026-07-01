from django.urls import path
from apps.admin.views import (
    telemetry_view, clear_cache_view, user_list_view,
    user_detail_view, admin_records_list_view,
    user_activity_feed_view, admin_activity_feed_view
)

urlpatterns = [
    path("telemetry/", telemetry_view, name="admin_telemetry"),
    path("cache/clear/", clear_cache_view, name="admin_clear_cache"),
    path("users/", user_list_view, name="admin_user_list"),
    path("users/<str:user_id>/", user_detail_view, name="admin_user_detail"),
    path("records/<str:module>/", admin_records_list_view, name="admin_records_list"),
    path("user-activity/", user_activity_feed_view, name="admin_user_activity"),
    path("admin-activity/", admin_activity_feed_view, name="admin_admin_activity"),
]

