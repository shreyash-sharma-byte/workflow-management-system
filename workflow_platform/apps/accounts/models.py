from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Extended user model.
    Keycloak is the source of truth — users are auto-created on first JWT login.
    """
    keycloak_id = models.CharField(max_length=255, unique=True, blank=True, null=True,
                                   help_text='Keycloak user UUID (sub claim)')

    # The user's roles come from Keycloak JWT and are synced to Django Groups
    # via KeycloakJWTAuthentication on each request.

    class Meta:
        ordering = ['username']

    def __str__(self):
        return f"{self.get_full_name() or self.username}"

    @property
    def role_names(self):
        """Return list of role names from groups (synced from Keycloak)."""
        return list(self.groups.values_list('name', flat=True))

    @property
    def is_admin(self):
        return self.groups.filter(name='ADMIN').exists()
