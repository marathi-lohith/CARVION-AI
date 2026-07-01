from django.core.management.base import BaseCommand
from apps.authentication.models import User

class Command(BaseCommand):
    help = 'Create the default system administrator account if it does not exist.'

    def handle(self, *args, **options):
        admin_email = 'marathilohith02@gmail.com'
        admin_password = 'Lohith!020503'
        # Check if admin user already exists with admin role
        existing_user = User.objects(email=admin_email).first()
        if existing_user:
            if existing_user.role == 'admin':
                self.stdout.write(self.style.SUCCESS('Administrator account already exists. No action taken.'))
                return
            else:
                self.stdout.write(self.style.WARNING('User with the same email exists but is not an admin. Skipping creation.'))
                return
        # Create new admin user
        admin_user = User(
            email=admin_email,
            name='System Administrator',
            role='admin',
            is_active=True,
        )
        admin_user.set_password(admin_password)
        admin_user.save()
        self.stdout.write(self.style.SUCCESS('Default administrator account created successfully.'))
