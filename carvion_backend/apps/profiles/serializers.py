from rest_framework import serializers
from apps.profiles.models import Profile, CustomSkillGapHistory
from django.core.validators import RegexValidator

phone_validator = RegexValidator(regex=r'^[0-9]{10}$', message='Phone number must contain exactly 10 digits')

class ProfileSerializer(serializers.Serializer):
    """
    Serializer mapping MongoEngine Profile Documents.
    Returns linked user credentials attributes for full client integration.
    """
    id = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    
    phone = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=20, validators=[phone_validator])
    target_role = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=100)
    location = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=100)
    skills = serializers.ListField(child=serializers.CharField(max_length=100), default=list)
    bio = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=500)
    github_url = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=255)
    linkedin_url = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=255)
    experience_level = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=100)
    
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def get_user_id(self, obj):
        return str(obj.user.id) if obj.user else None

    def get_name(self, obj):
        return obj.user.name if obj.user else ""

    def get_email(self, obj):
        return obj.user.email if obj.user else ""

    def get_role(self, obj):
        return obj.user.role if obj.user else "standard"

    def validate_bio(self, value):
        if value:
            trimmed_value = value.strip()
            if len(trimmed_value) < 20:
                raise serializers.ValidationError("Professional Summary must be at least 20 characters")
            return trimmed_value
        return value


class CustomSkillGapHistorySerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()
    target_role = serializers.CharField(max_length=255)
    current_skills = serializers.CharField()
    experience_level = serializers.CharField(max_length=100)
    preferred_industry = serializers.CharField(required=False, allow_blank=True, default='')
    results = serializers.DictField()
    created_at = serializers.DateTimeField()

    def get_id(self, obj):
        return str(obj.id)
    def get_user_id(self, obj):
        return str(obj.user.id) if obj.user else None

