from rest_framework import serializers

class AdminTelemetrySerializer(serializers.Serializer):
    """Formats overall platform health metadata."""
    total_accounts = serializers.IntegerField()
    total_parsed_records = serializers.IntegerField()
    total_roadmaps = serializers.IntegerField()
    total_mock_tests = serializers.IntegerField()
    gemini_cost_usd = serializers.FloatField()
    active_job_caches = serializers.IntegerField()
    active_course_caches = serializers.IntegerField()
    uptime_status = serializers.CharField()


class AdminUserStatusSerializer(serializers.Serializer):
    """Validates user account status mutations."""
    is_active = serializers.BooleanField(required=False)
    role = serializers.ChoiceField(choices=['standard', 'admin'], required=False)
    name = serializers.CharField(required=False, max_length=255)
    email = serializers.EmailField(required=False, max_length=255)


class AdminUserSerializer(serializers.Serializer):
    """Formats user account metadata for admin consoles."""
    id = serializers.SerializerMethodField()
    email = serializers.EmailField()
    name = serializers.CharField()
    role = serializers.CharField()
    is_active = serializers.BooleanField()
    created_at = serializers.DateTimeField()

    def get_id(self, obj):
        return str(obj.id)

