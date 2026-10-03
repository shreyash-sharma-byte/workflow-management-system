import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkflowInstance } from '../../../shared/models/types';

@Component({
  selector: 'app-instance-list',
  template: `
    <div class="flex justify-between items-center mb-4 toolbar">
      <div>
        <h1 class="page-title" style="margin-bottom:var(--space-1);">Instances</h1>
        <p class="text-sm text-muted">
          {{ instances.length }} workflow instance{{ instances.length !== 1 ? 's' : '' }}
          <span *ngIf="statusFilter">· Filtered by {{ statusFilter | lowercase }}</span>
        </p>
      </div>
      <a *ngIf="auth.isInitiator" class="btn btn-primary" routerLink="/instances/new">
        + New Instance
      </a>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar mb-4">
      <input
        class="form-input search-input"
        [(ngModel)]="search"
        (input)="load()"
        placeholder="Search by reference or title...">
      <select class="form-select" [(ngModel)]="statusFilter" (change)="load()">
        <option value="">All Statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="COMPLETED">Completed</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
    </div>

    <!-- Table -->
    <div class="card" *ngIf="instances.length > 0">
      <div class="card-body-flush table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Title</th>
              <th>Template</th>
              <th>Current Station</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let i of instances" class="clickable" [routerLink]="['/instances', i.id]">
              <td class="cell-primary">{{ i.reference }}</td>
              <td>
                <div class="font-medium">{{ i.title }}</div>
                <div class="text-xs text-muted">by {{ i.initiated_by_name }}</div>
              </td>
              <td><span class="text-sm">{{ i.template_name }}</span></td>
              <td>
                <span class="badge" [class.badge-primary]="i.status==='ACTIVE'"
                      [class.badge-neutral]="i.status!=='ACTIVE'">
                  {{ i.current_station_name }}
                </span>
              </td>
              <td>
                <span class="status-indicator" [class.active]="i.status==='ACTIVE'"
                      [class.completed]="i.status==='COMPLETED'"
                      [class.cancelled]="i.status==='CANCELLED'">
                  {{ i.status }}
                </span>
              </td>
              <td class="text-sm text-muted cell-nowrap">{{ i.updated_at | date:'short' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div class="flex justify-between items-center mt-3" *ngIf="totalPages > 1">
      <span class="text-sm text-muted">{{ totalCount }} total · page {{ page }} of {{ totalPages }}</span>
      <div class="flex gap-1">
        <button class="btn btn-outline btn-xs" [disabled]="page <= 1" (click)="goPage(page - 1)">Prev</button>
        <button *ngFor="let p of pagesArray()" class="btn btn-xs"
                [class.btn-primary]="p === page" [class.btn-outline]="p !== page"
                (click)="goPage(p)">{{ p }}</button>
        <button class="btn btn-outline btn-xs" [disabled]="page >= totalPages" (click)="goPage(page + 1)">Next</button>
      </div>
    </div>

    <!-- Empty State -->
    <div class="card" *ngIf="instances.length === 0">
      <div class="empty-state">
        <div class="empty-state-title">No instances found</div>
        <div class="empty-state-desc" *ngIf="!statusFilter && !search">
          No workflow instances have been created yet.
          <ng-container *ngIf="auth.isInitiator">Start by creating your first one.</ng-container>
        </div>
        <div class="empty-state-desc" *ngIf="statusFilter || search">
          No results match your filters. Try adjusting your search or status filter.
        </div>
        <a *ngIf="auth.isInitiator && !statusFilter && !search" class="btn btn-primary" routerLink="/instances/new">
          + Create First Instance
        </a>
        <button *ngIf="statusFilter || search" class="btn btn-outline" (click)="clearFilters()">
          Clear Filters
        </button>
      </div>
    </div>
  `,
})
export class InstanceListComponent implements OnInit {
  instances: WorkflowInstance[] = [];
  statusFilter = '';
  search = '';
  totalCount = 0;
  page = 1;
  pageSize = 20;
  totalPages = 1;
  loading = false;

  constructor(public auth: AuthService, private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    const params: any = { page: this.page, page_size: this.pageSize };
    if (this.statusFilter) params.status = this.statusFilter;
    if (this.search) params.search = this.search;
    this.loading = true;
    this.api.listInstances(params).subscribe(r => {
      this.instances = r.results;
      this.totalCount = r.count;
      this.totalPages = Math.ceil(r.count / this.pageSize);
      this.loading = false;
    });
  }

  goPage(p: number): void {
    this.page = p;
    this.load();
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.search = '';
    this.page = 1;
    this.load();
  }

  pagesArray(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    return pages;
  }
}
