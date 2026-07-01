from django.urls import path
from apps.resumes.views import (
    resume_list_view, resume_upload_view, resume_build_view,
    resume_detail_view, resume_render_pdf_view,
    resume_optimize_view, resume_optimize_history_view,
    resume_optimize_delete_view, resume_optimize_delete_all_view,
    cover_letter_generator_view, cover_letter_history_view,
    cover_letter_delete_view, cover_letter_delete_all_view,
    resume_set_primary_view
)

urlpatterns = [
    path("", resume_list_view, name="resume_list"),
    path("upload/", resume_upload_view, name="resume_upload"),
    path("build/", resume_build_view, name="resume_build"),
    path("optimize/", resume_optimize_view, name="resume_optimize"),
    path("optimize/history/", resume_optimize_history_view, name="resume_optimize_history"),
    path("optimize/history/<str:opt_id>/delete/", resume_optimize_delete_view, name="resume_optimize_history_delete"),
    path("optimize/history/delete-all/", resume_optimize_delete_all_view, name="resume_optimize_history_delete_all"),
    path("cover-letter/", cover_letter_generator_view, name="cover_letter_generate"),
    path("cover-letter/history/", cover_letter_history_view, name="cover_letter_history"),
    path("cover-letter/history/<str:cl_id>/delete/", cover_letter_delete_view, name="cover_letter_history_delete"),
    path("cover-letter/history/delete-all/", cover_letter_delete_all_view, name="cover_letter_history_delete_all"),
    path("<str:resume_id>/", resume_detail_view, name="resume_detail"),
    path("<str:resume_id>/render-pdf/", resume_render_pdf_view, name="resume_render_pdf"),
    path("<str:resume_id>/set-primary/", resume_set_primary_view, name="resume_set_primary"),
]
