import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { AdminDashboard, UserDashboard } from '../../shared/models/types';

@Component({
  selector: 'app-dashboard',
  template: `
    <h2 style="margin-bottom:1.5rem;">Dashboard</h2>

    <!-- Stats Grid -->
    <div class="stats-grid" *ngIf="auth.isAdmin && adminStats">
      <div class="stat-card">
        <div class="stat-value">{{ adminStats.total_templates }}</div>
        <div class="stat-label">Templates</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ adminStats.published_templates }}</div>
        <div class="stat-label">Published</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ adminStats.total_instances }}</div>
        <div class="stat-label">Total Instances</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ adminStats.active_instances }}</div>
        <div class="stat-label">Active Instances</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ adminStats.completed_today }}</div>
        <div class="stat-label">Completed Today</div>
      </div>
    </div>

    <!-- User Stats -->
    <div class="stats-grid" *ngIf="userStats">
      <div class="stat-card" *ngIf="userStats.my_workload">
        <div class="stat-value">{{ userStats.my_workload.assigned_to_me }}</div>
        <div class="stat-label">Assigned to Me</div>
      </div>
      <div class="stat-card" *ngIf="userStats.my_workload">
        <div class="stat-value">{{ userStats.my_workload.blocked_by_me }}</div>
        <div class="stat-label">Blocked (My Tasks)</div>
      </div>
      <div class="stat-card" *ngIf="userStats.my_workload">
        <div class="stat-value">{{ userStats.my_workload.completed_by_me }}</div>
        <div class="stat-label">Completed by Me</div>
      </div>
      <div class="stat-card" *ngIf="userStats.my_initiated">
        <div class="stat-value">{{ userStats.my_initiated.total }}</div>
        <div class="stat-label">My Initiated</div>
      </div>
    </div>

    <!-- Recent instances -->
    <div class="card" *ngIf="userStats?.recent_instances?.length">
      <div class="card-header">My Workflows</div>
      <table class="table">
        <thead><tr><th>Ref</th><th>Title</th><th>Station</th><th>Status</th><th>Updated</th></tr></thead>
        <tbody>
          <tr *ngFor="let i of userStats.recent_instances" [routerLink]="['/instances', i.id]" style="cursor:pointer;">
            <td>{{ i.reference }}</td>
            <td>{{ i.title }}</td>
            <td>{{ i.current_station?.name }}</td>
            <td><span class="badge" [class]="i.status === 'ACTIVE' ? 'badge-info' : 'badge-success'">{{ i.status }}</span></td>
            <td class="text-sm text-muted">{{ i.updated_at | date:'short' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Quick Actions -->
    <div class="flex gap-1 mt-1" *ngIf="auth.isAdmin">
      <a class="btn btn-primary" routerLink="/templates/new">+ Create Template</a>
    </div>
    <div class="flex gap-1 mt-1" *ngIf="auth.isInitiator">
      <a class="btn btn-success" routerLink="/instances/new">+ New Instance</a>
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
}
