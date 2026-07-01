from django.db import models
from django.contrib import admin
from common.mongo_admin import MongoAdminModel, MongoModelAdmin
from apps.recommendations.models import (
    JobCache as MongoJobCache,
    CourseCache as MongoCourseCache,
    SavedJob as MongoSavedJob,
    JobApplication as MongoJobApplication
)

class JobCache(MongoAdminModel):
    id = models.CharField(max_length=50, primary_key=True)
    query = models.CharField(max_length=255)
    created_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    _mongo_document = MongoJobCache

    class Meta:
        managed = False
        verbose_name = "Job Cache (Jobs)"
        verbose_name_plural = "Job Caches (Jobs)"

    def __str__(self):
        return self.query

    @classmethod
    def _from_mongo(cls, doc):
        return cls(
            id=str(doc.id),
            query=doc.query,
            created_at=doc.created_at,
            expires_at=doc.expires_at,
        )


class CourseCache(MongoAdminModel):
    id = models.CharField(max_length=50, primary_key=True)
    query = models.CharField(max_length=255)
    created_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    _mongo_document = MongoCourseCache

    class Meta:
        managed = False
        verbose_name = "Course Cache (Courses)"
        verbose_name_plural = "Course Caches (Courses)"

    def __str__(self):
        return self.query

    @classmethod
    def _from_mongo(cls, doc):
        return cls(
            id=str(doc.id),
            query=doc.query,
            created_at=doc.created_at,
            expires_at=doc.expires_at,
        )


class SavedJob(MongoAdminModel):
    id = models.CharField(max_length=50, primary_key=True)
    user_email = models.EmailField(max_length=255)
    job_id = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    company = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    created_at = models.DateTimeField(null=True, blank=True)

    _mongo_document = MongoSavedJob

    class Meta:
        managed = False
        verbose_name = "Saved Job"
        verbose_name_plural = "Saved Jobs"

    def __str__(self):
        return f"{self.title} @ {self.company}"

    @classmethod
    def _from_mongo(cls, doc):
        return cls(
            id=str(doc.id),
            user_email=doc.user.email if doc.user else "Deleted User",
            job_id=doc.job_id,
            title=doc.title,
            company=doc.company,
            location=doc.location,
            created_at=doc.created_at,
        )


class JobApplication(MongoAdminModel):
    id = models.CharField(max_length=50, primary_key=True)
    user_email = models.EmailField(max_length=255)
    job_id = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    company = models.CharField(max_length=255)
    status = models.CharField(max_length=50)
    applied_at = models.DateTimeField(null=True, blank=True)

    _mongo_document = MongoJobApplication

    class Meta:
        managed = False
        verbose_name = "Job Application"
        verbose_name_plural = "Job Applications"

    def __str__(self):
        return f"{self.title} - {self.status}"

    @classmethod
    def _from_mongo(cls, doc):
        return cls(
            id=str(doc.id),
            user_email=doc.user.email if doc.user else "Deleted User",
            job_id=doc.job_id,
            title=doc.title,
            company=doc.company,
            status=doc.status,
            applied_at=doc.applied_at,
        )


@admin.register(JobCache)
class JobCacheAdmin(MongoModelAdmin):
    mongo_model = MongoJobCache
    list_display = ("query", "created_at", "expires_at")
    search_fields = ("query",)
    ordering = ("-created_at",)
    readonly_fields = ("id", "created_at")


@admin.register(CourseCache)
class CourseCacheAdmin(MongoModelAdmin):
    mongo_model = MongoCourseCache
    list_display = ("query", "created_at", "expires_at")
    search_fields = ("query",)
    ordering = ("-created_at",)
    readonly_fields = ("id", "created_at")


@admin.register(SavedJob)
class SavedJobAdmin(MongoModelAdmin):
    mongo_model = MongoSavedJob
    list_display = ("title", "company", "user_email", "location", "created_at")
    search_fields = ("title", "company", "user_email")
    ordering = ("-created_at",)
    readonly_fields = ("id", "created_at")


@admin.register(JobApplication)
class JobApplicationAdmin(MongoModelAdmin):
    mongo_model = MongoJobApplication
    list_display = ("title", "company", "user_email", "status", "applied_at")
    list_filter = ("status",)
    search_fields = ("title", "company", "user_email")
    ordering = ("-applied_at",)
    readonly_fields = ("id", "applied_at")
