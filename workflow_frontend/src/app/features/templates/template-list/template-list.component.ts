import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkflowTemplate } from '../../../shared/models/types';

@Component({
  selector: 'app-template-list',
  template: `
    <div class="flex justify-between items-center mb-4">
      <div>
        <h1 class="page-title" style="margin-bottom:var(--space-1);">Templates</h1>
        <p class="text-sm text-muted">
          {{ templates.length }} workflow template{{ templates.length !== 1 ? 's' : '' }}
          <span *ngIf="statusFilter">· {{ statusFilter | lowercase }} only</span>
        </p>
      </div>
      <a *ngIf="auth.isAdmin" class="btn btn-primary" routerLink="/templates/new">
        + Create Template
      </a>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar mb-4">
      <select class="form-select" [(ngModel)]="statusFilter" (change)="load()">
        <option value="">All Statuses</option>
        <option value="PUBLISHED">Published</option>
        <option value="DRAFT">Draft</option>
      </select>
    </div>

    <!-- Table -->
    <div class="card" *ngIf="templates.length > 0">
      <div class="card-body-flush">
        <table class="table">
          <thead>
            <tr>
              <th>Template Name</th>
              <th>Category</th>
              <th>Status</th>
              <th>Stations</th>
              <th>Active Instances</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let t of templates" class="clickable" [routerLink]="['/templates', t.id]">
              <td>
                <div class="cell-primary">{{ t.name }}</div>
                <div class="text-xs text-muted truncate" style="max-width:260px;">{{ t.description }}</div>
              </td>
              <td>
                <span class="badge badge-neutral">{{ t.category || 'General' }}</span>
              </td>
              <td>
                <span class="status-indicator" [class.completed]="t.status==='PUBLISHED'"
                      [class.draft]="t.status==='DRAFT'">
                  {{ t.status }}
                </span>
              </td>
              <td>{{ t.station_count || 0 }}</td>
              <td>
                <span [class.font-semibold]="t.instance_count > 0">{{ t.instance_count || 0 }}</span>
              </td>
              <td class="text-sm text-muted cell-nowrap">{{ t.created_at | date:'short' }}</td>
              <td (click)="$event.stopPropagation()">
                <button *ngIf="auth.isAdmin && t.status === 'DRAFT'"
                        class="btn btn-outline btn-sm" (click)="deleteTemplate(t.id)">
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty State -->
    <div class="card" *ngIf="templates.length === 0">
      <div class="empty-state">
        <div class="empty-state-icon">▦</div>
        <div class="empty-state-title">No templates yet</div>
        <div class="empty-state-desc">
          <ng-container *ngIf="auth.isAdmin">
            Create workflow templates to define stations, tasks, and transitions.
          </ng-container>
          <ng-container *ngIf="!auth.isAdmin">
            No templates have been published yet. Contact an administrator.
          </ng-container>
        </div>
        <a *ngIf="auth.isAdmin" class="btn btn-primary" routerLink="/templates/new">
          + Create First Template
        </a>
      </div>
    </div>
  `,
})
export class TemplateListComponent implements OnInit {
  templates: WorkflowTemplate[] = [];
  statusFilter = '';

  constructor(public auth: AuthService, private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    const params: any = {};
    if (this.statusFilter) params.status = this.statusFilter;
    this.api.listTemplates(params).subscribe(res => this.templates = res.results);
  }

  deleteTemplate(id: number): void {
    if (confirm('Permanently delete this template? This cannot be undone.')) {
      this.api.deleteTemplate(id).subscribe(() => this.load());
    }
  }
}
