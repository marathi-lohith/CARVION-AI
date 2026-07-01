from django.urls import path
from apps.recommendations.views import (
    recommend_courses_view,
    list_saved_courses_view,
    save_course_view,
    delete_saved_course_view
)

urlpatterns = [
    path("recommended/", recommend_courses_view, name="courses_recommended"),
    path("saved/", list_saved_courses_view, name="courses_saved_list"),
    path("save/", save_course_view, name="courses_save"),
    path("saved/<str:pk>/", delete_saved_course_view, name="courses_delete_saved"),
]
