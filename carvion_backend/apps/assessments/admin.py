from django.db import models
from django.contrib import admin
from common.mongo_admin import MongoAdminModel, MongoModelAdmin
from apps.assessments.models import MockTest as MongoMockTest, Scorecard as MongoScorecard

class MockTest(MongoAdminModel):
    id = models.CharField(max_length=50, primary_key=True)
    user_email = models.EmailField(max_length=255)
    domain = models.CharField(max_length=100)
    difficulty = models.CharField(max_length=50)
    category = models.CharField(max_length=50)
    created_at = models.DateTimeField(null=True, blank=True)

    _mongo_document = MongoMockTest

    class Meta:
        managed = False
        verbose_name = "Mock Test"
        verbose_name_plural = "Mock Tests"

    def __str__(self):
        return f"{self.domain} Mock Test ({self.user_email})"

    @classmethod
    def _from_mongo(cls, doc):
        return cls(
            id=str(doc.id),
            user_email=doc.user.email if doc.user else "Deleted User",
            domain=doc.domain,
            difficulty=doc.difficulty,
            category=doc.category,
            created_at=doc.created_at,
        )


class Scorecard(MongoAdminModel):
    id = models.CharField(max_length=50, primary_key=True)
    user_email = models.EmailField(max_length=255)
    domain = models.CharField(max_length=100)
    difficulty = models.CharField(max_length=50)
    category = models.CharField(max_length=50)
    score = models.IntegerField(default=0)
    total_questions = models.IntegerField(default=0)
    correct_answers = models.IntegerField(default=0)
    created_at = models.DateTimeField(null=True, blank=True)

    _mongo_document = MongoScorecard

    class Meta:
        managed = False
        verbose_name = "Mock Test Result"
        verbose_name_plural = "Mock Test Results"

    def __str__(self):
        return f"Scorecard: {self.score}% (Domain: {self.domain})"

    @classmethod
    def _from_mongo(cls, doc):
        return cls(
            id=str(doc.id),
            user_email=doc.user.email if doc.user else "Deleted User",
            domain=doc.domain,
            difficulty=doc.difficulty,
            category=doc.category,
            score=doc.score,
            total_questions=doc.total_questions,
            correct_answers=doc.correct_answers,
            created_at=doc.created_at,
        )


@admin.register(MockTest)
class MockTestAdmin(MongoModelAdmin):
    mongo_model = MongoMockTest
    list_display = ("domain", "category", "difficulty", "user_email", "created_at")
    list_filter = ("category", "difficulty")
    search_fields = ("domain", "user_email")
    ordering = ("-created_at",)
    readonly_fields = ("id", "created_at")


@admin.register(Scorecard)
class ScorecardAdmin(MongoModelAdmin):
    mongo_model = MongoScorecard
    list_display = ("domain", "category", "score", "user_email", "created_at")
    list_filter = ("category", "difficulty")
    search_fields = ("domain", "user_email")
    ordering = ("-created_at",)
    readonly_fields = ("id", "created_at")
