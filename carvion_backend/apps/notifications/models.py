import datetime
from mongoengine import Document, ReferenceField, StringField, BooleanField, DateTimeField
from apps.authentication.models import User

class Notification(Document):
    """
    MongoEngine Notification Document.
    Tracks system alerts, job suggestions, course advisories, and test results.
    """
    meta = {
        'collection': 'notifications',
        'indexes': [
            'user',
            '-created_at'
        ]
    }

    user = ReferenceField(User, required=True, reverse_delete_rule=2)  # CASCADE
    type = StringField(
        default='System',
        choices=['System', 'Job Alert', 'Course Suggestion', 'Mock Test Result']
    )
    title = StringField(required=True, max_length=255)
    message = StringField(required=True, max_length=1000)
    is_read = BooleanField(default=False)
    created_at = DateTimeField(default=datetime.datetime.utcnow)
