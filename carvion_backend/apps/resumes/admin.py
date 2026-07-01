from django.db import models
from django.contrib import admin
from common.mongo_admin import MongoAdminModel, MongoModelAdmin
from apps.resumes.models import Resume as MongoResume

class Resume(MongoAdminModel):
    id = models.CharField(max_length=50, primary_key=True)
    user_email = models.EmailField(max_length=255)
    name = models.CharField(max_length=255)
    file_name = models.CharField(max_length=255, null=True, blank=True)
    ats_score = models.IntegerField(default=0)
    created_at = models.DateTimeField(null=True, blank=True)

    _mongo_document = MongoResume

    class Meta:
        managed = False
        verbose_name = "Resume"
        verbose_name_plural = "Resumes"

    def __str__(self):
        return f"{self.name} (User: {self.user_email})"

    @classmethod
    def _from_mongo(cls, doc):
        return cls(
            id=str(doc.id),
            user_email=doc.user.email if doc.user else "Deleted User",
            name=doc.name,
            file_name=doc.file_name or "Builder Document",
            ats_score=doc.ats_score,
            created_at=doc.created_at,
        )


@admin.register(Resume)
class ResumeAdmin(MongoModelAdmin):
    mongo_model = MongoResume
    list_display = ("name", "user_email", "file_name", "ats_score", "created_at")
    list_filter = ("ats_score",)
    search_fields = ("name", "user_email", "file_name")
    ordering = ("-created_at",)
    readonly_fields = ("id", "created_at")
