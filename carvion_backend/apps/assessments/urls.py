from django.urls import path
from apps.assessments.views import (
    scorecard_history_view, mock_test_create_view,
    mock_test_submit_view, scorecard_detail_view,
    scorecard_delete_view, list_interviews_view,
    start_interview_view, respond_interview_view,
    delete_interview_view, delete_all_interviews_view
)

urlpatterns = [
    path("", scorecard_history_view, name="scorecard_history"),
    path("create/", mock_test_create_view, name="create_test"),
    path("<str:test_id>/submit/", mock_test_submit_view, name="submit_test"),
    path("scorecard/<str:scorecard_id>/", scorecard_detail_view, name="scorecard_detail"),
    path("scorecard/<str:scorecard_id>/delete/", scorecard_delete_view, name="scorecard_delete"),
    path("interview/", list_interviews_view, name="list_interviews"),
    path("interview/start/", start_interview_view, name="start_interview"),
    path("interview/<str:session_id>/respond/", respond_interview_view, name="respond_interview"),
    path("interview/<str:session_id>/delete/", delete_interview_view, name="delete_interview"),
    path("interview/delete-all/", delete_all_interviews_view, name="delete_all_interviews"),
]
