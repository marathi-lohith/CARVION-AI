from django.urls import path, include
from django.contrib import admin

urlpatterns = [
    # Standard Django Administration Interface
    path("admin/", admin.site.urls),

    # API App Routes
    path("api/auth/", include("apps.authentication.urls")),
    path("api/profile/", include("apps.profiles.urls")),
    path("api/resumes/", include("apps.resumes.urls")),
    path("api/recommendations/", include("apps.recommendations.urls")),
    path("api/courses/", include("apps.recommendations.courses_urls")),
    path("api/learning/", include("apps.learning.urls")),
    path("api/assessments/", include("apps.assessments.urls")),
    path("api/chat/", include("apps.chatbot.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/admin/", include("apps.admin.urls")),
]
