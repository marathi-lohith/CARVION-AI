from rest_framework import serializers
from apps.resumes.models import Resume, ResumeOptimization, CoverLetter

class ResumeSerializer(serializers.Serializer):
    """
    Serializer mapping MongoEngine Resume documents.
    Handles converting MongoDB ObjectIds and presenting analysis audits.
    """
    id = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()
    name = serializers.CharField(max_length=255)
    file_name = serializers.CharField(max_length=255, required=False, allow_null=True)
    extracted_text = serializers.CharField(required=False, allow_blank=True)
    structured_data = serializers.DictField(required=False, default=dict)
    ats_score = serializers.IntegerField(read_only=True)
    analysis_report = serializers.DictField(read_only=True)
    downloads_count = serializers.IntegerField(read_only=True)
    is_primary = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def get_user_id(self, obj):
        return str(obj.user.id) if obj.user else None


class ResumeBuildSerializer(serializers.Serializer):
    """
    Validates input parameters gathered from the React Hook Form builder.
    """
    name = serializers.CharField(required=True, max_length=255)
    template = serializers.CharField(required=False, default='professional')
    structured_data = serializers.DictField(required=True)


class ResumeOptimizationSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()
    resume_id = serializers.SerializerMethodField()
    target_role = serializers.CharField(max_length=255)
    optimized_text = serializers.CharField()
    
    ats_improvements = serializers.ListField(child=serializers.CharField())
    formatting_suggestions = serializers.ListField(child=serializers.CharField())
    grammar_improvements = serializers.ListField(child=serializers.CharField())
    skill_recommendations = serializers.ListField(child=serializers.CharField())
    missing_keywords = serializers.ListField(child=serializers.CharField())
    action_verb_suggestions = serializers.ListField(child=serializers.CharField())
    industry_recommendations = serializers.ListField(child=serializers.CharField())
    is_fallback = serializers.BooleanField(required=False, default=False)
    
    created_at = serializers.DateTimeField()

    def get_id(self, obj):
        return str(obj.id)
    def get_user_id(self, obj):
        return str(obj.user.id) if obj.user else None
    def get_resume_id(self, obj):
        return str(obj.resume.id) if obj.resume else None


class CoverLetterSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()
    resume_id = serializers.SerializerMethodField()
    target_role = serializers.CharField(max_length=255)
    company_name = serializers.CharField(max_length=255)
    job_description = serializers.CharField(required=False, allow_blank=True, default='')
    cover_letter_text = serializers.CharField()
    is_fallback = serializers.BooleanField(required=False, default=False)
    created_at = serializers.DateTimeField()

    def get_id(self, obj):
        return str(obj.id)
    def get_user_id(self, obj):
        return str(obj.user.id) if obj.user else None
    def get_resume_id(self, obj):
        return str(obj.resume.id) if obj.resume else None

