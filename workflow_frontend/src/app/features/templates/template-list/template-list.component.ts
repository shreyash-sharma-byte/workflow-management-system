import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkflowTemplate } from '../../../shared/models/types';

@Component({
  selector: 'app-template-list',
  template: `
    <div class="flex-between mb-1">
      <h2>Workflow Templates</h2>
      <a *ngIf="auth.isAdmin" class="btn btn-primary" routerLink="/templates/new">+ Create Template</a>
    </div>

    <div class="card">
      <table class="table">
        <thead>
          <tr><th>Name</th><th>Category</th><th>Status</th><th>Stations</th><th>Instances</th><th>Created</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let t of templates" [routerLink]="['/templates', t.id]" style="cursor:pointer;">
            <td><strong>{{ t.name }}</strong><br><small class="text-muted">{{ t.description }}</small></td>
            <td>{{ t.category }}</td>
            <td><span class="badge" [class]="t.status === 'PUBLISHED' ? 'badge-success' : 'badge-warning'">{{ t.status }}</span></td>
            <td>{{ t.station_count }}</td>
            <td>{{ t.instance_count }}</td>
            <td class="text-sm text-muted">{{ t.created_at | date:'short' }}</td>
          </tr>
        </tbody>
      </table>
      <div *ngIf="!templates?.length" class="text-center text-muted" style="padding:2rem;">No templates yet.</div>
    </div>
  `,
})
export class TemplateListComponent implements OnInit {
  templates: WorkflowTemplate[] = [];

  constructor(public auth: AuthService, private api: ApiService) {}

  ngOnInit(): void {
    this.api.listTemplates().subscribe(res => this.templates = res.results);
  }
}
