import datetime
from mongoengine import Q
from .soft_delete_base import SoftDeleteDocument
from apps.authentication.models import User

def soft_delete(doc: SoftDeleteDocument, deleted_by: User = None):
    """Mark a document as soft‑deleted.

    Args:
        doc: An instance of a model that inherits from ``SoftDeleteDocument``.
        deleted_by: Optional ``User`` who performed the deletion.
    """
    if not isinstance(doc, SoftDeleteDocument):
        raise TypeError("soft_delete expects a SoftDeleteDocument instance")
    doc.is_deleted = True
    doc.deleted_at = datetime.datetime.utcnow()
    if deleted_by:
        doc.deleted_by = deleted_by
    doc.save()

def restore(doc: SoftDeleteDocument):
    """Restore a previously soft‑deleted document."""
    if not isinstance(doc, SoftDeleteDocument):
        raise TypeError("restore expects a SoftDeleteDocument instance")
    doc.is_deleted = False
    doc.deleted_at = None
    doc.deleted_by = None
    doc.save()

def hard_delete(doc: SoftDeleteDocument):
    """Permanently delete a document from the database.

    This bypasses the soft‑delete mechanism and removes the record.
    """
    if not isinstance(doc, SoftDeleteDocument):
        raise TypeError("hard_delete expects a SoftDeleteDocument instance")
    doc.delete()

def filter_active(queryset):
    """Utility to filter a queryset to only active (non‑deleted) documents.

    Example:
        active_resumes = filter_active(Resume.objects(user=user))
    """
    return queryset.filter(is_deleted=False)
