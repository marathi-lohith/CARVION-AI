from django.urls import path
from apps.notifications.views import (
    notification_list_view, mark_read_view,
    mark_all_read_view, notification_stream_view,
    notification_broadcast_view, delete_notification_view
)

urlpatterns = [
    path("", notification_list_view, name="notifications_list"),
    path("<str:notification_id>/read/", mark_read_view, name="mark_notification_read"),
    path("read-all/", mark_all_read_view, name="mark_all_notifications_read"),
    path("<str:notification_id>/delete/", delete_notification_view, name="delete_notification"),
    path("stream/", notification_stream_view, name="notifications_stream"),
    path("broadcast/", notification_broadcast_view, name="notifications_broadcast"),
]
