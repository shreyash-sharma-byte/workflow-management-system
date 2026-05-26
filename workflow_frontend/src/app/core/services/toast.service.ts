import { Injectable } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts: Toast[] = [];
  private nextId = 0;

  show(message: string, type: Toast['type'] = 'info'): void {
    const id = ++this.nextId;
    this.toasts.push({ id, message, type });
    setTimeout(() => this.dismiss(id), 4000);
  }

  success(msg: string): void { this.show(msg, 'success'); }
  error(msg: string): void { this.show(msg, 'error'); }
  warning(msg: string): void { this.show(msg, 'warning'); }
  info(msg: string): void { this.show(msg, 'info'); }

  dismiss(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }
}
