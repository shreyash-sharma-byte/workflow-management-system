import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { WorkflowTemplate } from '../../../shared/models/types';

@Component({
  selector: 'app-template-create',
  template: `
    <h2 class="mb-2">Create New Workflow Template</h2>
    <div class="card max-w-md">
      <div class="card-body">
      <div class="form-group">
        <label class="form-label">Template Name *</label>
        <input class="form-input" [(ngModel)]="name" placeholder="e.g., SDLC Workflow">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" [(ngModel)]="description" placeholder="Describe the workflow purpose..."></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Category</label>
        <input class="form-input" [(ngModel)]="category" placeholder="e.g., Software Development">
      </div>
      <div class="flex gap-1">
        <button class="btn btn-primary" (click)="create()" [disabled]="!name">Create Template</button>
        <button class="btn btn-outline" routerLink="/templates">Cancel</button>
      </div>
      <div *ngIf="created" class="mt-1" style="color:var(--success);">
        ✅ Template created! <a [routerLink]="['/templates', created.id]">Open it →</a>
      </div>
      </div>
    </div>
  `,
})
export class TemplateCreateComponent {
  name = '';
  description = '';
  category = '';
  created?: WorkflowTemplate;

  constructor(private api: ApiService, private router: Router) {}

  create(): void {
    this.api.createTemplate({ name: this.name, description: this.description, category: this.category })
      .subscribe(t => { this.created = t; this.router.navigate(['/templates', t.id]); });
  }
}
