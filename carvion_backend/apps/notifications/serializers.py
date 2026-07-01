from rest_framework import serializers
from apps.notifications.models import Notification

class NotificationSerializer(serializers.Serializer):
    """Serializes core Notification fields."""
    id = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()
    type = serializers.CharField()
    title = serializers.CharField()
    message = serializers.CharField()
    is_read = serializers.BooleanField()
    created_at = serializers.DateTimeField()

    def get_id(self, obj):
        return str(obj.id)

    def get_user_id(self, obj):
        return str(obj.user.id) if obj.user else None
