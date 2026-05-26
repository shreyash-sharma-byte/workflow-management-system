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
          {{ t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : t.type === 'warning' ? '⚠' : 'ℹ' }}
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
    .toast-icon { font-weight: bold; font-size: 16px; flex-shrink: 0; }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  `],
})
export class ToastContainerComponent {
  constructor(public toast: ToastService) {}
}
