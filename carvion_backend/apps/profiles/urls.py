from django.urls import path
from apps.profiles.views import (
    profile_detail_view, dashboard_overview_view,
    skill_gap_analyzer_view, custom_skill_gap_analyzer_view,
    custom_skill_gap_history_list_view, custom_skill_gap_history_delete_view,
    custom_skill_gap_history_delete_all_view,
    profile_analytics_view, contact_message_view,
    user_activity_history_view, log_activity_view,
    user_tickets_list_view, user_ticket_detail_view, user_ticket_reply_view
)

urlpatterns = [
    path("dashboard/", dashboard_overview_view, name="dashboard_overview"),
    path("skill-gap/", skill_gap_analyzer_view, name="skill_gap"),
    path("skill-gap/custom/", custom_skill_gap_analyzer_view, name="custom_skill_gap"),
    path("skill-gap/custom/history/", custom_skill_gap_history_list_view, name="custom_skill_gap_history"),
    path("skill-gap/custom/history/<str:history_id>/delete/", custom_skill_gap_history_delete_view, name="custom_skill_gap_history_delete"),
    path("skill-gap/custom/history/delete-all/", custom_skill_gap_history_delete_all_view, name="custom_skill_gap_history_delete_all"),
    path("analytics/", profile_analytics_view, name="profile_analytics"),
    path("contact/", contact_message_view, name="contact_message"),
    path("tickets/", user_tickets_list_view, name="user_tickets_list"),
    path("tickets/<str:ticket_id>/", user_ticket_detail_view, name="user_ticket_detail"),
    path("tickets/<str:ticket_id>/reply/", user_ticket_reply_view, name="user_ticket_reply"),
    path("activity/logs/", user_activity_history_view, name="user_activity_history"),
    path("activity/log/", log_activity_view, name="log_user_activity"),
    path("", profile_detail_view, name="profile_detail"),
]

