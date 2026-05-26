import { Component } from '@angular/core';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-loading-spinner',
  template: `
    <div *ngIf="loading.loading$ | async" class="spinner-overlay">
      <div class="spinner"></div>
    </div>
  `,
  styles: [`
    .spinner-overlay {
      position: fixed; inset: 0; background: rgba(255,255,255,0.5); z-index: 9998;
      display: flex; align-items: center; justify-content: center;
    }
    .spinner {
      width: 36px; height: 36px; border: 3px solid var(--border-default);
      border-top-color: var(--primary); border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class LoadingSpinnerComponent {
  constructor(public loading: LoadingService) {}
}
