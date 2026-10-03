import { Component } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

/**
 * Public pre-login landing screen. Shown at `/` only while the visitor is signed
 * out (see unauthenticatedGuard in core/auth/auth.guard.ts); a signed-in user
 * falls through to the normal app shell. Makes no API calls of its own — signing
 * in is an explicit action that calls the existing KeycloakService login() path.
 *
 * Presentation only: it lifts the page to the shared front-page design standard
 * (see /home/yash/hosting/docs/front-page-design-spec.md) while leaving the
 * check-sso Keycloak wiring, the auth guard and every route path untouched.
 */
@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent {
  constructor(private auth: AuthService) {}

  signIn(): void {
    this.auth.login();
  }
}
