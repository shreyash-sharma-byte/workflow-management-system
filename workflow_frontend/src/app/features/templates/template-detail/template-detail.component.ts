import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkflowTemplate, Station, TransitionDetail } from '../../../shared/models/types';

@Component({
  selector: 'app-template-detail',
  template: `
    <div *ngIf="template">
      <div class="flex-between mb-1">
        <div>
          <h2>{{ template.name }}</h2>
          <p class="text-muted">{{ template.description }}</p>
        </div>
        <div class="flex gap-05">
          <span class="badge" [class]="template.status === 'PUBLISHED' ? 'badge-success' : 'badge-warning'">
            {{ template.status }}
          </span>
          <span class="badge badge-neutral" *ngIf="template.current_version_info">
            {{ template.current_version_info.version_label }}
          </span>
        </div>
      </div>

      <div class="grid-2 mb-1">
        <div class="card">
          <div class="card-header">
            Stations ({{ stations.length }})
            <a *ngIf="auth.isAdmin" class="btn btn-primary btn-sm" [routerLink]="['/templates', template.id, 'stations']">
              + Add Station
            </a>
          </div>
          <div *ngFor="let s of stations" class="flex-between" style="padding:0.5rem 0;border-bottom:1px solid var(--border);">
            <div>
              <strong>{{ s.name }}</strong>
              <span class="badge badge-neutral" style="margin-left:0.5rem;">{{ s.station_type }}</span>
              <br><small class="text-muted">{{ s.description }}</small>
            </div>
            <div class="text-sm text-muted">{{ s.task_count || 0 }} tasks</div>
          </div>
          <div *ngIf="!stations.length" class="text-muted text-sm">No stations yet. Add at least one START and one END.</div>
        </div>

        <div class="card">
          <div class="card-header">
            Transitions ({{ transitions.length }})
            <a *ngIf="auth.isAdmin" class="btn btn-primary btn-sm" [routerLink]="['/templates', template.id, 'transitions']">
              + Add
            </a>
          </div>
          <div *ngFor="let t of transitions" style="padding:0.4rem 0;border-bottom:1px solid var(--border);font-size:0.875rem;">
            {{ t.from_station.name }} → {{ t.to_station.name }}
            <span *ngIf="t.label" class="badge badge-info" style="margin-left:0.5rem;">{{ t.label }}</span>
          </div>
          <div *ngIf="!transitions.length" class="text-muted text-sm">No transitions defined.</div>
        </div>
      </div>

      <!-- Admin Actions -->
      <div class="flex gap-1" *ngIf="auth.isAdmin">
        <button class="btn btn-primary" (click)="publish()" *ngIf="template.status !== 'PUBLISHED'">
          🚀 Publish Template
        </button>
        <button class="btn btn-outline" (click)="createDraft()" *ngIf="template.status === 'PUBLISHED' && !template.has_draft">
          ✏️ Create New Draft
        </button>
      </div>

      <div *ngIf="publishMsg" class="mt-1" style="color:var(--success);">{{ publishMsg }}</div>
      <div *ngIf="publishError" class="mt-1" style="color:var(--danger);">{{ publishError }}</div>
    </div>
  `,
})
export class TemplateDetailComponent implements OnInit {
  template?: WorkflowTemplate;
  stations: Station[] = [];
  transitions: TransitionDetail[] = [];
  publishMsg = '';
  publishError = '';

  constructor(public auth: AuthService, private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = +params['id'];
      this.api.getTemplate(id).subscribe(t => {
        this.template = t;
        this.loadChildren(id);
      });
    });
  }

  loadChildren(templateId: number): void {
    this.api.listStations(templateId).subscribe(r => this.stations = r.results);
    this.api.listTransitions(templateId).subscribe(r => this.transitions = r.results);
  }

  publish(): void {
    if (!this.template) return;
    this.publishError = '';
    this.api.publishTemplate(this.template.id, 'Published').subscribe({
      next: (r) => { this.publishMsg = r.message; this.ngOnInit(); },
      error: (e) => this.publishError = e.error?.message || 'Publish failed',
    });
  }

  createDraft(): void {
    if (!this.template) return;
    this.api.createDraft(this.template.id, 'New draft for editing').subscribe({
      next: () => this.ngOnInit(),
    });
  }
}
