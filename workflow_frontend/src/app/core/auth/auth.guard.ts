import { Injectable } from '@angular/core';
import { CanActivate, CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.auth.token) return true;
    this.router.navigate(['/']);
    return false;
  }
}

/**
 * Matches the public landing route (`/`) only while the visitor is signed out,
 * so a signed-in user falls through to the normal `''` layout route instead of
 * seeing the "Sign in" screen again. Evaluated after the APP_INITIALIZER has
 * finished initialising Keycloak, so `isAuthenticated` is authoritative here.
 */
export const unauthenticatedGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  return !auth.isAuthenticated;
};

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.auth.isAdmin) return true;
    this.router.navigate(['/dashboard']);
    return false;
  }
}

@Injectable({ providedIn: 'root' })
export class InitiatorGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.auth.isInitiator) return true;
    this.router.navigate(['/dashboard']);
    return false;
  }
}
