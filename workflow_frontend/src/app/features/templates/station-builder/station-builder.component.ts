import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Station, Role } from '../../../shared/models/types';

@Component({
  selector: 'app-station-builder',
  template: `
    <h2>Configure Stations</h2>
    <p class="text-muted mb-1">Template ID: {{ templateId }}</p>

    <div class="card mb-1" style="max-width:500px;">
      <div class="card-header">Add Station</div>
      <div class="form-group">
        <label class="form-label">Name *</label>
        <input class="form-input" [(ngModel)]="newName" placeholder="e.g., QA Testing">
      </div>
      <div class="form-group">
        <label class="form-label">Type</label>
        <select class="form-select" [(ngModel)]="newType">
          <option value="NORMAL">Normal</option>
          <option value="START">Start</option>
          <option value="END">End</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input class="form-input" [(ngModel)]="newDesc">
      </div>
      <button class="btn btn-primary" (click)="addStation()" [disabled]="!newName">Add Station</button>
    </div>

    <div class="card">
      <div class="card-header">Current Stations ({{ stations.length }})</div>
      <div *ngFor="let s of stations" class="flex-between" style="padding:0.75rem 0;border-bottom:1px solid var(--border);">
        <div>
          <strong>{{ s.name }}</strong>
          <span class="badge" [class]="s.station_type === 'START' ? 'badge-info' : s.station_type === 'END' ? 'badge-danger' : 'badge-neutral'" style="margin-left:0.5rem;">
            {{ s.station_type }}
          </span>
          <br><small class="text-muted">{{ s.description }}</small>
          <br><small class="text-muted">Tasks: {{ s.task_count || 0 }} | Roles: {{ s.allowed_roles?.length || 0 }}</small>
        </div>
        <button class="btn btn-outline btn-sm" (click)="deleteStation(s.id)">🗑</button>
      </div>
    </div>

    <button class="btn btn-outline mt-1" [routerLink]="['/templates', templateId]">← Back to Template</button>
  `,
})
export class StationBuilderComponent implements OnInit {
  templateId = 0;
  stations: Station[] = [];
  roles: Role[] = [];
  newName = '';
  newType = 'NORMAL';
  newDesc = '';

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.templateId = +this.route.snapshot.params['id'];
    this.load();
  }

  load(): void {
    this.api.listStations(this.templateId).subscribe(r => this.stations = r.results);
  }

  addStation(): void {
    this.api.createStation(this.templateId, {
      name: this.newName, station_type: this.newType,
      description: this.newDesc, order: this.stations.length + 1,
    }).subscribe(() => {
      this.newName = ''; this.newDesc = ''; this.load();
    });
  }

  deleteStation(id: number): void {
    if (confirm('Delete this station?')) {
      this.api.deleteStation(this.templateId, id).subscribe(() => this.load());
    }
  }
}
