import datetime
from mongoengine import Document, BooleanField, DateTimeField, ReferenceField
from apps.authentication.models import User

class SoftDeleteDocument(Document):
    """Abstract base class providing soft delete fields.

    Models inheriting from this class gain the following fields:
        - is_deleted: boolean flag indicating logical deletion
        - deleted_at: timestamp of when the document was soft‑deleted
        - deleted_by: reference to the User who performed the deletion
    The class does not override ``delete``; soft deletion is performed via
    the ``soft_delete`` helper in ``soft_delete_service.py``.
    """

    meta = {'abstract': True}

    is_deleted = BooleanField(default=False)
    deleted_at = DateTimeField(null=True)
    deleted_by = ReferenceField(User, null=True)
