from django.db import models
from django.contrib import admin
from common.mongo_admin import MongoAdminModel, MongoModelAdmin
from apps.authentication.models import User as MongoUser

class User(MongoAdminModel):
    id = models.CharField(max_length=50, primary_key=True)
    email = models.EmailField(max_length=255)
    username = models.CharField(max_length=150, null=True, blank=True)
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(null=True, blank=True)

    _mongo_document = MongoUser

    class Meta:
        managed = False
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return f"{self.name} ({self.email})"

    @classmethod
    def _from_mongo(cls, doc):
        return cls(
            id=str(doc.id),
            email=doc.email,
            username=doc.username,
            name=doc.name,
            role=doc.role,
            is_active=doc.is_active,
            created_at=doc.created_at,
        )


@admin.register(User)
class UserAdmin(MongoModelAdmin):
    mongo_model = MongoUser
    list_display = ("email", "username", "name", "role", "is_active", "created_at")
    list_filter = ("role", "is_active")
    search_fields = ("email", "username", "name")
    ordering = ("-created_at",)
    readonly_fields = ("id", "created_at")
