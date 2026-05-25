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
      <!-- ═══ HEADER: Reference, Status, Meta ═══ -->
      <div class="flex justify-between items-start mb-4">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-1">
            <h1 class="page-title" style="margin-bottom:0;">{{ instance.reference }}</h1>
            <span class="badge" [class.badge-info]="instance.status==='ACTIVE'"
                  [class.badge-success]="instance.status==='COMPLETED'"
                  [class.badge-danger]="instance.status==='CANCELLED'"
                  style="font-size:var(--font-sm);padding:2px 10px;">
              {{ instance.status }}
            </span>
          </div>
          <p class="text-lg text-primary font-medium mb-1">{{ instance.title }}</p>
          <p class="text-sm text-muted">
            {{ instance.template_name }} · {{ instance.version_label }}
            · Initiated by <strong>{{ instance.initiated_by_info?.full_name }}</strong>
            · {{ instance.created_at | date:'mediumDate' }}
          </p>
        </div>
        <button class="btn btn-outline btn-sm" [routerLink]="['/instances']">← All Instances</button>
      </div>

      <!-- ═══ PROGRESS TRACKER ═══ -->
      <div class="card mb-4">
        <div class="card-body" style="padding:var(--space-4) var(--space-5);">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-semibold text-secondary">Workflow Progress</span>
            <span class="text-xs text-muted">
              {{ instance.progress?.completed_stations || 0 }}/{{ instance.progress?.total_stations || 0 }} stations
            </span>
          </div>
          <div class="progress-tracker" *ngIf="instance.progress?.stations?.length">
            <ng-container *ngFor="let s of instance.progress.stations; let last = last">
              <div class="progress-step" [class.current]="s.status==='CURRENT'" [class.completed]="s.status==='COMPLETED'">
                <div class="progress-dot" [class.completed]="s.status==='COMPLETED'"
                     [class.current]="s.status==='CURRENT'" [class.blocked]="s.status==='BLOCKED'">
                  <ng-container [ngSwitch]="s.status">
                    <span *ngSwitchCase="'COMPLETED'">✓</span>
                    <span *ngSwitchCase="'CURRENT'">◉</span>
                    <span *ngSwitchDefault>{{ s.station.order || '○' }}</span>
                  </ng-container>
                </div>
                <span class="progress-step-label">{{ s.station.name }}</span>
              </div>
              <div *ngIf="!last" class="progress-line" [class.completed]="s.status==='COMPLETED'"></div>
            </ng-container>
          </div>
          <!-- Current station info -->
          <div *ngIf="instance.current_station_info" class="flex items-center gap-3 mt-3 p-3"
               style="background:var(--primary-light);border-radius:var(--radius-md);">
            <span style="font-size:1rem;">📍</span>
            <div>
              <span class="text-sm font-semibold" style="color:var(--primary);">
                Current: {{ instance.current_station_info.name }}
              </span>
              <span class="text-xs text-muted" style="margin-left:8px;">
                Roles: {{ roleNames() }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ ACTION BAR: Move Workflow (ELEVATED — most important action) ═══ -->
      <div class="card mb-4" *ngIf="instance.status === 'ACTIVE' && transitions"
           style="border-left:4px solid var(--primary);">
        <div class="card-body" style="padding:var(--space-4) var(--space-5);">
          <div class="flex justify-between items-center">
            <div>
              <span class="font-semibold text-md">Move Workflow Forward</span>
              <span *ngIf="!transitions.can_move" class="badge badge-warning" style="margin-left:8px;">
                {{ transitions.blocked_reason }}
              </span>
              <span *ngIf="!canAct && instance.user_permissions?.reason_if_blocked" class="badge badge-neutral" style="margin-left:8px;">
                {{ instance.user_permissions.reason_if_blocked }}
              </span>
            </div>
            <div class="flex gap-2">
              <button *ngFor="let t of transitions.transitions"
                      class="btn"
                      [class.btn-success]="isForwardTransition(t)"
                      [class.btn-danger]="isRejectTransition(t)"
                      [class.btn-outline]="!isForwardTransition(t) && !isRejectTransition(t)"
                      [disabled]="t.disabled || !canAct"
                      (click)="moveWorkflow(t.to_station.id)"
                      [attr.data-tooltip]="t.disabled ? 'Not available' : null">
                {{ t.label || ('Move to ' + t.to_station.name) }}
              </button>
            </div>
          </div>
          <div *ngIf="moveMsg" class="mt-2 text-sm" [class.text-success]="!moveError" [class.text-danger]="moveError">
            {{ moveMsg }}
          </div>
        </div>
      </div>

      <!-- ═══ TWO-COLUMN LAYOUT: Tasks + Sidebar ═══ -->
      <div class="grid" style="grid-template-columns:1fr 320px;gap:var(--space-4);">

        <!-- LEFT: Tasks & Content -->
        <div>
          <!-- Tabs -->
          <div class="tabs">
            <button class="tab" [class.active]="activeTab === 'tasks'" (click)="setTab('tasks')">
              Tasks <span class="tab-count">{{ tasks.length }}</span>
            </button>
            <button class="tab" [class.active]="activeTab === 'documents'" (click)="setTab('documents')">
              Documents <span class="tab-count">{{ documents.length }}</span>
            </button>
            <button class="tab" [class.active]="activeTab === 'log'" (click)="setTab('log')">
              Audit Log <span class="tab-count">{{ history.length }}</span>
            </button>
          </div>

          <!-- Tasks Tab -->
          <div *ngIf="activeTab === 'tasks'">
            <!-- Pending Tasks Header -->
            <div *ngIf="pendingTasks.length > 0 && instance.status === 'ACTIVE'" class="mb-3">
              <div class="text-sm font-semibold text-warning mb-2">
                ⏳ {{ pendingTasks.length }} task{{ pendingTasks.length > 1 ? 's' : '' }} pending at this station
              </div>
            </div>

            <div *ngFor="let t of tasks" class="card mb-2"
                 [class.card-interactive]="canAct && t.status !== 'COMPLETED'"
                 (click)="canAct && t.status !== 'COMPLETED' && openTask(t)">
              <div class="card-body" style="padding:var(--space-4);">
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="font-semibold text-md">{{ t.task_definition.name }}</span>
                      <span class="badge badge-neutral badge-sm">{{ t.task_definition.task_type }}</span>
                      <span *ngIf="t.task_definition.is_required" class="badge badge-danger badge-sm">Required</span>
                    </div>
                    <p class="text-sm text-muted" *ngIf="t.task_definition.description">
                      {{ t.task_definition.description }}
                    </p>
                    <!-- Completed response -->
                    <div *ngIf="t.status === 'COMPLETED' && isObject(t.response_data)"
                         class="mt-3 p-3 text-sm" style="background:var(--success-bg);border-radius:var(--radius-md);border:1px solid var(--success-light);">
                      <div class="text-xs text-muted mb-1 font-semibold">Response</div>
                      <div *ngFor="let item of t.response_data | keyvalue" class="flex gap-2">
                        <span class="text-muted">{{ item.key }}:</span>
                        <span class="font-medium">{{ item.value }}</span>
                      </div>
                      <div *ngIf="hasDocs(t)" class="mt-1 text-xs text-muted">
                        📎 {{ t.documents_info?.length }} file(s): {{ joinFileNames(t.documents_info || []) }}
                      </div>
                      <div *ngIf="t.remarks" class="mt-1 text-xs text-muted">
                        💬 {{ t.remarks }}
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 ml-3">
                    <span class="badge" [class.badge-success]="t.status==='COMPLETED'"
                          [class.badge-warning]="t.status==='IN_PROGRESS'"
                          [class.badge-neutral]="t.status==='PENDING'"
                          [class.badge-danger]="t.status==='FAILED'">
                      {{ t.status }}
                    </span>
                    <button *ngIf="canAct && t.status !== 'COMPLETED'"
                            class="btn btn-primary btn-sm" (click)="$event.stopPropagation(); openTask(t)">
                      {{ t.status === 'PENDING' ? 'Start' : 'Continue' }} →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty Tasks -->
            <div *ngIf="tasks.length === 0" class="empty-state">
              <div class="empty-state-icon">📋</div>
              <div class="empty-state-title">No tasks at this station</div>
              <div class="empty-state-desc">
                <ng-container *ngIf="instance.status === 'COMPLETED'">
                  All tasks have been completed for this workflow.
                </ng-container>
                <ng-container *ngIf="instance.status === 'ACTIVE'">
                  No tasks are defined at this station. You can move the workflow to the next station.
                </ng-container>
              </div>
            </div>
          </div>

          <!-- Documents Tab -->
          <div *ngIf="activeTab === 'documents'">
            <!-- Upload Zone (only if active) -->
            <div class="card mb-3" *ngIf="instance.status === 'ACTIVE'">
              <div class="card-body">
                <div class="flex gap-2 items-center">
                  <label class="file-upload-zone" style="flex:1;padding:var(--space-3);">
                    <span class="text-sm text-muted">{{ selectedFile ? selectedFile.name : 'Click to choose a file...' }}</span>
                    <input type="file" (change)="onFileSelected($event)" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx">
                  </label>
                  <input class="form-input" [(ngModel)]="uploadDesc" placeholder="Description" style="width:180px;">
                  <button class="btn btn-primary btn-sm" (click)="uploadDocument()" [disabled]="!selectedFile || uploading">
                    {{ uploading ? 'Uploading...' : 'Upload' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Document List -->
            <div class="card" *ngIf="documents.length > 0">
              <div class="card-body-flush">
                <table class="table">
                  <thead><tr><th>File</th><th>Station</th><th>Uploaded By</th><th>Date</th><th></th></tr></thead>
                  <tbody>
                    <tr *ngFor="let d of documents">
                      <td>
                        <div class="font-medium">📄 {{ d.original_filename }}</div>
                        <div class="text-xs text-muted">{{ d.file_size_display }}</div>
                      </td>
                      <td><span class="badge badge-neutral badge-sm">{{ d.station.name }}</span></td>
                      <td class="text-sm">{{ d.uploaded_by.full_name }}</td>
                      <td class="text-sm text-muted cell-nowrap">{{ d.uploaded_at | date:'short' }}</td>
                      <td><a [href]="d.download_url" target="_blank" class="btn btn-ghost btn-sm">Download</a></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div *ngIf="documents.length === 0" class="empty-state">
              <div class="empty-state-icon">📎</div>
              <div class="empty-state-title">No documents</div>
              <div class="empty-state-desc">Upload files to maintain an evidence trail across workflow stations.</div>
            </div>
          </div>

          <!-- Audit Log Tab -->
          <div *ngIf="activeTab === 'log'">
            <div class="card" *ngIf="history.length > 0">
              <div class="card-body-flush">
                <table class="table">
                  <thead><tr><th>#</th><th>When</th><th>Action</th><th>By</th><th>Details</th></tr></thead>
                  <tbody>
                    <tr *ngFor="let h of history; let i = index">
                      <td class="text-xs text-muted">{{ rowNumber(i) }}</td>
                      <td class="text-sm cell-nowrap">{{ h.timestamp | date:'short' }}</td>
                      <td><span class="badge badge-info badge-sm">{{ h.action }}</span></td>
                      <td class="text-sm">{{ h.action_by_name }}</td>
                      <td class="text-sm">
                        <ng-container [ngSwitch]="h.action">
                          <span *ngSwitchCase="'MOVED'">{{ h.from_station_name }} → {{ h.to_station_name }}</span>
                          <span *ngSwitchCase="'TASK_COMPLETED'">{{ h.task_name }}</span>
                          <span *ngSwitchCase="'INSTANCE_CREATED'">Workflow initiated</span>
                          <span *ngSwitchDefault>{{ h.remarks }}</span>
                        </ng-container>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div *ngIf="history.length === 0" class="empty-state">
              <div class="empty-state-icon">📜</div>
              <div class="empty-state-title">No history recorded</div>
              <div class="empty-state-desc">History entries appear as the workflow progresses through stations.</div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Sidebar Info -->
        <div>
          <!-- Instance Info Card -->
          <div class="card mb-3">
            <div class="card-header">Details</div>
            <div class="card-body" style="padding:var(--space-4);">
              <dl style="font-size:var(--font-sm);">
                <div class="flex justify-between mb-2">
                  <dt class="text-muted">Template</dt>
                  <dd class="font-medium">{{ instance.template_name }}</dd>
                </div>
                <div class="flex justify-between mb-2">
                  <dt class="text-muted">Version</dt>
                  <dd class="font-medium">{{ instance.version_label }}</dd>
                </div>
                <div class="flex justify-between mb-2">
                  <dt class="text-muted">Initiator</dt>
                  <dd class="font-medium">{{ instance.initiated_by_info?.full_name }}</dd>
                </div>
                <div class="flex justify-between mb-2">
                  <dt class="text-muted">Created</dt>
                  <dd class="font-medium">{{ instance.created_at | date:'mediumDate' }}</dd>
                </div>
                <div class="flex justify-between mb-2" *ngIf="instance.completed_at">
                  <dt class="text-muted">Completed</dt>
                  <dd class="font-medium">{{ instance.completed_at | date:'mediumDate' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-muted">Current Station</dt>
                  <dd><span class="badge badge-primary badge-sm">{{ instance.current_station_name }}</span></dd>
                </div>
              </dl>
            </div>
          </div>

          <!-- Permissions Card (if blocked) -->
          <div class="card mb-3" *ngIf="!canAct && instance.user_permissions?.reason_if_blocked"
               style="border-left:3px solid var(--warning);">
            <div class="card-body" style="padding:var(--space-4);">
              <div class="text-sm font-semibold text-warning mb-1">⚠ Action Restricted</div>
              <p class="text-xs text-muted">{{ instance.user_permissions.reason_if_blocked }}</p>
            </div>
          </div>

          <!-- Danger Zone -->
          <div class="card" *ngIf="instance.status === 'ACTIVE' && (auth.isAdmin || instance.initiated_by === authUserId)"
               style="border-left:3px solid var(--danger);">
            <div class="card-header" style="color:var(--danger);">Danger Zone</div>
            <div class="card-body" style="padding:var(--space-4);">
              <p class="text-xs text-muted mb-3">Permanently cancel this workflow instance. This action cannot be undone.</p>
              <button class="btn btn-danger btn-sm w-full" (click)="cancelInstance()">
                Cancel Workflow
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Task Execution Modal -->
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
  canAct = false;
  selectedFile: File | null = null;
  uploadDesc = '';
  uploading = false;

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

  get pendingTasks(): TaskExecution[] {
    return this.tasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
  }

  moveWorkflow(toStationId: number): void {
    if (!this.instance) return;
    this.moveError = false;
    this.moveMsg = 'Moving workflow...';
    this.api.moveInstance(this.instance.id, toStationId, '').subscribe({
      next: (r) => {
        this.moveMsg = r.message || 'Moved successfully';
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

  cancelInstance(): void {
    if (!this.instance || !confirm(`Permanently cancel ${this.instance.reference}? This cannot be undone.`)) return;
    this.api.cancelInstance(this.instance.id, 'Cancelled by user').subscribe(() => {
      this.loadInstance(this.instance!.id);
    });
  }

  get authUserId(): number | null {
    return this.instance?.initiated_by || null;
  }

  isForwardTransition(t: any): boolean {
    const label = (t.label || '').toLowerCase();
    return !label.includes('reject') && label !== 'cancel';
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
    return this.instance?.current_station_info?.allowed_roles?.map(r => r.name).join(', ') || 'All roles';
  }

  isObject(val: any): boolean {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
  }

  openTask(t: TaskExecution): void { this.selectedTask = t; }

  hasDocs(t: TaskExecution): boolean {
    return (t.documents_info?.length || 0) > 0;
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files?.[0] || null;
  }

  uploadDocument(): void {
    if (!this.selectedFile || !this.instance) return;
    this.uploading = true;
    this.api.uploadDocument(this.instance.id, this.selectedFile, this.uploadDesc).subscribe({
      next: () => {
        this.uploading = false;
        this.selectedFile = null;
        this.uploadDesc = '';
        this.loadDocuments();
      },
      error: () => this.uploading = false,
    });
  }
}
