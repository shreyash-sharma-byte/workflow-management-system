import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/auth.service';
import {
  WorkflowInstance, TaskExecution, HistoryEntry,
  DocumentInfo, AllowedTransitions,
} from '../../../shared/models/types';

@Component({
  selector: 'app-instance-detail',
  template: `
    <div *ngIf="instance">
      <div class="flex-between mb-1">
        <div>
          <h2>{{ instance.reference }}: {{ instance.title }}</h2>
          <p class="text-muted">
            Template: {{ instance.template_name }} {{ instance.version_label }}
            | Initiated by {{ instance.initiated_by_info?.full_name }}
          </p>
        </div>
        <span class="badge" [class]="instance.status === 'ACTIVE' ? 'badge-info' : instance.status === 'COMPLETED' ? 'badge-success' : 'badge-danger'">
          {{ instance.status }}
        </span>
      </div>

      <!-- Progress Tracker -->
      <div class="card mb-1">
        <div class="progress-tracker" *ngIf="instance.progress">
          <ng-container *ngFor="let s of instance.progress.stations; let last = last">
            <div class="progress-step">
              <div class="progress-dot" [class.completed]="s.status === 'COMPLETED'" [class.current]="s.status === 'CURRENT'">
                {{ s.status === 'COMPLETED' ? '✓' : s.status === 'CURRENT' ? '📍' : '' }}
              </div>
              <small>{{ s.station.name }}</small>
            </div>
            <div *ngIf="!last" class="progress-line" [class.completed]="s.status === 'COMPLETED'"></div>
          </ng-container>
        </div>
        <div *ngIf="instance.current_station_info" class="text-sm text-muted">
          Current: {{ instance.current_station_info.name }}
          | Allowed roles: {{ roleNames() }}
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <div class="tab" [class.active]="activeTab === 'tasks'" (click)="setTab('tasks')">📋 Tasks</div>
        <div class="tab" [class.active]="activeTab === 'documents'" (click)="setTab('documents')">📎 Documents</div>
        <div class="tab" [class.active]="activeTab === 'log'" (click)="setTab('log')">📜 Audit Log</div>
      </div>

      <!-- Tasks Tab -->
      <div *ngIf="activeTab === 'tasks'">
        <div class="card" *ngFor="let t of tasks">
          <div class="flex-between">
            <div>
              <strong>{{ t.task_definition.name }}</strong>
              <span class="badge badge-neutral" style="margin-left:0.5rem;">{{ t.task_definition.task_type }}</span>
              <span *ngIf="t.task_definition.is_required" class="badge badge-danger" style="margin-left:0.25rem;">Required</span>
              <br><small class="text-muted">{{ t.task_definition.description }}</small>
            </div>
            <div class="flex gap-05" style="align-items:center;">
              <span class="badge" [class]="t.status === 'COMPLETED' ? 'badge-success' : t.status === 'IN_PROGRESS' ? 'badge-warning' : 'badge-neutral'">{{ t.status }}</span>
              <button *ngIf="canAct && t.status !== 'COMPLETED'" class="btn btn-primary btn-sm" (click)="selectedTask = t">
                {{ t.status === 'PENDING' ? 'Execute' : 'Continue' }}
              </button>
            </div>
          </div>
          <!-- Task response display -->
          <div *ngIf="t.status === 'COMPLETED' && t.response_data" class="mt-1 text-sm" style="background:#f8fafc;padding:0.5rem;border-radius:var(--radius);">
            <div *ngFor="let item of t.response_data | keyvalue">
              <strong>{{ item.key }}:</strong> {{ item.value }}
            </div>
            <div *ngIf="t.documents_info?.length">
              📎 {{ t.documents_info.length }} file(s): {{ joinFileNames(t.documents_info) }}
            </div>
          </div>
        </div>
        <div *ngIf="!tasks?.length" class="text-muted text-center" style="padding:2rem;">No tasks at this station.</div>
      </div>

      <!-- Documents Tab -->
      <div *ngIf="activeTab === 'documents'">
        <div class="card">
          <div class="card-header">Document Trail ({{ documents.length }})</div>
          <table class="table" *ngIf="documents.length">
            <thead><tr><th>File</th><th>Station</th><th>Uploaded By</th><th>Date</th></tr></thead>
            <tbody>
              <tr *ngFor="let d of documents">
                <td>📄 {{ d.original_filename }} <small class="text-muted">({{ d.file_size_display }})</small></td>
                <td>{{ d.station.name }}</td>
                <td>{{ d.uploaded_by.full_name }}</td>
                <td class="text-sm">{{ d.uploaded_at | date:'short' }}</td>
              </tr>
            </tbody>
          </table>
          <div *ngIf="!documents.length" class="text-muted text-sm">No documents uploaded.</div>
        </div>
      </div>

      <!-- Audit Log Tab -->
      <div *ngIf="activeTab === 'log'">
        <div class="card">
          <div class="card-header">Audit Log ({{ history.length }}) <small class="text-muted">— immutable</small></div>
          <table class="table" *ngIf="history.length">
            <thead><tr><th>#</th><th>Timestamp</th><th>Action</th><th>By</th><th>Details</th></tr></thead>
            <tbody>
              <tr *ngFor="let h of history; let i = index">
                <td>{{ rowNumber(i) }}</td>
                <td class="text-sm">{{ h.timestamp | date:'short' }}</td>
                <td><span class="badge badge-info">{{ h.action }}</span></td>
                <td>{{ h.action_by_name }}</td>
                <td class="text-sm">
                  <ng-container [ngSwitch]="h.action">
                    <span *ngSwitchCase="'MOVED'">{{ h.from_station_name }} → {{ h.to_station_name }}</span>
                    <span *ngSwitchCase="'TASK_COMPLETED'">{{ h.task_name }}</span>
                    <span *ngSwitchCase="'INSTANCE_CREATED'">Created</span>
                    <span *ngSwitchDefault>{{ h.remarks }}</span>
                  </ng-container>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Move Section -->
      <div class="card mt-1" *ngIf="canAct && instance.status === 'ACTIVE' && transitions">
        <div class="card-header">
          Move Workflow
          <span *ngIf="!transitions.can_move" class="badge badge-warning">{{ transitions.blocked_reason }}</span>
        </div>
        <div class="flex gap-1">
          <button *ngFor="let t of transitions.transitions"
                  class="btn" [class.btn-success]="isForwardTransition(t)" [class.btn-danger]="isRejectTransition(t)"
                  [disabled]="t.disabled" (click)="moveWorkflow(t.to_station.id)">
            {{ t.label || ('Move to ' + t.to_station.name) }}
          </button>
        </div>
        <div *ngIf="moveMsg" class="mt-1" [style.color]="moveError ? 'var(--danger)' : 'var(--success)'">{{ moveMsg }}</div>
      </div>
    </div>

    <!-- Task Execution Modal (simplified inline) -->
    <app-task-execution
      *ngIf="selectedTask && instance"
      [task]="selectedTask"
      [instanceId]="instance.id"
      (closed)="onTaskClosed()">
    </app-task-execution>
  `,
})
export class InstanceDetailComponent implements OnInit {
  instance?: WorkflowInstance;
  tasks: TaskExecution[] = [];
  history: HistoryEntry[] = [];
  documents: DocumentInfo[] = [];
  transitions?: AllowedTransitions;
  activeTab = 'tasks';
  selectedTask?: TaskExecution;
  moveMsg = '';
  moveError = false;

  constructor(public auth: AuthService, private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit(): void { this.route.params.subscribe(p => this.loadInstance(+p['id'])); }

  loadInstance(id: number): void {
    this.api.getInstance(id).subscribe(i => {
      this.instance = i;
      this.canAct = i.user_permissions?.can_execute_tasks ?? false;
      this.loadTasks(id);
      this.loadAllowedTransitions(id);
    });
  }

  canAct = false;

  loadTasks(instanceId: number): void {
    this.api.listInstanceTasks(instanceId).subscribe(r => this.tasks = r.results);
  }

  loadHistory(): void {
    if (this.instance) this.api.listHistory(this.instance.id).subscribe(r => this.history = r.results);
  }

  loadDocuments(): void {
    if (this.instance) this.api.listDocuments(this.instance.id).subscribe(r => this.documents = r.results);
  }

  loadAllowedTransitions(id: number): void {
    this.api.getAllowedTransitions(id).subscribe(r => this.transitions = r);
  }

  moveWorkflow(toStationId: number): void {
    if (!this.instance) return;
    this.moveError = false;
    this.api.moveInstance(this.instance.id, toStationId, '').subscribe({
      next: (r) => {
        this.moveMsg = r.message;
        setTimeout(() => this.loadInstance(this.instance!.id), 1000);
      },
      error: (e) => { this.moveMsg = e.error?.message || 'Move failed'; this.moveError = true; },
    });
  }

  refresh(): void {
    if (this.instance) this.loadInstance(this.instance.id);
  }

  onTaskClosed(): void {
    this.selectedTask = undefined;
    this.refresh();
  }

  isForwardTransition(t: any): boolean {
    return !(t.label || '').toLowerCase().includes('reject');
  }

  isRejectTransition(t: any): boolean {
    return (t.label || '').toLowerCase().includes('reject');
  }

  joinFileNames(docs: any[]): string {
    return docs.map((d: any) => d.original_filename).join(', ');
  }

  rowNumber(index: number): number {
    return (this.history?.length || 0) - index;
  }

  setTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'documents') this.loadDocuments();
    if (tab === 'log') this.loadHistory();
  }

  roleNames(): string {
    return this.instance?.current_station_info?.allowed_roles?.map(r => r.name).join(', ') || 'All';
  }
}
