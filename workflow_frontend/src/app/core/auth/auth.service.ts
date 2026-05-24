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

  get token(): string {
    return this.keycloak.getKeycloakInstance().token ?? '';
  }

  logout(): void {
    this.keycloak.logout('http://localhost:4200');
  }
}
