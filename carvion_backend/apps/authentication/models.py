import datetime
from mongoengine import Document, StringField, BooleanField, DateTimeField, ReferenceField, ObjectIdField
from common.utils import make_password, check_password

class User(Document):
    """
    MongoEngine User Document.
    Bypasses traditional Django ORM to integrate with MongoDB.
    """
    meta = {
        'collection': 'users',
        'indexes': [
            'email',
        ]
    }
    
    email = StringField(required=True, unique=True, max_length=255)
    username = StringField(unique=True, null=True, sparse=True, max_length=150)
    password_hash = StringField(max_length=255, null=True)  # Can be null for Google OAuth accounts
    name = StringField(required=True, max_length=255)
    role = StringField(default='standard', choices=['standard', 'admin'])
    is_active = BooleanField(default=True)
    is_pending_deletion = BooleanField(default=False)
    scheduled_deletion_date = DateTimeField(null=True)
    deletion_requested_at = DateTimeField(null=True)
    created_at = DateTimeField(default=datetime.datetime.utcnow)
    updated_at = DateTimeField(default=datetime.datetime.utcnow)

    def set_password(self, password):
        """Securely hash and set the password."""
        self.password_hash = make_password(password)

    def check_password(self, password):
        """Verify the password against the stored hash."""
        if not self.password_hash:
            return False
        return check_password(password, self.password_hash)

    @property
    def is_authenticated(self):
        """Return True for active session checks."""
        return True


class RefreshToken(Document):
    """
    MongoEngine document for tracking active JWT Refresh Tokens.
    Supports secure token revocation on logout.
    """
    meta = {
        'collection': 'refresh_tokens',
        'indexes': [
            'token',
            {'fields': ['expires_at'], 'expireAfterSeconds': 0}  # MongoDB TTL Index
        ]
    }

    user = ReferenceField(User, required=True)
    token = StringField(required=True, unique=True)
    expires_at = DateTimeField(required=True)
    created_at = DateTimeField(default=datetime.datetime.utcnow)
