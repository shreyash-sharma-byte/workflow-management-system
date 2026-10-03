import { Component, OnInit, OnDestroy } from '@angular/core';
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
  selector: 'app-notification-popover',
  template: `
    <div class="notif-wrapper">
      <button class="header-action-btn" (click)="toggle()" [class.has-unread]="unreadCount > 0" aria-label="Notifications">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <span *ngIf="unreadCount > 0" class="badge-dot"></span>
      </button>
      <div *ngIf="open" class="notif-popover" (click)="$event.stopPropagation()">
        <div class="notif-header">
          <span class="font-semibold">Notifications</span>
          <button *ngIf="unreadCount > 0" class="btn btn-ghost btn-xs" (click)="markAllRead()">Mark all read</button>
        </div>
        <div class="notif-list">
          <div *ngFor="let n of notifications"
               class="notif-item" [class.unread]="!n.is_read"
               [routerLink]="n.link" (click)="markRead(n); open = false">
            <div class="notif-type">
              <span *ngIf="!n.is_read" class="unread-dot"></span>
              {{ typeLabel(n.notification_type) }}
            </div>
            <div class="notif-title">{{ n.title }}</div>
            <div class="notif-time">{{ n.created_at | date:'short' }}</div>
          </div>
          <div *ngIf="notifications.length === 0" class="notif-empty">
            No notifications yet
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notif-wrapper { position: relative; }
    .has-unread { color: var(--primary); }
    .notif-popover {
      position: absolute; top: 44px; right: -8px; width: 360px; max-height: 480px;
      background: var(--bg-surface); border: 1px solid var(--border-default);
      border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 200; overflow: hidden;
    }
    .notif-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 16px; border-bottom: 1px solid var(--border-light); font-size: 14px;
    }
    .notif-list { overflow-y: auto; max-height: 420px; }
    .notif-item {
      padding: 12px 16px; border-bottom: 1px solid var(--border-light);
      cursor: pointer; transition: background 0.12s; display: block; text-decoration: none; color: inherit;
    }
    .notif-item:hover { background: var(--bg-hover); }
    .notif-item.unread { background: var(--primary-light); }
    .notif-type { font-size: 11px; color: var(--text-tertiary); margin-bottom: 2px; display: flex; align-items: center; gap: 4px; }
    .unread-dot { width: 6px; height: 6px; background: var(--primary); border-radius: 50%; }
    .notif-title { font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 2px; }
    .notif-time { font-size: 11px; color: var(--text-tertiary); }
    .notif-empty { padding: 24px; text-align: center; font-size: 13px; color: var(--text-tertiary); }
  `],
})
export class NotificationPopoverComponent implements OnInit, OnDestroy {
  open = false;
  unreadCount = 0;
  notifications: NotificationItem[] = [];
  private pollTimer: any;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.fetchUnreadCount();
    this.pollTimer = setInterval(() => this.fetchUnreadCount(), 30000);
    document.addEventListener('click', this.onOutsideClick);
  }

  ngOnDestroy(): void {
    clearInterval(this.pollTimer);
    document.removeEventListener('click', this.onOutsideClick);
  }

  fetchUnreadCount(): void {
    this.api.getUnreadCount().subscribe(r => this.unreadCount = r.unread_count);
  }

  toggle(): void {
    this.open = !this.open;
    if (this.open) this.fetchNotifications();
  }

  fetchNotifications(): void {
    this.api.getNotifications().subscribe(r => {
      this.notifications = r.results;
      this.unreadCount = r.unread_count;
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
      this.unreadCount = 0;
      this.notifications.forEach(n => n.is_read = true);
    });
  }

  onOutsideClick = (): void => { this.open = false; };

  typeLabel(type: string): string {
    const m: any = { INSTANCE_ASSIGNED: 'Assigned', TASK_READY: 'Task Ready', TASK_COMPLETED: 'Task Done', INSTANCE_MOVED: 'Moved', INSTANCE_COMPLETED: 'Completed', INSTANCE_CANCELLED: 'Cancelled' };
    return m[type] || type;
  }
}
