from django.db import models
from django.contrib import admin
from common.mongo_admin import MongoAdminModel, MongoModelAdmin
from apps.chatbot.models import ChatSession as MongoChatSession

class ChatSession(MongoAdminModel):
    id = models.CharField(max_length=50, primary_key=True)
    user_email = models.EmailField(max_length=255)
    messages_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    _mongo_document = MongoChatSession

    class Meta:
        managed = False
        verbose_name = "Chat Session"
        verbose_name_plural = "Chat Sessions"

    def __str__(self):
        return f"Chat Session ({self.user_email})"

    @classmethod
    def _from_mongo(cls, doc):
        return cls(
            id=str(doc.id),
            user_email=doc.user.email if doc.user else "Deleted User",
            messages_count=len(doc.messages) if doc.messages else 0,
            created_at=doc.created_at,
            updated_at=doc.updated_at,
        )


@admin.register(ChatSession)
class ChatSessionAdmin(MongoModelAdmin):
    mongo_model = MongoChatSession
    list_display = ("user_email", "messages_count", "created_at", "updated_at")
    search_fields = ("user_email",)
    ordering = ("-updated_at",)
    readonly_fields = ("id", "created_at", "updated_at")
