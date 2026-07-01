from rest_framework import serializers

class JobSearchSerializer(serializers.Serializer):
    """Validates search queries dispatched to the job search recommendation systems."""
    query = serializers.CharField(required=False, default='', allow_blank=True, max_length=200)
    location = serializers.CharField(required=False, default='Remote', max_length=100)
    page = serializers.IntegerField(required=False, default=1)


class CourseSearchSerializer(serializers.Serializer):
    """Validates parameters sent to course query engine."""
    # allow_blank=True is critical: frontend sends empty string for auto-recommendations
    query = serializers.CharField(required=False, default='', allow_blank=True, allow_null=True, max_length=200)



class SavedJobSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    job_id = serializers.CharField(required=True)
    title = serializers.CharField(required=True)
    company = serializers.CharField(required=True)
    location = serializers.CharField(required=False, default='Remote')
    description = serializers.CharField(required=False, default='', allow_blank=True)
    url = serializers.CharField(required=False, default='', allow_blank=True)
    created_at = serializers.DateTimeField(read_only=True)


class JobApplicationSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    job_id = serializers.CharField(required=True)
    title = serializers.CharField(required=True)
    company = serializers.CharField(required=True)
    location = serializers.CharField(required=False, default='Remote')
    status = serializers.ChoiceField(choices=['Applied', 'Interviewing', 'Offered', 'Rejected'], default='Applied')
    notes = serializers.CharField(required=False, default='', allow_blank=True)
    applied_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class CareerInsightHistorySerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()
    searched_role = serializers.CharField(max_length=255)
    generated_insight = serializers.DictField()
    created_at = serializers.DateTimeField()

    def get_id(self, obj):
        return str(obj.id)

    def get_user_id(self, obj):
        return str(obj.user.id) if obj.user else None


class SavedCourseSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    course_id = serializers.CharField(required=True)
    title = serializers.CharField(required=True)
    provider = serializers.CharField(required=False, default='', allow_blank=True)
    description = serializers.CharField(required=False, default='', allow_blank=True)
    thumbnail = serializers.CharField(required=False, default='', allow_blank=True)
    url = serializers.CharField(required=False, default='', allow_blank=True)
    created_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)


