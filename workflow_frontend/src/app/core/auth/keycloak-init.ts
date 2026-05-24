import { KeycloakService } from 'keycloak-angular';

export function keycloakInitializer(keycloak: KeycloakService): () => Promise<boolean> {
  return () =>
    keycloak.init({
      config: {
        url: 'http://localhost:8080',
        realm: 'workflow-realm',
        clientId: 'workflow-platform',
      },
      initOptions: {
        onLoad: 'login-required',
        checkLoginIframe: false,
        silentCheckSsoRedirectUri:
          window.location.origin + '/assets/silent-check-sso.html',
      },
      loadUserProfileAtStartUp: false,  // We use /api/v1/auth/me instead
    });
}
