from django.db import models
from django.contrib import admin
from common.mongo_admin import MongoAdminModel, MongoModelAdmin
from apps.notifications.models import Notification as MongoNotification

class Notification(MongoAdminModel):
    id = models.CharField(max_length=50, primary_key=True)
    user_email = models.EmailField(max_length=255)
    type = models.CharField(max_length=50)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(null=True, blank=True)

    _mongo_document = MongoNotification

    class Meta:
        managed = False
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"

    def __str__(self):
        return f"{self.title} (User: {self.user_email})"

    @classmethod
    def _from_mongo(cls, doc):
        return cls(
            id=str(doc.id),
            user_email=doc.user.email if doc.user else "Deleted User",
            type=doc.type,
            title=doc.title,
            message=doc.message,
            is_read=doc.is_read,
            created_at=doc.created_at,
        )


@admin.register(Notification)
class NotificationAdmin(MongoModelAdmin):
    mongo_model = MongoNotification
    list_display = ("title", "type", "user_email", "is_read", "created_at")
    list_filter = ("type", "is_read")
    search_fields = ("title", "message", "user_email")
    ordering = ("-created_at",)
    readonly_fields = ("id", "created_at")
