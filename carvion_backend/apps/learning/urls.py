from django.urls import path
from apps.learning.views import (
    active_roadmap_view, generate_roadmap_view, regenerate_roadmap_view, toggle_node_completion_view,
    learning_progress_view, roadmap_list_view, select_active_roadmap_view,
    delete_roadmap_view, track_learning_activity_view, learning_analytics_view,
    track_learning_pulse_view, track_video_watch_view,
    track_learning_session_start_view, track_learning_session_update_view,
    roadmap_analytics_view, track_roadmap_video_progress_view
)

urlpatterns = [
    path("", active_roadmap_view, name="active_roadmap"),
    path("generate/", generate_roadmap_view, name="generate_roadmap"),
    path("regenerate/", regenerate_roadmap_view, name="regenerate_roadmap"),
    path("node/<str:node_id>/toggle/", toggle_node_completion_view, name="toggle_node"),
    path("progress/", learning_progress_view, name="learning_progress"),
    path("all/", roadmap_list_view, name="roadmap_list"),
    path("<str:roadmap_id>/select/", select_active_roadmap_view, name="select_active_roadmap"),
    path("<str:roadmap_id>/delete/", delete_roadmap_view, name="delete_roadmap"),
    path("activity/track/", track_learning_activity_view, name="track_learning_activity"),
    path("analytics/", learning_analytics_view, name="learning_analytics"),
    path("session/pulse/", track_learning_pulse_view, name="track_learning_pulse"),
    path("video/watch/", track_video_watch_view, name="track_video_watch"),
    path("session/start/", track_learning_session_start_view, name="track_learning_session_start"),
    path("session/update/", track_learning_session_update_view, name="track_learning_session_update"),
    path("roadmap/analytics/", roadmap_analytics_view, name="roadmap_analytics"),
    path("roadmap/video/progress/", track_roadmap_video_progress_view, name="track_roadmap_video_progress"),
]
