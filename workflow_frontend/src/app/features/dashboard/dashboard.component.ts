import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { AdminDashboard, UserDashboard } from '../../shared/models/types';

@Component({
  selector: 'app-dashboard',
  template: `
    <!-- Welcome Banner -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="page-title" style="margin-bottom:var(--space-1);">Good {{ greeting }}, {{ auth.username }}</h1>
        <p class="text-muted text-md">
          <ng-container *ngIf="userStats?.my_workload">
            You have
            <strong class="text-primary">{{ userStats.my_workload.blocked_by_me || 0 }}</strong> pending actions
            and <strong>{{ userStats.my_workload.assigned_to_me || 0 }}</strong> assigned tasks.
          </ng-container>
        </p>
      </div>
      <div class="quick-actions">
        <a *ngIf="auth.isInitiator" class="btn btn-primary" routerLink="/instances/new">
          + New Instance
        </a>
        <a *ngIf="auth.isAdmin" class="btn btn-outline" routerLink="/templates/new">
          + New Template
        </a>
      </div>
    </div>

    <!-- Stats Grid — Operator View (always visible) -->
    <div class="section-title">My Workload</div>
    <div class="stats-grid">
      <div class="stat-card interactive" routerLink="/my-tasks" *ngIf="userStats?.my_workload">
        <div class="stat-card-header">
          <span class="stat-card-icon" style="background:var(--warning-light);">⏳</span>
        </div>
        <div class="stat-card-value" style="color:var(--warning);">{{ userStats?.my_workload?.blocked_by_me || 0 }}</div>
        <div class="stat-card-label">Needs My Action</div>
      </div>

      <div class="stat-card interactive" routerLink="/instances" *ngIf="userStats?.my_workload">
        <div class="stat-card-header">
          <span class="stat-card-icon" style="background:var(--info-light);">📋</span>
        </div>
        <div class="stat-card-value">{{ userStats?.my_workload?.assigned_to_me || 0 }}</div>
        <div class="stat-card-label">Assigned to Me</div>
      </div>

      <div class="stat-card" *ngIf="userStats?.my_workload">
        <div class="stat-card-header">
          <span class="stat-card-icon" style="background:var(--success-light);">✓</span>
        </div>
        <div class="stat-card-value" style="color:var(--success);">{{ userStats?.my_workload?.completed_by_me || 0 }}</div>
        <div class="stat-card-label">Completed by Me</div>
      </div>

      <div class="stat-card interactive" routerLink="/instances" *ngIf="userStats?.my_initiated">
        <div class="stat-card-header">
          <span class="stat-card-icon" style="background:var(--primary-light);">▶</span>
        </div>
        <div class="stat-card-value" style="color:var(--primary);">{{ userStats?.my_initiated?.total || 0 }}</div>
        <div class="stat-card-label">Initiated by Me</div>
      </div>
    </div>

    <!-- Admin Overview (visible only for admins) -->
    <ng-container *ngIf="auth.isAdmin && adminStats">
      <div class="section-title mt-4">System Overview</div>
      <div class="stats-grid">
        <div class="stat-card interactive" routerLink="/templates">
          <div class="stat-card-header">
            <span class="stat-card-icon" style="background:var(--primary-light);">▦</span>
          </div>
          <div class="stat-card-value" style="color:var(--primary);">{{ adminStats.total_templates || 0 }}</div>
          <div class="stat-card-label">Total Templates</div>
        </div>

        <div class="stat-card interactive" routerLink="/instances">
          <div class="stat-card-header">
            <span class="stat-card-icon" style="background:var(--info-light);">◎</span>
          </div>
          <div class="stat-card-value" style="color:var(--info);">{{ adminStats.active_instances || 0 }}</div>
          <div class="stat-card-label">Active Instances</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-card-icon" style="background:var(--success-light);">📊</span>
          </div>
          <div class="stat-card-value" style="color:var(--success);">{{ adminStats.completed_today || 0 }}</div>
          <div class="stat-card-label">Completed Today</div>
        </div>
      </div>
    </ng-container>

    <!-- Recent Workflows Table -->
    <div class="section-title mt-4">Recent Workflows</div>
    <div class="card" *ngIf="userStats?.recent_instances?.length">
      <div class="card-body-flush">
        <table class="table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Title</th>
              <th>Template</th>
              <th>Current Station</th>
              <th>Status</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let i of userStats.recent_instances" class="clickable" [routerLink]="['/instances', i.id]">
              <td class="cell-primary">{{ i.reference }}</td>
              <td>{{ i.title }}</td>
              <td class="text-sm text-muted">{{ i.template_name }}</td>
              <td>
                <span class="badge badge-neutral">{{ i.current_station?.name }}</span>
              </td>
              <td>
                <span class="status-indicator" [class.active]="i.status==='ACTIVE'" [class.completed]="i.status==='COMPLETED'">
                  {{ i.status }}
                </span>
              </td>
              <td class="text-sm text-muted cell-nowrap">{{ i.updated_at | date:'short' }}</td>
              <td>
                <a class="btn btn-ghost btn-sm" [routerLink]="['/instances', i.id]">View →</a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty State -->
    <div *ngIf="!userStats?.recent_instances?.length" class="card">
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-title">Welcome to Workflow</div>
        <div class="empty-state-desc">
          <ng-container *ngIf="auth.isInitiator">
            You haven't started any workflows yet. Create your first instance to get going.
          </ng-container>
          <ng-container *ngIf="!auth.isInitiator">
            No workflows are assigned to you yet. When a workflow reaches your station, it will appear here.
          </ng-container>
        </div>
        <a *ngIf="auth.isInitiator" class="btn btn-primary btn-lg" routerLink="/instances/new">
          + Create Your First Instance
        </a>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  adminStats?: AdminDashboard;
  userStats?: UserDashboard;

  constructor(public auth: AuthService, private api: ApiService) {}

  ngOnInit(): void {
    this.api.userDashboard().subscribe(d => this.userStats = d);
    if (this.auth.isAdmin) {
      this.api.adminDashboard().subscribe(d => this.adminStats = d);
    }
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }
}
