import { KeycloakService } from 'keycloak-angular';
import { runtimeConfig } from '../config/runtime-config';

export function keycloakInitializer(keycloak: KeycloakService): () => Promise<boolean> {
  return () => {
    const cfg = runtimeConfig();
    return keycloak.init({
      config: {
        url: cfg.keycloakUrl,
        realm: cfg.keycloakRealm,
        clientId: cfg.keycloakClientId,
      },
      initOptions: {
        // 'check-sso' instead of 'login-required': an unauthenticated visitor is
        // NOT redirected to the identity provider on load — the public landing
        // route renders first, and signing in is an explicit action. The silent
        // check still picks up an existing Keycloak session (so a signed-in user
        // skips straight to the dashboard after login). The silent-check-sso page
        // below is required for that check.
        onLoad: 'check-sso',
        checkLoginIframe: false,
        silentCheckSsoRedirectUri:
          window.location.origin + '/assets/silent-check-sso.html',
      },
      loadUserProfileAtStartUp: false,  // We use /api/v1/auth/me instead
    });
  };
}
