import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from '../services/toast.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private toast: ToastService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        // Don't show toasts for 400/401/403 — those have inline error displays
        if (err.status === 500 || err.status === 0 || err.status === 502 || err.status === 503) {
          this.toast.error('Server error. Please try again later.');
        } else if (err.status === 404 && !req.url.includes('/api/')) {
          // Let components handle their own 404s
        } else if (err.status === 429) {
          this.toast.warning('Too many requests. Please slow down.');
        }
        return throwError(() => err);
      })
    );
  }
}
