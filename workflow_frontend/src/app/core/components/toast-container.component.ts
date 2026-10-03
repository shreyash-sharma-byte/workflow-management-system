import { Component } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  template: `
    <div class="toast-container">
      <div *ngFor="let t of toast.toasts"
           class="toast"
           [class.toast-success]="t.type==='success'"
           [class.toast-error]="t.type==='error'"
           [class.toast-warning]="t.type==='warning'"
           [class.toast-info]="t.type==='info'"
           (click)="toast.dismiss(t.id)">
        <span class="toast-icon">
          <svg *ngIf="t.type === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
          <svg *ngIf="t.type === 'error'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
          <svg *ngIf="t.type === 'warning'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
          <svg *ngIf="t.type === 'info'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        </span>
        <span>{{ t.message }}</span>
      </div>
    </div>
  `,
  styles: [`
    .toast-container { position: fixed; top: 16px; right: 16px; z-index: 9999; display: flex; flex-direction: column; gap: 8px; max-width: 400px; }
    .toast { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 8px; font-size: 13px; cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: slideIn 0.2s ease; color: white; line-height: 1.4; }
    .toast-success { background: #059669; }
    .toast-error { background: #dc2626; }
    .toast-warning { background: #d97706; }
    .toast-info { background: #2563eb; }
    .toast-icon { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  `],
})
export class ToastContainerComponent {
  constructor(public toast: ToastService) {}
}
