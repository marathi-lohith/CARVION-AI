import datetime
from mongoengine import Document, BooleanField, DateTimeField, StringField, ReferenceField
from apps.authentication.models import User

class SystemConfig(Document):
    """
    MongoEngine Document holding centralized system configuration variables.
    Ensures admins can tune platform settings dynamically.
    """
    meta = {
        'collection': 'system_config',
        'strict': False
    }

    # User Registration
    enable_public_registration = BooleanField(default=True)
    enable_google_login = BooleanField(default=True)

    # Maintenance Mode
    enable_maintenance_mode = BooleanField(default=False)

    created_at = DateTimeField(default=datetime.datetime.utcnow)
    updated_at = DateTimeField(default=datetime.datetime.utcnow)

    @classmethod
    def get_settings(cls):
        cfg = cls.objects.first()
        if not cfg:
            cfg = cls()
            cfg.save()
        return cfg


class AdminActivityLog(Document):
    """
    MongoEngine Document for tracking administrator audit logs.
    Only records actions performed by admins in the Admin Panel.
    """
    meta = {
        'collection': 'admin_activity_logs',
        'strict': False,
        'indexes': [
            'admin_user',
            '-created_at',
            'module',
            'action',
            'severity'
        ]
    }
    admin_user = ReferenceField(User, required=True, reverse_delete_rule=2)
    action = StringField(required=True, max_length=255)
    module = StringField(required=True, max_length=100)
    target_record = StringField(default="", max_length=255)
    description = StringField(default="", max_length=1000)
    status = StringField(default="success", max_length=50) # success, failed
    severity = StringField(default="INFO", choices=["INFO", "WARNING", "CRITICAL"])
    ip_address = StringField(default="")
    user_agent = StringField(default="")
    request_id = StringField(default="")
    created_at = DateTimeField(default=datetime.datetime.utcnow)
