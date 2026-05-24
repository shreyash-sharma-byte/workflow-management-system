import { Component } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-header',
  template: `
    <header class="app-header">
      <span class="text-muted text-sm">{{ currentRoute }}</span>
      <div class="flex gap-1" style="align-items:center;">
        <span class="text-sm">{{ auth.username }}</span>
        <span class="badge" [class]="auth.isAdmin ? 'badge-danger' : 'badge-info'">
          {{ auth.isAdmin ? 'Admin' : auth.roles[0] || 'User' }}
        </span>
        <button class="btn btn-outline btn-sm" (click)="auth.logout()">Logout</button>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  constructor(public auth: AuthService) {}

  get currentRoute(): string {
    const url = window.location.pathname;
    if (url.includes('templates/new')) return 'Dashboard > Templates > Create New';
    if (url.includes('templates')) return 'Dashboard > Templates';
    if (url.includes('instances/new')) return 'Dashboard > Instances > Create New';
    if (url.includes('instances')) return 'Dashboard > Instances';
    return 'Dashboard';
  }
}
