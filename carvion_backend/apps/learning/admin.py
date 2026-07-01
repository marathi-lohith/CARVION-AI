from django.db import models
from django.contrib import admin
from common.mongo_admin import MongoAdminModel, MongoModelAdmin
from apps.learning.models import Roadmap as MongoRoadmap

class Roadmap(MongoAdminModel):
    id = models.CharField(max_length=50, primary_key=True)
    user_email = models.EmailField(max_length=255)
    target_role = models.CharField(max_length=255)
    milestones_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(null=True, blank=True)

    _mongo_document = MongoRoadmap

    class Meta:
        managed = False
        verbose_name = "Learning Roadmap"
        verbose_name_plural = "Learning Roadmaps"

    def __str__(self):
        return f"Roadmap for {self.target_role} ({self.user_email})"

    @classmethod
    def _from_mongo(cls, doc):
        return cls(
            id=str(doc.id),
            user_email=doc.user.email if doc.user else "Deleted User",
            target_role=doc.target_role,
            milestones_count=len(doc.milestones) if doc.milestones else 0,
            created_at=doc.created_at,
        )


@admin.register(Roadmap)
class RoadmapAdmin(MongoModelAdmin):
    mongo_model = MongoRoadmap
    list_display = ("target_role", "user_email", "milestones_count", "created_at")
    search_fields = ("target_role", "user_email")
    ordering = ("-created_at",)
    readonly_fields = ("id", "created_at")
