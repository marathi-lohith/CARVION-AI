import datetime
from mongoengine import Document, ReferenceField, StringField, ListField, DateTimeField, IntField, DictField
from apps.authentication.models import User
from common.soft_delete_base import SoftDeleteDocument

class Profile(Document):
    """
    MongoEngine Profile Document.
    Tracks user-specific attributes, contact coordinates, targeted career roles, and active skill inventories.
    """
    meta = {
        'collection': 'profiles',
        'indexes': [
            'user',
        ]
    }

    user = ReferenceField(User, required=True, unique=True, reverse_delete_rule=2)  # Cascade delete if user is removed
    phone = StringField(max_length=20, null=True)
    target_role = StringField(max_length=100, null=True)
    location = StringField(max_length=100, null=True)
    skills = ListField(StringField(max_length=100), default=list)
    bio = StringField(max_length=500, null=True)
    github_url = StringField(max_length=255, null=True)
    linkedin_url = StringField(max_length=255, null=True)
    experience_level = StringField(max_length=100, null=True)
    auto_insights = DictField(default=dict)
    auto_insights_hash = StringField(max_length=100, null=True)
    created_at = DateTimeField(default=datetime.datetime.utcnow)
    updated_at = DateTimeField(default=datetime.datetime.utcnow)


class ContactMessage(SoftDeleteDocument):
    """
    Saves user support contact requests from the Help & Contact page.
    """
    meta = {
        'collection': 'contact_messages',
        'indexes': [
            '-created_at',
            'user'
        ]
    }
    user = ReferenceField(User, null=True, reverse_delete_rule=2)
    name = StringField(required=True, max_length=100)
    email = StringField(required=True, max_length=100)
    subject = StringField(required=True, max_length=200)
    message = StringField(required=True, max_length=2000)
    status = StringField(default="new", max_length=50) # new, open, waiting_for_user, in_progress, resolved, closed, archived
    priority = StringField(default="medium", max_length=50) # low, medium, high
    admin_notes = StringField(default="", max_length=2000)
    conversation = ListField(DictField(), default=list)
    created_at = DateTimeField(default=datetime.datetime.utcnow)
    updated_at = DateTimeField(default=datetime.datetime.utcnow)


class CustomSkillGapHistory(SoftDeleteDocument):
    """
    Saves historical custom manual skill gap analysis results for the user.
    """
    meta = {
        'collection': 'custom_skill_gap_history',
        'indexes': [
            'user',
            '-created_at'
        ]
    }
    user = ReferenceField(User, required=True, reverse_delete_rule=2)
    target_role = StringField(max_length=255)
    current_skills = StringField(default="")
    experience_level = StringField(max_length=100)
    preferred_industry = StringField(max_length=255, default="")
    
    results = DictField(default=dict)
    created_at = DateTimeField(default=datetime.datetime.utcnow)


class UserActivityLog(SoftDeleteDocument):
    """
    Chronologically tracks user actions and system audits across all modules.
    Reuses existing architecture and collections.
    """
    meta = {
        'collection': 'user_activity_logs',
        'indexes': [
            'user',
            '-created_at',
            'module',
            'activity_type'
        ]
    }
    user = ReferenceField(User, required=True, reverse_delete_rule=2)
    module = StringField(required=True, max_length=100)
    activity_type = StringField(required=True, max_length=100)
    description = StringField(required=True, max_length=1000)
    status = StringField(default="success", max_length=50) # success, failed, warning
    metadata = DictField(default=dict)
    created_at = DateTimeField(default=datetime.datetime.utcnow)



