from django.urls import path
from apps.recommendations.views import (
    recommend_jobs_view, recommend_courses_view,
    saved_jobs_view, job_applications_view, career_insights_view,
    career_insights_for_role_view, career_insights_history_view,
    career_insight_delete_view, career_insight_delete_all_view,
    platform_stats_view
)

urlpatterns = [
    path("jobs/", recommend_jobs_view, name="recommend_jobs"),
    path("courses/", recommend_courses_view, name="recommend_courses"),
    path("jobs/saved/", saved_jobs_view, name="saved_jobs"),
    path("applications/", job_applications_view, name="job_applications"),
    path("career-insights/", career_insights_view, name="career_insights"),
    path("career-insights/role/", career_insights_for_role_view, name="career_insights_role"),
    path("career-insights/history/", career_insights_history_view, name="career_insights_history"),
    path("career-insights/history/<str:insight_id>/delete/", career_insight_delete_view, name="career_insights_history_delete"),
    path("career-insights/history/delete-all/", career_insight_delete_all_view, name="career_insights_history_delete_all"),
    path("platform-stats/", platform_stats_view, name="platform_stats"),
]

