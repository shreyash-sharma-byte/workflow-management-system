import { Injectable } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private keycloak: KeycloakService) {}

  get username(): string {
    const kc = this.keycloak.getKeycloakInstance();
    return (kc.tokenParsed as any)?.['preferred_username'] || kc.subject || 'User';
  }

  get roles(): string[] {
    const kc = this.keycloak.getKeycloakInstance();
    return kc.realmAccess?.roles ?? [];
  }

  hasRole(role: string): boolean {
    return this.roles.includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some(r => this.hasRole(r));
  }

  get isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  get isInitiator(): boolean {
    return this.hasAnyRole(['ADMIN', 'PM_TEAM', 'PM_MANAGER']);
  }

  get isAuthenticated(): boolean {
    return this.keycloak.isLoggedIn();
  }

  login(): void {
    this.keycloak.login();
  }

  get userName(): string {
    return this.username;
  }

  get token(): string {
    return this.keycloak.getKeycloakInstance().token ?? '';
  }

  logout(): void {
    // Whatever origin the app was served from is where Keycloak should send the
    // user back to — never a hardcoded host.
    this.keycloak.logout(window.location.origin);
  }
}
