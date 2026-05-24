import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { WorkflowTemplate } from '../../../shared/models/types';

@Component({
  selector: 'app-instance-create',
  template: `
    <h2>Initiate New Workflow Instance</h2>
    <div class="card" style="max-width:600px;">
      <div class="form-group">
        <label class="form-label">Select Template *</label>
        <select class="form-select" [(ngModel)]="templateId" (change)="onTemplateChange()">
          <option [ngValue]="null">-- Choose --</option>
          <option *ngFor="let t of templates" [ngValue]="t.id">{{ t.name }} {{ t.current_version_info?.version_label ? '(' + t.current_version_info.version_label + ')' : '' }}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Instance Title *</label>
        <input class="form-input" [(ngModel)]="title" placeholder="e.g., Auth Module Development">
      </div>
      <div class="form-group">
        <label class="form-label">Initial Data (JSON)</label>
        <textarea class="form-textarea" [(ngModel)]="jsonData" placeholder='{"project":"Auth","priority":"High"}'></textarea>
      </div>
      <div class="flex gap-1">
        <button class="btn btn-success" (click)="create()" [disabled]="!templateId || !title">Initiate Workflow</button>
        <button class="btn btn-outline" routerLink="/instances">Cancel</button>
      </div>
      <div *ngIf="error" class="mt-1" style="color:var(--danger);">{{ error }}</div>
    </div>
  `,
})
export class InstanceCreateComponent implements OnInit {
  templates: WorkflowTemplate[] = [];
  templateId: number | null = null;
  title = '';
  jsonData = '{}';
  error = '';

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.api.listTemplates({ status: 'PUBLISHED' }).subscribe(r => this.templates = r.results);
  }

  onTemplateChange(): void { /* optional preview */ }

  create(): void {
    let data = {};
    try { data = JSON.parse(this.jsonData); } catch { this.error = 'Invalid JSON'; return; }

    this.api.createInstance({
      template_id: this.templateId, title: this.title, instance_data: data,
    }).subscribe({
      next: (inst) => this.router.navigate(['/instances', inst.id]),
      error: (e) => this.error = e.error?.message || 'Creation failed',
    });
  }
}
