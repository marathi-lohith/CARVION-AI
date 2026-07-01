from rest_framework import serializers

class ChatSessionSerializer(serializers.Serializer):
    """
    Serializer for ChatSession MongoEngine Document.
    Converts MongoDB structures into formatted JSON transcript logs.
    """
    id = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()
    title = serializers.CharField(required=False)
    messages = serializers.ListField(child=serializers.DictField())
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()

    def get_id(self, obj):
        return str(obj.id)

    def get_user_id(self, obj):
        return str(obj.user.id) if obj.user else None


class MessageSendSerializer(serializers.Serializer):
    """
    Validates user request body containing the prompt message.
    """
    text = serializers.CharField(required=True, min_length=1, max_length=5000)
    session_id = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
