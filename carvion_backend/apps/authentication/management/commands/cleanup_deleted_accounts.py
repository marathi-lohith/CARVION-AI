import datetime
from django.core.management.base import BaseCommand
from apps.authentication.models import User

class Command(BaseCommand):
    help = "Permanently deletes user accounts that have exceeded their 30-day recovery period."

    def handle(self, *args, **options):
        now = datetime.datetime.utcnow()
        # Find users pending deletion whose scheduled date has passed
        expired_users = User.objects(
            is_pending_deletion=True,
            scheduled_deletion_date__lte=now
        )
        
        count = expired_users.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS("No expired accounts found for permanent deletion."))
            return

        for user in expired_users:
            self.stdout.write(f"Permanently deleting user account: {user.email}")
            # MongoEngine CASCADE rules (reverse_delete_rule=2) will clean up referencing documents
            user.delete()

        self.stdout.write(self.style.SUCCESS(f"Successfully deleted {count} user account(s)."))
