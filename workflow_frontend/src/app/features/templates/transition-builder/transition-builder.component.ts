import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Station, TransitionDetail } from '../../../shared/models/types';

@Component({
  selector: 'app-transition-builder',
  template: `
    <h2>Configure Transitions</h2>
    <p class="text-muted mb-1">Define allowed movement between stations.</p>

    <div class="card mb-1" style="max-width:500px;">
      <div class="card-header">Add Transition</div>
      <div class="form-group">
        <label class="form-label">From Station</label>
        <select class="form-select" [(ngModel)]="fromStation">
          <option *ngFor="let s of stations" [value]="s.id">{{ s.name }} ({{ s.station_type }})</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">To Station</label>
        <select class="form-select" [(ngModel)]="toStation">
          <option *ngFor="let s of stations" [value]="s.id">{{ s.name }} ({{ s.station_type }})</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Label (optional)</label>
        <input class="form-input" [(ngModel)]="newLabel" placeholder="e.g., Approve, Reject, Send Back">
      </div>
      <button class="btn btn-primary" (click)="addTransition()" [disabled]="!fromStation || !toStation || fromStation === toStation">
        Add Transition
      </button>
    </div>

    <div class="card">
      <div class="card-header">Current Transitions ({{ transitions.length }})</div>
      <div *ngFor="let t of transitions" class="flex-between" style="padding:0.5rem 0;border-bottom:1px solid var(--border);">
        <span>{{ t.from_station.name }} → {{ t.to_station.name }}
          <span *ngIf="t.label" class="badge badge-info" style="margin-left:0.5rem;">{{ t.label }}</span>
        </span>
        <button class="btn btn-outline btn-sm" (click)="deleteTransition(t.id)">🗑</button>
      </div>
    </div>

    <button class="btn btn-outline mt-1" [routerLink]="['/templates', templateId]">← Back to Template</button>
  `,
})
export class TransitionBuilderComponent implements OnInit {
  templateId = 0;
  stations: Station[] = [];
  transitions: TransitionDetail[] = [];
  fromStation: number | null = null;
  toStation: number | null = null;
  newLabel = '';

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.templateId = +this.route.snapshot.params['id'];
    this.load();
  }

  load(): void {
    this.api.listStations(this.templateId).subscribe(r => this.stations = r.results);
    this.api.listTransitions(this.templateId).subscribe(r => this.transitions = r.results);
  }

  addTransition(): void {
    this.api.createTransition(this.templateId, {
      from_station: this.fromStation, to_station: this.toStation, label: this.newLabel,
    }).subscribe(() => {
      this.newLabel = ''; this.load();
    });
  }

  deleteTransition(id: number): void {
    this.api.deleteTransition(this.templateId, id).subscribe(() => this.load());
  }
}
