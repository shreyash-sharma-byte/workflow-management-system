import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';

interface NotificationItem {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  link: string;
  instance_id: number | null;
  is_read: boolean;
  created_at: string;
}

@Component({
  selector: 'app-notifications-page',
  template: `
    <h1 class="page-title">Notifications</h1>

    <!-- Filters -->
    <div class="filter-bar mb-3">
      <select class="form-select" [(ngModel)]="filterType" (change)="load(1)" style="width:180px;">
        <option value="">All Types</option>
        <option value="INSTANCE_ASSIGNED">Assigned</option>
        <option value="INSTANCE_MOVED">Moved</option>
        <option value="INSTANCE_COMPLETED">Completed</option>
        <option value="INSTANCE_CANCELLED">Cancelled</option>
        <option value="TASK_READY">Task Ready</option>
        <option value="TASK_COMPLETED">Task Done</option>
      </select>
      <select class="form-select" [(ngModel)]="filterRead" (change)="load(1)" style="width:150px;">
        <option value="">All</option>
        <option value="false">Unread</option>
        <option value="true">Read</option>
      </select>
      <button class="btn btn-ghost btn-sm" (click)="markAllRead()" *ngIf="unreadCount > 0">
        Mark all {{ unreadCount }} as read
      </button>
    </div>

    <!-- List -->
    <div class="card">
      <div *ngFor="let n of notifications; let last = last"
           class="flex justify-between items-center"
           style="padding:var(--space-3) var(--space-5);border-bottom:1px solid var(--border-light);cursor:pointer;"
           [style.border-bottom]="last ? 'none' : ''"
           [style.background]="!n.is_read ? 'var(--primary-light)' : ''"
           [routerLink]="n.link" (click)="markRead(n)">
        <div class="flex items-center gap-3" style="flex:1;min-width:0;">
          <span class="badge" [class.badge-info]="n.notification_type==='INSTANCE_ASSIGNED'||n.notification_type==='INSTANCE_MOVED'"
                [class.badge-success]="n.notification_type==='INSTANCE_COMPLETED'||n.notification_type==='TASK_COMPLETED'"
                [class.badge-danger]="n.notification_type==='INSTANCE_CANCELLED'"
                [class.badge-warning]="n.notification_type==='TASK_READY'"
                style="flex-shrink:0;">
            {{ typeLabel(n.notification_type) }}
          </span>
          <div style="min-width:0;">
            <div class="font-medium text-sm truncate">{{ n.title }}</div>
            <div class="text-xs text-muted">{{ n.message }}</div>
          </div>
        </div>
        <div class="text-xs text-muted flex-shrink-0 ml-3" style="width:120px;text-align:right;">
          {{ n.created_at | date:'medium' }}
        </div>
      </div>

      <div *ngIf="notifications.length === 0" class="empty-state">
        <div class="empty-state-icon">🔔</div>
        <div class="empty-state-title">No notifications</div>
        <div class="empty-state-desc">You're all caught up! Notifications appear when workflows reach your stations.</div>
      </div>
    </div>

    <!-- Pagination -->
    <div class="flex justify-between items-center mt-3" *ngIf="totalPages > 1">
      <span class="text-sm text-muted">{{ totalCount }} total · page {{ page }} of {{ totalPages }}</span>
      <div class="flex gap-1">
        <button class="btn btn-outline btn-xs" [disabled]="page <= 1" (click)="load(page - 1)">← Prev</button>
        <button *ngFor="let p of pagesArray()" class="btn btn-xs"
                [class.btn-primary]="p === page" [class.btn-outline]="p !== page"
                (click)="load(p)">{{ p }}</button>
        <button class="btn btn-outline btn-xs" [disabled]="page >= totalPages" (click)="load(page + 1)">Next →</button>
      </div>
    </div>
  `,
})
export class NotificationsPageComponent implements OnInit {
  notifications: NotificationItem[] = [];
  unreadCount = 0;
  totalCount = 0;
  page = 1;
  totalPages = 1;
  filterType = '';
  filterRead = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(1); }

  load(p: number): void {
    this.page = p;
    const params: any = { page: p };
    if (this.filterType) params.type = this.filterType;
    if (this.filterRead) params.is_read = this.filterRead;
    this.api.getNotifications(params).subscribe(r => {
      this.notifications = r.results;
      this.unreadCount = r.unread_count;
      this.totalCount = r.count;
      this.totalPages = Math.ceil(r.count / 20);
    });
  }

  markRead(n: NotificationItem): void {
    if (!n.is_read) {
      this.api.markNotificationRead(n.id).subscribe(() => {
        n.is_read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      });
    }
  }

  markAllRead(): void {
    this.api.markAllNotificationsRead().subscribe(() => {
      this.notifications.forEach(n => n.is_read = true);
      this.unreadCount = 0;
    });
  }

  pagesArray(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    return pages;
  }

  typeLabel(type: string): string {
    const m: any = {
      INSTANCE_ASSIGNED: 'Assigned', TASK_READY: 'Task Ready', TASK_COMPLETED: 'Task Done',
      INSTANCE_MOVED: 'Moved', INSTANCE_COMPLETED: 'Completed', INSTANCE_CANCELLED: 'Cancelled',
    };
    return m[type] || type;
  }
}
