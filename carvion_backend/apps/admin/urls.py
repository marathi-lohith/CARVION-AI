from django.urls import path
from apps.admin.views import (
    telemetry_view, clear_cache_view, user_list_view,
    user_detail_view, admin_records_list_view,
    user_activity_feed_view, admin_activity_feed_view,
    admin_restore_record_view, admin_hard_delete_record_view,
    admin_record_detail_view, admin_soft_delete_record_view,
    admin_bulk_notifications_view, admin_config_view,
    admin_dashboard_stats_view
)

urlpatterns = [
    path("telemetry/", telemetry_view, name="admin_telemetry"),
    path("cache/clear/", clear_cache_view, name="admin_clear_cache"),
    path("users/", user_list_view, name="admin_user_list"),
    path("users/<str:user_id>/", user_detail_view, name="admin_user_detail"),
    path("config/", admin_config_view, name="admin_config"),
    path("notifications/bulk/", admin_bulk_notifications_view, name="admin_bulk_notifications"),
    path("records/<str:module>/", admin_records_list_view, name="admin_records_list"),
    path("records/<str:module>/<str:record_id>/", admin_record_detail_view, name="admin_record_detail"),
    path("records/<str:module>/<str:record_id>/restore/", admin_restore_record_view, name="admin_restore_record"),
    path("records/<str:module>/<str:record_id>/soft-delete/", admin_soft_delete_record_view, name="admin_soft_delete_record"),
    path("records/<str:module>/<str:record_id>/hard-delete/", admin_hard_delete_record_view, name="admin_hard_delete_record"),
    path("user-activity/", user_activity_feed_view, name="admin_user_activity"),
    path("admin-activity/", admin_activity_feed_view, name="admin_admin_activity"),
    path("dashboard-stats/", admin_dashboard_stats_view, name="admin_dashboard_stats"),
]

