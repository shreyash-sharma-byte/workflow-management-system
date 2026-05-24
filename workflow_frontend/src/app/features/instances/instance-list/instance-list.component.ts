import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkflowInstance } from '../../../shared/models/types';

@Component({
  selector: 'app-instance-list',
  template: `
    <div class="flex-between mb-1">
      <h2>Workflow Instances</h2>
      <a *ngIf="auth.isInitiator" class="btn btn-success" routerLink="/instances/new">+ New Instance</a>
    </div>

    <div class="flex gap-1 mb-1">
      <select class="form-select" style="width:auto;" [(ngModel)]="statusFilter" (change)="load()">
        <option value="">All Status</option>
        <option value="ACTIVE">Active</option>
        <option value="COMPLETED">Completed</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
      <input class="form-input" style="width:250px;" [(ngModel)]="search" (input)="load()" placeholder="Search reference or title...">
    </div>

    <div class="card">
      <table class="table">
        <thead><tr><th>Ref</th><th>Title</th><th>Template</th><th>Station</th><th>Status</th><th>Updated</th></tr></thead>
        <tbody>
          <tr *ngFor="let i of instances" [routerLink]="['/instances', i.id]" style="cursor:pointer;">
            <td><strong>{{ i.reference }}</strong></td>
            <td>{{ i.title }}</td>
            <td>{{ i.template_name }}</td>
            <td>{{ i.current_station_name }}</td>
            <td><span class="badge" [class]="i.status === 'ACTIVE' ? 'badge-info' : i.status === 'COMPLETED' ? 'badge-success' : 'badge-danger'">{{ i.status }}</span></td>
            <td class="text-sm text-muted">{{ i.updated_at | date:'short' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
})
export class InstanceListComponent implements OnInit {
  instances: WorkflowInstance[] = [];
  statusFilter = '';
  search = '';

  constructor(public auth: AuthService, private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    const params: any = {};
    if (this.statusFilter) params.status = this.statusFilter;
    if (this.search) params.search = this.search;
    this.api.listInstances(params).subscribe(r => this.instances = r.results);
  }
}
