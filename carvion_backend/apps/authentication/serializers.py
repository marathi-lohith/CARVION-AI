from rest_framework import serializers
from apps.authentication.models import User


class UserSerializer(serializers.Serializer):
    """
    Serializer for MongoEngine User document representation.
    Handles converting MongoDB ObjectId to string format.
    """
    id = serializers.SerializerMethodField()
    email = serializers.EmailField()
    username = serializers.CharField(required=False, allow_null=True)
    name = serializers.CharField()
    role = serializers.CharField()
    onboarding_completed = serializers.SerializerMethodField()
    is_pending_deletion = serializers.BooleanField(default=False)
    scheduled_deletion_date = serializers.DateTimeField(allow_null=True, required=False)
    deletion_requested_at = serializers.DateTimeField(allow_null=True, required=False)
    created_at = serializers.DateTimeField()

    def get_id(self, obj):
        return str(obj.id)

    def get_onboarding_completed(self, obj):
        if obj.role == 'admin':
            return True
        from apps.profiles.services import get_profile_for_user
        profile = get_profile_for_user(obj)
        return bool(obj.name and obj.name.strip() and profile.target_role and profile.target_role.strip())


class LoginSerializer(serializers.Serializer):
    """Validates basic login payloads."""
    username_or_email = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    portal = serializers.CharField(required=False, default="user")


class RegisterSerializer(serializers.Serializer):
    """Validates registration details."""
    name = serializers.CharField(required=True, min_length=2)
    username = serializers.CharField(required=True, min_length=3, max_length=150)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, min_length=8, write_only=True)

    def validate_username(self, value):
        import re
        normalized_username = value.strip().lower()
        if not re.match(r'^[a-zA-Z0-9_]+$', normalized_username):
            raise serializers.ValidationError("Username can only contain letters, numbers, and underscores.")
        if User.objects(username=normalized_username).first():
            raise serializers.ValidationError("An account with this username already exists.")
        return normalized_username

    def validate_email(self, value):
        normalized_email = value.lower().strip()
        if User.objects(email=normalized_email).first():
            raise serializers.ValidationError("An account with this email address already exists.")
        return normalized_email


class GoogleOAuthSerializer(serializers.Serializer):
    """Validates Google Client OAuth credential tokens."""
    token = serializers.CharField(required=True)
    portal = serializers.CharField(required=False, default="user")
