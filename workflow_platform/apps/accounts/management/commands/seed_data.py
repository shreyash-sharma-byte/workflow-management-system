"""
Management command to seed the database with roles and users.

Creates 7 roles with 3 users each (21 total users).

Usage:
    python manage.py seed_data
    python manage.py seed_data --password Test@123
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group
from apps.accounts.models import User

# ── Role Definitions ─────────────────────────────────────────
ROLES_CONFIG = [
    {
        'name': 'ADMIN',
        'display_name': 'Administrator',
        'keycloak_role': 'ADMIN',
        'users': [
            {'username': 'priya', 'email': 'priya@company.com', 'first_name': 'Priya', 'last_name': 'Sharma'},
            {'username': 'admin.rahul', 'email': 'rahul@company.com', 'first_name': 'Rahul', 'last_name': 'Verma'},
            {'username': 'admin.sneha', 'email': 'sneha@company.com', 'first_name': 'Sneha', 'last_name': 'Patel'},
        ]
    },
    {
        'name': 'PM_TEAM',
        'display_name': 'Product Management Team',
        'keycloak_role': 'PM_TEAM',
        'users': [
            {'username': 'ananya', 'email': 'ananya@company.com', 'first_name': 'Ananya', 'last_name': 'Gupta'},
            {'username': 'pm.karan', 'email': 'karan@company.com', 'first_name': 'Karan', 'last_name': 'Joshi'},
            {'username': 'pm.divya', 'email': 'divya@company.com', 'first_name': 'Divya', 'last_name': 'Reddy'},
        ]
    },
    {
        'name': 'PM_MANAGER',
        'display_name': 'Product Management Manager',
        'keycloak_role': 'PM_MANAGER',
        'users': [
            {'username': 'manager.akash', 'email': 'akash@company.com', 'first_name': 'Akash', 'last_name': 'Singh'},
            {'username': 'pm.lead.meera', 'email': 'meera@company.com', 'first_name': 'Meera', 'last_name': 'Nair'},
            {'username': 'pm.head.vikram', 'email': 'vikram.head@company.com', 'first_name': 'Vikram', 'last_name': 'Chopra'},
        ]
    },
    {
        'name': 'DEV_TEAM',
        'display_name': 'Development Team',
        'keycloak_role': 'DEV_TEAM',
        'users': [
            {'username': 'vikram', 'email': 'vikram@company.com', 'first_name': 'Vikram', 'last_name': 'Singh'},
            {'username': 'dev.rohan', 'email': 'rohan@company.com', 'first_name': 'Rohan', 'last_name': 'Das'},
            {'username': 'dev.pooja', 'email': 'pooja@company.com', 'first_name': 'Pooja', 'last_name': 'Iyer'},
        ]
    },
    {
        'name': 'DEV_LEAD',
        'display_name': 'Development Lead',
        'keycloak_role': 'DEV_LEAD',
        'users': [
            {'username': 'lead.arjun', 'email': 'arjun.lead@company.com', 'first_name': 'Arjun', 'last_name': 'Nair'},
            {'username': 'lead.neha', 'email': 'neha.lead@company.com', 'first_name': 'Neha', 'last_name': 'Kulkarni'},
            {'username': 'lead.manoj', 'email': 'manoj@company.com', 'first_name': 'Manoj', 'last_name': 'Tiwari'},
        ]
    },
    {
        'name': 'QA_TEAM',
        'display_name': 'QA Team',
        'keycloak_role': 'QA_TEAM',
        'users': [
            {'username': 'raj', 'email': 'raj@company.com', 'first_name': 'Raj', 'last_name': 'Kumar'},
            {'username': 'qa.sita', 'email': 'sita@company.com', 'first_name': 'Sita', 'last_name': 'Menon'},
            {'username': 'qa.amit', 'email': 'amit@company.com', 'first_name': 'Amit', 'last_name': 'Saxena'},
        ]
    },
    {
        'name': 'QA_MANAGER',
        'display_name': 'QA Manager',
        'keycloak_role': 'QA_MANAGER',
        'users': [
            {'username': 'amit.manager', 'email': 'amit.manager@company.com', 'first_name': 'Amit', 'last_name': 'Shah'},
            {'username': 'qa.lead.kavya', 'email': 'kavya@company.com', 'first_name': 'Kavya', 'last_name': 'Rao'},
            {'username': 'qa.head.suresh', 'email': 'suresh@company.com', 'first_name': 'Suresh', 'last_name': 'Pillai'},
        ]
    },
    {
        'name': 'DEV_OPS',
        'display_name': 'DevOps Team',
        'keycloak_role': 'DEV_OPS',
        'users': [
            {'username': 'ops.rajesh', 'email': 'rajesh@company.com', 'first_name': 'Rajesh', 'last_name': 'Kumar'},
            {'username': 'ops.deepika', 'email': 'deepika@company.com', 'first_name': 'Deepika', 'last_name': 'Sen'},
            {'username': 'ops.harish', 'email': 'harish@company.com', 'first_name': 'Harish', 'last_name': 'Bhat'},
        ]
    },
    {
        'name': 'AUDITOR',
        'display_name': 'Auditor',
        'keycloak_role': 'AUDITOR',
        'users': [
            {'username': 'neha', 'email': 'neha@company.com', 'first_name': 'Neha', 'last_name': 'Desai'},
            {'username': 'auditor.ravi', 'email': 'ravi@company.com', 'first_name': 'Ravi', 'last_name': 'Malhotra'},
            {'username': 'auditor.tina', 'email': 'tina@company.com', 'first_name': 'Tina', 'last_name': 'Bose'},
        ]
    },
]


class Command(BaseCommand):
    help = 'Seed database with roles and users (3 users per role, 9 roles)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--password',
            type=str,
            default='Workflow@123',
            help='Default password for all seed users (default: Workflow@123)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing users and groups before seeding'
        )

    def handle(self, *args, **options):
        password = options['password']

        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing data...'))
            User.objects.filter(is_superuser=False).delete()
            Group.objects.all().delete()

        total_users = 0
        total_roles = 0

        for role_config in ROLES_CONFIG:
            group, created = Group.objects.get_or_create(
                name=role_config['name'],
            )
            if created:
                total_roles += 1
                self.stdout.write(f"  ✅ Created role: {role_config['display_name']} ({role_config['name']})")
            else:
                self.stdout.write(f"  ℹ️  Role exists: {role_config['display_name']} ({role_config['name']})")

            for user_data in role_config['users']:
                user, created = User.objects.get_or_create(
                    username=user_data['username'],
                    defaults={
                        'email': user_data['email'],
                        'first_name': user_data['first_name'],
                        'last_name': user_data['last_name'],
                        'is_active': True,
                    }
                )

                if created:
                    user.set_password(password)
                    user.save()
                    total_users += 1

                user.groups.add(group)

                role_label = role_config['display_name']
                self.stdout.write(
                    f"     👤 {user.username} ({user.get_full_name()}) → {role_label}"
                )

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Seed complete: {total_users} users created, {total_roles} roles created '
            f'(total {len(ROLES_CONFIG)} roles, {sum(len(r["users"]) for r in ROLES_CONFIG)} users)'
        ))
        self.stdout.write(f'   Default password for all: {password}')
