import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-sidebar',
  template: `
    <nav class="app-sidebar" [class.open]="open">
      <!-- Brand -->
      <div class="sidebar-brand">
        <div class="sidebar-brand-icon">W</div>
        <span class="sidebar-brand-text">Workflow</span>
        <button class="sidebar-close" (click)="close.emit()" aria-label="Close navigation">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Primary Navigation -->
      <div class="sidebar-section">
        <div class="sidebar-section-label">Main</div>
        <ul class="sidebar-nav">
          <li class="sidebar-nav-item">
            <a class="sidebar-nav-link" routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" (click)="close.emit()">
              Dashboard
            </a>
          </li>
          <li class="sidebar-nav-item">
            <a class="sidebar-nav-link" routerLink="/my-tasks" routerLinkActive="active" (click)="close.emit()">
              My Tasks
              <span class="nav-badge" *ngIf="pendingCount > 0">{{ pendingCount }}</span>
            </a>
          </li>
        </ul>
      </div>

      <!-- Work Items -->
      <div class="sidebar-section">
        <div class="sidebar-section-label">Work Items</div>
        <ul class="sidebar-nav">
          <li class="sidebar-nav-item">
            <a class="sidebar-nav-link" routerLink="/instances" routerLinkActive="active" (click)="close.emit()">
              Instances
            </a>
          </li>
          <li class="sidebar-nav-item">
            <a class="sidebar-nav-link" routerLink="/templates" routerLinkActive="active" (click)="close.emit()">
              Templates
            </a>
          </li>
        </ul>
      </div>

      <!-- Quick Actions (contextual by role) -->
      <div class="sidebar-section" *ngIf="auth.isInitiator || auth.isAdmin">
        <div class="sidebar-section-label">Quick Actions</div>
        <ul class="sidebar-nav">
          <li class="sidebar-nav-item" *ngIf="auth.isInitiator">
            <a class="sidebar-nav-link" routerLink="/instances/new" [class.active]="false" (click)="close.emit()">
              <span class="nav-icon" style="color:var(--success);">+</span> New Instance
            </a>
          </li>
          <li class="sidebar-nav-item" *ngIf="auth.isAdmin">
            <a class="sidebar-nav-link" routerLink="/templates/new" [class.active]="false" (click)="close.emit()">
              <span class="nav-icon" style="color:var(--primary);">+</span> New Template
            </a>
          </li>
        </ul>
      </div>

      <!-- Admin Section -->
      <div class="sidebar-section" *ngIf="auth.isAdmin">
        <div class="sidebar-section-label">Administration</div>
        <ul class="sidebar-nav">
          <li class="sidebar-nav-item">
            <a class="sidebar-nav-link" routerLink="/admin" routerLinkActive="active" (click)="close.emit()">
              Admin Panel
            </a>
          </li>
        </ul>
      </div>

      <!-- User Footer -->
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="sidebar-user-avatar">{{ userInitial }}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name truncate">{{ auth.username }}</div>
            <div class="sidebar-user-role">{{ roleLabel }}</div>
          </div>
        </div>
      </div>
    </nav>
  `,
})
export class SidebarComponent {
  @Input() open = false;
  @Output() close = new EventEmitter<void>();
  pendingCount = 0; // TODO: fetch from notifications/task API

  constructor(public auth: AuthService) {}

  get userInitial(): string {
    return (this.auth.username || 'U').charAt(0).toUpperCase();
  }

  get roleLabel(): string {
    if (this.auth.isAdmin) return 'Administrator';
    const roles = this.auth.roles || [];
    if (roles.includes('PM_MANAGER')) return 'Manager';
    if (roles.includes('PM_TEAM')) return 'Team Member';
    return roles[0] || 'User';
  }
}
