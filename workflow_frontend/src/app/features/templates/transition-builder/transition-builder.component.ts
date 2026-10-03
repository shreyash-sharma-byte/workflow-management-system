import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Station, TransitionDetail, WorkflowTemplate } from '../../../shared/models/types';

@Component({
  selector: 'app-transition-builder',
  template: `
    <!-- ═══ TEMPLATE CONTEXT BAR ═══ -->
    <div class="card mb-4" style="border-left:4px solid var(--primary);">
      <div class="card-body" style="padding:var(--space-4) var(--space-5);">
        <div class="flex items-center gap-2 mb-2">
          <a class="text-sm text-muted" routerLink="/templates" style="text-decoration:none;">Templates</a>
          <span class="text-sm text-muted">/</span>
          <a class="text-sm" [routerLink]="['/templates', templateId]" style="text-decoration:none;color:var(--primary);font-weight:500;">
            {{ templateName || 'Template #' + templateId }}
          </a>
          <span class="text-sm text-muted">/</span>
          <span class="text-sm font-semibold text-primary">Transitions</span>
          <span class="badge ml-2" [class.badge-success]="templateStatus==='PUBLISHED'" [class.badge-warning]="templateStatus==='DRAFT'">
            {{ templateStatus || 'DRAFT' }}
          </span>
        </div>
        <div class="flex justify-between items-center toolbar">
          <div>
            <h3 style="margin:0;">{{ templateName || 'Loading...' }}</h3>
            <p class="text-xs text-muted mt-1" *ngIf="templateDesc">{{ templateDesc }}</p>
          </div>
          <div class="flex gap-2">
            <a class="btn btn-outline btn-sm" [routerLink]="['/templates', templateId, 'stations']">
              Switch to Stations
            </a>
            <a class="btn btn-secondary btn-sm" [routerLink]="['/templates', templateId]">
              Template Overview
            </a>
          </div>
        </div>
      </div>
    </div>

    <div class="grid detail-grid">

      <!-- LEFT: Add Transition + List -->
      <div>
        <!-- Add Transition Form -->
        <div class="card mb-4">
          <div class="card-header">Add New Transition</div>
          <div class="card-body">
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">From Station <span class="required">*</span></label>
                <select class="form-select" [(ngModel)]="fromStation">
                  <option [ngValue]="null" disabled>Select source station...</option>
                  <option *ngFor="let s of stations" [value]="s.id">
                    {{ s.name }} ({{ s.station_type }})
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">To Station <span class="required">*</span></label>
                <select class="form-select" [(ngModel)]="toStation">
                  <option [ngValue]="null" disabled>Select destination station...</option>
                  <option *ngFor="let s of stations" [value]="s.id">
                    {{ s.name }} ({{ s.station_type }})
                  </option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Label <span class="text-xs text-muted">— describes the action (e.g., Approve, Reject)</span></label>
              <input class="form-input" [(ngModel)]="newLabel" placeholder="e.g., Approve, Reject, Send for Review">
            </div>
            <div *ngIf="fromStation && toStation && fromStation === toStation" class="text-sm text-danger mb-3">
              Cannot create a self-transition. Select different stations.
            </div>
            <button class="btn btn-primary" (click)="addTransition()"
                    [disabled]="!fromStation || !toStation || fromStation === toStation">
              Add Transition
            </button>
          </div>
        </div>

        <!-- Existing Transitions -->
        <div class="card">
          <div class="card-header">
            All Transitions · {{ transitions.length }}
            <span class="text-xs text-muted font-normal" *ngIf="transitions.length === 0">
              Connect stations to define workflow paths
            </span>
          </div>
          <div class="card-body-flush">
            <div *ngIf="transitions.length === 0" class="empty-state">
              <div class="empty-state-title">No transitions defined</div>
              <div class="empty-state-desc">Create transitions to connect stations and define how work flows between them.</div>
            </div>
            <div *ngFor="let t of transitions; let last = last"
                 class="flex justify-between items-center"
                 style="padding:var(--space-3) var(--space-5);border-bottom:1px solid var(--border-light);"
                 [style.border-bottom]="last ? 'none' : ''">
              <div class="flex items-center gap-2">
                <span class="badge badge-neutral">{{ t.from_station.name }}</span>
                <span class="text-xs text-muted">to</span>
                <span class="badge badge-neutral">{{ t.to_station.name }}</span>
                <span *ngIf="t.label" class="badge badge-info">{{ t.label }}</span>
              </div>
              <button class="btn btn-ghost btn-sm" (click)="doDeleteTransition(t.id)" style="color:var(--danger);">
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT: Station Reference Panel -->
      <div>
        <div class="card mb-3">
          <div class="card-header">Available Stations · {{ stations.length }}</div>
          <div class="card-body-flush">
            <div *ngIf="stations.length === 0" class="p-4 text-sm text-muted text-center">
              No stations exist yet.
              <a [routerLink]="['/templates', templateId, 'stations']" style="color:var(--primary);">Create stations first</a>
            </div>
            <div *ngFor="let s of stations; let last = last"
                 class="flex items-center gap-2"
                 style="padding:var(--space-2) var(--space-4);border-bottom:1px solid var(--border-light);"
                 [style.border-bottom]="last ? 'none' : ''">
              <span class="badge badge-sm" [class.badge-info]="s.station_type==='START'"
                    [class.badge-danger]="s.station_type==='END'"
                    [class.badge-neutral]="s.station_type==='NORMAL'">
                {{ s.station_type }}
              </span>
              <span class="text-sm font-medium">{{ s.name }}</span>
            </div>
          </div>
        </div>

        <!-- Quick tip card -->
        <div class="card" style="background:var(--primary-light);border-color:var(--primary-light);">
          <div class="card-body" style="padding:var(--space-4);">
            <div class="text-sm font-semibold mb-1" style="color:var(--primary);">Tip</div>
            <p class="text-xs" style="color:var(--primary-dark);">
              Transitions define how work moves between stations.
              Use labels like "Approve" and "Reject" to create branching paths.
              A station can have multiple outgoing transitions.
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class TransitionBuilderComponent implements OnInit {
  templateId = 0;
  templateName = '';
  templateDesc = '';
  templateStatus = '';
  stations: Station[] = [];
  transitions: TransitionDetail[] = [];
  fromStation: number | null = null;
  toStation: number | null = null;
  newLabel = '';

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.templateId = +this.route.snapshot.params['id'];
    this.loadTemplate();
    this.load();
  }

  loadTemplate(): void {
    this.api.getTemplate(this.templateId).subscribe(t => {
      this.templateName = t.name;
      this.templateDesc = t.description;
      this.templateStatus = t.status;
    });
  }

  load(): void {
    this.api.listStations(this.templateId).subscribe(r => this.stations = r.results);
    this.api.listTransitions(this.templateId).subscribe(r => this.transitions = r.results);
  }

  addTransition(): void {
    this.api.createTransition(this.templateId, {
      from_station: this.fromStation, to_station: this.toStation, label: this.newLabel,
    }).subscribe(() => {
      this.newLabel = ''; this.fromStation = null; this.toStation = null; this.load();
    });
  }

  deleteTransition(id: number): void {
    if (confirm('Delete this transition?')) {
      this.api.deleteTransition(this.templateId, id).subscribe(() => this.load());
    }
  }

  doDeleteTransition(id: number): void { this.deleteTransition(id); }
}
