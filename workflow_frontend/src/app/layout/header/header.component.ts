import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';

interface BreadcrumbSegment {
  label: string;
  route?: string;
}

@Component({
  selector: 'app-header',
  template: `
    <header class="app-header">
      <div class="header-left">
        <!-- Dynamic Breadcrumb -->
        <nav class="header-breadcrumb">
          <ng-container *ngFor="let seg of breadcrumbs; let last = last">
            <span class="separator" *ngIf="!last">/</span>
            <a *ngIf="seg.route && !last" [routerLink]="seg.route">{{ seg.label }}</a>
            <span class="current" *ngIf="last || !seg.route">{{ seg.label }}</span>
          </ng-container>
        </nav>
      </div>

      <div class="header-right">
        <!-- Global Quick Actions -->
        <button
          *ngIf="auth.isInitiator"
          class="btn btn-primary btn-sm"
          routerLink="/instances/new"
          data-tooltip="New Instance">
          + New Instance
        </button>

        <!-- Notifications -->
        <app-notification-popover></app-notification-popover>

        <!-- User Menu -->
        <div class="flex items-center gap-2">
          <span class="text-sm text-secondary font-medium">{{ auth.username }}</span>
          <span class="badge" [class.badge-primary]="auth.isAdmin" [class.badge-neutral]="!auth.isAdmin">
            {{ auth.isAdmin ? 'Admin' : (auth.roles[0] || 'User') }}
          </span>
          <button class="btn btn-ghost btn-sm" (click)="auth.logout()">
            Log out
          </button>
        </div>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  breadcrumbs: BreadcrumbSegment[] = [];
  unreadCount = 0;

  constructor(public auth: AuthService, private router: Router) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.updateBreadcrumbs());
  }

  private updateBreadcrumbs(): void {
    const url = this.router.url;
    const crumbs: BreadcrumbSegment[] = [];

    // Build breadcrumbs from URL segments
    const segments = url.split('/').filter(s => s);

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isId = /^\d+$/.test(segment);

      if (i === 0) {
        crumbs.push({
          label: this.capitalize(segment),
          route: '/' + segment,
        });
      } else if (isId) {
        // Show "Detail" for ID segments — context is from the parent path
        const parentLabel = segments[i - 1];
        const detailLabel = parentLabel === 'templates' ? 'Template' :
                            parentLabel === 'instances' ? 'Instance' : 'Detail';
        crumbs.push({ label: detailLabel + ' #' + segment });
      } else {
        crumbs.push({ label: this.formatSegment(segment) });
      }
    }

    // Always start with Dashboard if no crumbs
    if (crumbs.length === 0) {
      crumbs.push({ label: 'Dashboard', route: '/dashboard' });
    }

    this.breadcrumbs = crumbs;
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  private formatSegment(s: string): string {
    const map: Record<string, string> = {
      'new': 'Create New',
      'stations': 'Stations',
      'transitions': 'Transitions',
      'my-tasks': 'My Tasks',
      'dashboard': 'Dashboard',
      'templates': 'Templates',
      'instances': 'Instances',
      'notifications': 'Notifications',
      'admin': 'Administration',
    };
    return map[s] || this.capitalize(s);
  }
}
