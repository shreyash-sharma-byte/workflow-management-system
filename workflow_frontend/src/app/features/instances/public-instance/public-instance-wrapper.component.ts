import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkflowInstance } from '../../../shared/models/types';

@Component({
  selector: 'app-public-instance-wrapper',
  template: `
    <div *ngIf="errorMsg" style="text-align:center;padding:80px 20px;min-height:100vh;background:var(--bg-app);max-width:1280px;margin:0 auto;">
      <div style="color:var(--text-tertiary);margin-bottom:16px;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
      <h2>{{ errorTitle }}</h2>
      <p style="color:var(--text-tertiary);margin-bottom:20px;">{{ errorMsg }}</p>
      <button class="btn btn-primary" *ngIf="!auth.isAuthenticated" (click)="auth.login()">Login to Continue</button>
      <a class="btn btn-outline" *ngIf="auth.isAuthenticated" routerLink="/dashboard">Go to Dashboard</a>
    </div>

    <app-instance-detail *ngIf="instance"
      [instance]="instance" [standalone]="true"
      style="display:block;max-width:1280px;margin:0 auto;padding:24px 32px;">
    </app-instance-detail>
  `,
})
export class PublicInstanceWrapperComponent implements OnInit {
  instance?: WorkflowInstance;
  errorTitle = '';
  errorMsg = '';

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.params['token'];
    this.api.getPublicInstance(token).subscribe({
      next: (inst) => {
        this.instance = inst;
        this.errorMsg = '';
      },
      error: (err) => {
        if (err.status === 401) {
          this.errorTitle = 'Login Required';
          this.errorMsg = 'Please log in to view this workflow instance.';
        } else if (err.status === 403) {
          this.errorTitle = 'Access Denied';
          this.errorMsg = err.error?.message || 'You do not have permission to view this workflow instance.';
        } else if (err.status === 404) {
          this.errorTitle = 'Not Found';
          this.errorMsg = 'This workflow instance does not exist or the link is invalid.';
        } else {
          this.errorTitle = 'Error';
          this.errorMsg = 'Something went wrong. Please try again later.';
        }
      }
    });
  }
}
