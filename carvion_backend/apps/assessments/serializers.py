from rest_framework import serializers
from apps.assessments.models import MockTest, Scorecard, InterviewSession

class MockTestSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    domain = serializers.CharField()
    difficulty = serializers.CharField()
    category = serializers.CharField()
    questions = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def get_questions(self, obj):
        # Prevent leaking answers to client-side code before they submit!
        # Strip "correct_answer" and "rationale" from questions!
        cleaned = []
        for q in obj.questions:
            cleaned.append({
                "id": q.get("id"),
                "question": q.get("question"),
                "options": q.get("options")
            })
        return cleaned


class MockTestCreateSerializer(serializers.Serializer):
    domain = serializers.CharField(required=True, max_length=100)
    difficulty = serializers.ChoiceField(choices=['Easy', 'Medium', 'Hard'], default='Medium')
    category = serializers.ChoiceField(choices=['MCQ', 'Technical', 'Coding', 'Aptitude', 'HR'], default='MCQ')


class ScoreSubmissionSerializer(serializers.Serializer):
    answers = serializers.ListField(
        child=serializers.DictField(),
        required=True
    )
    duration = serializers.IntegerField(required=False, default=0)


class ScorecardSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    mock_test_id = serializers.SerializerMethodField()
    domain = serializers.CharField()
    difficulty = serializers.CharField()
    category = serializers.CharField()
    score = serializers.IntegerField()
    total_questions = serializers.IntegerField()
    correct_answers = serializers.IntegerField()
    duration = serializers.IntegerField(required=False)
    performance_review = serializers.DictField(required=False)
    answers_submitted = serializers.ListField(child=serializers.DictField())
    created_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def get_mock_test_id(self, obj):
        return str(obj.mock_test.id) if obj.mock_test else None


class InterviewSessionSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()
    role = serializers.CharField()
    mode = serializers.CharField()
    status = serializers.CharField()
    difficulty = serializers.CharField(required=False, default="Medium")
    category = serializers.CharField(required=False, default="Technical")
    dialog = serializers.ListField(child=serializers.DictField())
    evaluation = serializers.DictField()
    created_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def get_user_id(self, obj):
        return str(obj.user.id) if obj.user else None

