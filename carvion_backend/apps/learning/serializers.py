from rest_framework import serializers
from apps.learning.models import Roadmap

class RoadmapSerializer(serializers.Serializer):
    """Serializer mapping MongoEngine Roadmap documents."""
    id = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()
    target_role = serializers.CharField()
    milestones = serializers.ListField(child=serializers.DictField())
    is_active = serializers.BooleanField(read_only=True)
    is_system_generated = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


    def get_id(self, obj):
        return str(obj.id)

    def get_user_id(self, obj):
        return str(obj.user.id) if obj.user else None


class RoadmapCreateSerializer(serializers.Serializer):
    """Validates parameters for generating new custom roadmaps."""
    target_role = serializers.CharField(required=True, max_length=255)
