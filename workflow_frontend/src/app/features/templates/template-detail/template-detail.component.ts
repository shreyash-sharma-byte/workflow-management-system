import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkflowTemplate, Station, TransitionDetail } from '../../../shared/models/types';

@Component({
  selector: 'app-template-detail',
  template: `
    <div *ngIf="template">
      <!-- Header -->
      <div class="flex justify-between items-start mb-6">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-1">
            <h1 class="page-title" style="margin-bottom:0;">{{ template.name }}</h1>
            <span class="badge" [class.badge-success]="template.status==='PUBLISHED'"
                  [class.badge-warning]="template.status==='DRAFT'">
              {{ template.status }}
            </span>
            <span class="badge badge-neutral" *ngIf="template.current_version_info">
              {{ template.current_version_info.version_label }}
            </span>
          </div>
          <p class="text-md text-secondary">{{ template.description }}</p>
          <p class="text-sm text-muted mt-1">
            {{ template.category || 'General' }} · {{ template.station_count }} stations ·
            {{ template.instance_count }} instances · Created {{ template.created_at | date:'mediumDate' }}
          </p>
        </div>
        <a class="btn btn-outline btn-sm" routerLink="/templates">← All Templates</a>
      </div>

      <!-- Admin Actions (elevated, contextual) -->
      <div class="card mb-4" *ngIf="auth.isAdmin" style="border-left:4px solid var(--primary);">
        <div class="card-body" style="padding:var(--space-4) var(--space-5);">
          <div class="flex justify-between items-center">
            <div>
              <span class="font-semibold text-md">Template Administration</span>
              <p class="text-xs text-muted mt-1">
                <ng-container *ngIf="template.status === 'DRAFT'">
                  Configure stations, tasks, and transitions. Publish when ready.
                </ng-container>
                <ng-container *ngIf="template.status === 'PUBLISHED' && !template.has_draft">
                  This template is live. Create a draft to make changes.
                </ng-container>
                <ng-container *ngIf="template.has_draft">
                  A draft version is already in progress.
                </ng-container>
              </p>
            </div>
            <div class="flex gap-2">
              <ng-container *ngIf="template.status === 'DRAFT'">
                <a class="btn btn-secondary btn-sm" [routerLink]="['/templates', template.id, 'stations']">
                  Edit Stations
                </a>
                <a class="btn btn-secondary btn-sm" [routerLink]="['/templates', template.id, 'transitions']">
                  Edit Transitions
                </a>
                <button class="btn btn-success btn-sm" (click)="publish()">
                  Publish Template
                </button>
              </ng-container>
              <ng-container *ngIf="template.status === 'PUBLISHED' && !template.has_draft">
                <button class="btn btn-outline btn-sm" (click)="createDraft()">
                  Create New Draft
                </button>
              </ng-container>
            </div>
          </div>
          <div *ngIf="publishMsg" class="mt-2 text-sm text-success">{{ publishMsg }}</div>
          <div *ngIf="publishError" class="mt-2 text-sm text-danger">{{ publishError }}</div>
        </div>
      </div>

      <!-- Two Column: Stations + Transitions -->
      <div class="grid-2">
        <!-- Stations Card -->
        <div class="card">
          <div class="card-header">
            Stations · {{ stations.length }}
            <a *ngIf="auth.isAdmin" class="btn btn-primary btn-xs"
               [routerLink]="['/templates', template.id, 'stations']">Manage</a>
          </div>
          <div class="card-body-flush">
            <div *ngIf="stations.length === 0" class="p-5 text-center text-sm text-muted">
              No stations defined yet. Add START and END stations to begin.
            </div>
            <div *ngFor="let s of stations; let last = last"
                 class="flex justify-between items-center"
                 style="padding:var(--space-3) var(--space-5);border-bottom:1px solid var(--border-light);"
                 [style.border-bottom]="last ? 'none' : ''">
              <div class="flex items-center gap-3">
                <span class="badge" [class.badge-info]="s.station_type==='START'"
                      [class.badge-danger]="s.station_type==='END'"
                      [class.badge-neutral]="s.station_type==='NORMAL'">
                  {{ s.station_type }}
                </span>
                <div>
                  <div class="font-medium text-sm">{{ s.name }}</div>
                  <div class="text-xs text-muted" *ngIf="s.description">{{ s.description }}</div>
                </div>
              </div>
              <div class="text-xs text-muted">
                {{ s.task_count || 0 }} tasks · {{ s.outgoing_transition_count || 0 }} outgoing
              </div>
            </div>
          </div>
        </div>

        <!-- Transitions Card -->
        <div class="card">
          <div class="card-header">
            Transitions · {{ transitions.length }}
            <a *ngIf="auth.isAdmin" class="btn btn-primary btn-xs"
               [routerLink]="['/templates', template.id, 'transitions']">Manage</a>
          </div>
          <div class="card-body-flush">
            <div *ngIf="transitions.length === 0" class="p-5 text-center text-sm text-muted">
              No transitions defined. Connect stations to create workflow paths.
            </div>
            <div *ngFor="let t of transitions; let last = last"
                 class="flex items-center gap-2"
                 style="padding:var(--space-3) var(--space-5);border-bottom:1px solid var(--border-light);"
                 [style.border-bottom]="last ? 'none' : ''">
              <span class="text-sm font-medium">{{ t.from_station.name }}</span>
              <span class="text-xs text-muted">→</span>
              <span class="text-sm font-medium">{{ t.to_station.name }}</span>
              <span *ngIf="t.label" class="badge badge-info badge-sm">{{ t.label }}</span>
            </div>
          </div>
        </div>
      </div>
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
    this.publishMsg = 'Publishing...';
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
