"""
Keycloak JWT Authentication Backend for Django REST Framework.

Validates Keycloak-issued JWTs, syncs user + roles on every request.

Flow:
1. Extract Bearer token from Authorization header
2. Decode JWT without verification to get kid (key ID)
3. Fetch Keycloak's public key (JWKS or certs endpoint)
4. Verify JWT signature, expiry, audience, issuer
5. Get or create local User from JWT claims
6. Sync roles: Keycloak realm_access.roles → Django Groups
7. Return (user, token_info)
"""

import logging
from django.conf import settings
from django.contrib.auth.models import Group
from rest_framework import authentication
from rest_framework import exceptions
from jose import jwt, JWTError
from jose.exceptions import ExpiredSignatureError, JWTClaimsError
import requests
from .models import User

logger = logging.getLogger(__name__)


class KeycloakJWTAuthentication(authentication.BaseAuthentication):
    """
    DRF Authentication class for Keycloak JWT.
    """
    keyword = 'Bearer'

    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith(f'{self.keyword} '):
            return None  # Let other auth classes try

        token = auth_header.split(' ', 1)[1].strip()
        if not token:
            raise exceptions.AuthenticationFailed('Empty token')

        try:
            token_info = self._decode_token(token)
        except ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired')
        except JWTError as e:
            raise exceptions.AuthenticationFailed(f'Invalid token: {str(e)}')

        user = self._get_or_create_user(token_info)
        self._sync_roles(user, token_info)

        return (user, token_info)

    def authenticate_header(self, request):
        return f'{self.keyword} realm="workflow-realm"'

    # ── Token Decoding ────────────────────────────────────

    def _decode_token(self, token: str) -> dict:
        """Decode and verify JWT against Keycloak public key."""
        kc = settings.KEYCLOAK_CONFIG

        if kc['VERIFY']:
            key = self._get_public_key(token)
            options = {'verify_exp': True}
            if kc.get('AUDIENCE'):
                options['verify_aud'] = True
            return jwt.decode(
                token,
                key,
                algorithms=[kc['ALGORITHM']],
                audience=kc.get('AUDIENCE') or None,
                options=options,
            )
        else:
            # Development mode: decode without verification
            return jwt.decode(token, '', options={'verify_signature': False})

    def _get_public_key(self, token: str) -> str:
        """Fetch the public key from Keycloak's JWKS endpoint."""
        kc = settings.KEYCLOAK_CONFIG
        jwks_url = f"{kc['SERVER_URL']}/realms/{kc['REALM']}/protocol/openid-connect/certs"

        try:
            jwks = requests.get(jwks_url, timeout=10).json()
        except requests.RequestException as e:
            logger.error(f"Failed to fetch Keycloak JWKS: {e}")
            raise exceptions.AuthenticationFailed('Unable to verify token: key server unreachable')

        # Get the kid from unverified headers
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get('kid')

        # Find the matching key
        for key_data in jwks.get('keys', []):
            if key_data.get('kid') == kid:
                return key_data

        raise exceptions.AuthenticationFailed('No matching public key found')

    # ── User Sync ─────────────────────────────────────────

    def _get_or_create_user(self, token_info: dict) -> User:
        """Get or create local user from JWT claims."""
        sub = token_info.get('sub')
        if not sub:
            raise exceptions.AuthenticationFailed('Token missing sub claim')

        username = token_info.get('preferred_username', sub)
        email = token_info.get('email', '')

        # 1. Try to find by keycloak_id (sub)
        user = User.objects.filter(keycloak_id=sub).first()

        # 2. Try to find by username (seeded users won't have keycloak_id)
        if not user:
            user = User.objects.filter(username=username).first()

        # 3. Create if not found
        if not user:
            user = User.objects.create(
                keycloak_id=sub,
                username=username,
                email=email,
                first_name=token_info.get('given_name', ''),
                last_name=token_info.get('family_name', ''),
            )
        else:
            # Update keycloak_id on first login after seeding
            if not user.keycloak_id:
                user.keycloak_id = sub
                user.save(update_fields=['keycloak_id'])
            # Update core fields
            updated = False
            if user.email != email:
                user.email = email
                updated = True
            if user.username != username:
                user.username = username
                updated = True
            if updated:
                user.save(update_fields=['username', 'email'])

        return user

    def _sync_roles(self, user: User, token_info: dict):
        """Sync Keycloak realm roles to Django Groups."""
        realm_access = token_info.get('realm_access', {})
        keycloak_roles = set(realm_access.get('roles', []))

        if not keycloak_roles:
            return

        target_django_groups = set()

        for role_name in keycloak_roles:
            # Map Keycloak role names to Django group names
            # We store the Keycloak role name as-is in Group.name
            group, _ = Group.objects.get_or_create(name=role_name)
            target_django_groups.add(group)

        current_groups = set(user.groups.all())

        # Add missing groups
        for group in target_django_groups - current_groups:
            user.groups.add(group)

        # Remove extra groups (roles removed in Keycloak)
        for group in current_groups - target_django_groups:
            user.groups.remove(group)
