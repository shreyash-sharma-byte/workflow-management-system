import { Component } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-sidebar',
  template: `
    <nav class="app-sidebar">
      <div class="sidebar-brand">
        <h2>⚡ WorkflowMS</h2>
      </div>
      <ul class="sidebar-nav">
        <li><a routerLink="/dashboard" routerLinkActive="active">🏠 Dashboard</a></li>
        <li><a routerLink="/templates" routerLinkActive="active">📋 Templates</a></li>
        <li><a routerLink="/instances" routerLinkActive="active">⚙️ Instances</a></li>
        <li *ngIf="auth.isInitiator">
          <a routerLink="/instances/new" routerLinkActive="active">➕ New Instance</a>
        </li>
        <li *ngIf="auth.isAdmin">
          <a routerLink="/templates/new" routerLinkActive="active">➕ New Template</a>
        </li>
      </ul>
      <div class="sidebar-footer">
        <small class="text-muted">v1.0.0</small>
      </div>
    </nav>
  `,
  styles: [`
    .sidebar-brand { padding: 0.5rem 0 1.5rem; text-align: center; }
    .sidebar-brand h2 { font-size: 1.1rem; color: var(--primary); }
    .sidebar-nav { list-style: none; }
    .sidebar-nav li { margin-bottom: 0.25rem; }
    .sidebar-nav a {
      display: block; padding: 0.6rem 0.75rem; border-radius: var(--radius);
      color: var(--text); text-decoration: none; font-size: 0.875rem;
      transition: background 0.15s;
    }
    .sidebar-nav a:hover, .sidebar-nav a.active {
      background: #eef2ff; color: var(--primary);
    }
    .sidebar-footer { position: absolute; bottom: 1rem; }
  `],
})
export class SidebarComponent {
  constructor(public auth: AuthService) {}
}
