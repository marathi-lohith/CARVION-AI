import datetime
from mongoengine import Document, ReferenceField, ListField, DictField, DateTimeField, StringField
from apps.authentication.models import User
from common.soft_delete_base import SoftDeleteDocument

class ChatSession(SoftDeleteDocument):
    """
    MongoEngine Chat Session Document.
    Tracks persistent career guidance conversation transcripts for the user.
    """
    meta = {
        'collection': 'chat_sessions',
        'indexes': [
            '-updated_at',
            'user'
        ]
    }

    user = ReferenceField(User, required=True, reverse_delete_rule=2)  # CASCADE
    title = StringField(default="New Conversation")
    
    # Message objects format: {"sender": "user" or "bot", "text": "...", "timestamp": datetime}
    messages = ListField(DictField(), default=list)
    
    created_at = DateTimeField(default=datetime.datetime.utcnow)
    updated_at = DateTimeField(default=datetime.datetime.utcnow)

# Ensure the old unique index is dropped to allow multiple sessions per user
try:
    ChatSession._get_collection().drop_index('user_1')
except Exception:
    pass

