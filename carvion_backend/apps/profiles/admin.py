from django.db import models
from django.contrib import admin
from common.mongo_admin import MongoAdminModel, MongoModelAdmin
from apps.profiles.models import Profile as MongoProfile, ContactMessage as MongoContactMessage, UserActivityLog as MongoUserActivityLog

class Profile(MongoAdminModel):
    id = models.CharField(max_length=50, primary_key=True)
    user_email = models.EmailField(max_length=255)
    phone = models.CharField(max_length=50, null=True, blank=True)
    target_role = models.CharField(max_length=100, null=True, blank=True)
    bio = models.TextField(null=True, blank=True)
    github_url = models.CharField(max_length=255, null=True, blank=True)
    linkedin_url = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(null=True, blank=True)

    _mongo_document = MongoProfile

    class Meta:
        managed = False
        verbose_name = "Profile"
        verbose_name_plural = "Profiles"

    def __str__(self):
        return f"Profile of {self.user_email}"

    @classmethod
    def _from_mongo(cls, doc):
        return cls(
            id=str(doc.id),
            user_email=doc.user.email if doc.user else "Deleted User",
            phone=doc.phone,
            target_role=doc.target_role,
            bio=doc.bio,
            github_url=doc.github_url,
            linkedin_url=doc.linkedin_url,
            created_at=doc.created_at,
        )


class ContactMessage(MongoAdminModel):
    id = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=100)
    email = models.EmailField(max_length=100)
    subject = models.CharField(max_length=200)
    message = models.TextField()
    created_at = models.DateTimeField(null=True, blank=True)

    _mongo_document = MongoContactMessage

    class Meta:
        managed = False
        verbose_name = "Contact Message"
        verbose_name_plural = "Contact Messages"

    def __str__(self):
        return f"Message from {self.name} - {self.subject}"

    @classmethod
    def _from_mongo(cls, doc):
        return cls(
            id=str(doc.id),
            name=doc.name,
            email=doc.email,
            subject=doc.subject,
            message=doc.message,
            created_at=doc.created_at,
        )


class UserActivityLog(MongoAdminModel):
    id = models.CharField(max_length=50, primary_key=True)
    user_email = models.EmailField(max_length=255)
    module = models.CharField(max_length=100)
    activity_type = models.CharField(max_length=100)
    description = models.TextField()
    status = models.CharField(max_length=50)
    created_at = models.DateTimeField(null=True, blank=True)

    _mongo_document = MongoUserActivityLog

    class Meta:
        managed = False
        verbose_name = "User Activity Log"
        verbose_name_plural = "User Activity Logs"

    def __str__(self):
        return f"{self.user_email} - {self.module} - {self.activity_type}"

    @classmethod
    def _from_mongo(cls, doc):
        return cls(
            id=str(doc.id),
            user_email=doc.user.email if doc.user else "Deleted User",
            module=doc.module,
            activity_type=doc.activity_type,
            description=doc.description,
            status=doc.status,
            created_at=doc.created_at,
        )


@admin.register(Profile)
class ProfileAdmin(MongoModelAdmin):
    mongo_model = MongoProfile
    list_display = ("user_email", "target_role", "phone", "created_at")
    search_fields = ("user_email", "target_role")
    ordering = ("-created_at",)
    readonly_fields = ("id", "created_at")


@admin.register(ContactMessage)
class ContactMessageAdmin(MongoModelAdmin):
    mongo_model = MongoContactMessage
    list_display = ("name", "email", "subject", "created_at")
    search_fields = ("name", "email", "subject", "message")
    ordering = ("-created_at",)
    readonly_fields = ("id", "created_at")


@admin.register(UserActivityLog)
class UserActivityLogAdmin(MongoModelAdmin):
    mongo_model = MongoUserActivityLog
    list_display = ("user_email", "module", "activity_type", "status", "created_at")
    search_fields = ("user_email", "module", "activity_type", "description")
    list_filter = ("module", "activity_type", "status")
    ordering = ("-created_at",)
    readonly_fields = ("id", "created_at")

