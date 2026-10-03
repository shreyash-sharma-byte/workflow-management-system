/**
 * Runtime configuration.
 *
 * The deployment host is not known at build time — the same bundle is served
 * over localhost, over the tailnet name and over public HTTPS. So the
 * coordinates the *browser* needs (Keycloak URL, API base) are injected as a
 * plain global from /assets/config.js, which the edge server generates per
 * request from the Host header. Dev defaults keep a bare `ng serve` working.
 */
export interface RuntimeConfig {
  keycloakUrl: string;
  keycloakRealm: string;
  keycloakClientId: string;
  apiBase: string;
}

const DEFAULTS: RuntimeConfig = {
  keycloakUrl: 'http://localhost:8080',
  keycloakRealm: 'workflow-realm',
  keycloakClientId: 'workflow-platform',
  apiBase: 'http://localhost:8000/api/v1',
};

export function runtimeConfig(): RuntimeConfig {
  const injected = (window as any).__APP_CONFIG__ ?? {};
  return { ...DEFAULTS, ...injected };
}
