import { Component, OnInit, Input } from '@angular/core';
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
    <!-- Loading state -->
    <div *ngIf="loading" class="flex justify-center items-center p-12">
      <div style="text-align:center;">
        <div class="skeleton" style="width:240px;height:24px;margin-bottom:12px;"></div>
        <div class="skeleton skeleton-text" style="width:180px;"></div>
        <div class="skeleton skeleton-text" style="width:140px;"></div>
        <p class="text-sm text-muted mt-4">Loading instance...</p>
      </div>
    </div>

    <!-- Error state -->
    <div *ngIf="error && !loading" class="empty-state">
      <p class="empty-state-title">Failed to Load Instance</p>
      <p class="empty-state-desc">{{ error }}</p>
      <button class="btn btn-primary" (click)="retry()">Retry</button>
      <button class="btn btn-outline ml-2" [routerLink]="['/instances']">Back to Instances</button>
    </div>

    <div *ngIf="instance">
      <!-- ═══ HEADER: Reference, Status, Meta ═══ -->
      <div class="flex justify-between items-start mb-4 detail-head">
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
        <button class="btn btn-outline btn-sm" *ngIf="!standalone" [routerLink]="['/instances']">All Instances</button>
      </div>

      <!-- ═══ SHARE LINK ═══ -->
      <div class="card mb-4" *ngIf="instance.public_token && !standalone" style="border-left:4px solid var(--primary);">
        <div class="card-body" style="padding:var(--space-3) var(--space-5);">
          <div class="flex items-center gap-3">
            <span class="text-sm font-semibold">Share Link</span>
            <code style="background:var(--bg-hover);padding:4px 8px;border-radius:4px;font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              {{ publicUrl }}
            </code>
            <button class="btn btn-outline btn-xs" (click)="copyLink()">{{ copied ? 'Copied!' : 'Copy' }}</button>
            <a class="btn btn-ghost btn-xs" [href]="publicUrl" target="_blank">Open</a>
          </div>
          <p class="text-xs text-muted mt-1">Users with the right station roles can access this instance via the link above.</p>
        </div>
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
                    <svg *ngSwitchCase="'COMPLETED'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
                    <span *ngSwitchDefault>{{ s.station.order }}</span>
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
          <div class="flex justify-between items-center action-bar">
            <div>
              <span class="font-semibold text-md">Move Workflow Forward</span>
              <span *ngIf="!transitions.can_move" class="badge badge-warning" style="margin-left:8px;">
                {{ transitions.blocked_reason }}
              </span>
              <span *ngIf="!canAct && instance.user_permissions?.reason_if_blocked" class="badge badge-neutral" style="margin-left:8px;">
                {{ instance.user_permissions.reason_if_blocked }}
              </span>
            </div>
            <div class="flex gap-2 action-bar-buttons">
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
      <div class="grid detail-grid">

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
                {{ pendingTasks.length }} task{{ pendingTasks.length > 1 ? 's' : '' }} pending at this station
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
                        {{ t.documents_info?.length }} file(s): {{ joinFileNames(t.documents_info || []) }}
                      </div>
                      <div *ngIf="t.remarks" class="mt-1 text-xs text-muted">
                        {{ t.remarks }}
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
                      {{ t.status === 'PENDING' ? 'Start' : 'Continue' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty Tasks -->
            <div *ngIf="tasks.length === 0" class="empty-state">
              
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
                <div class="flex gap-2 items-center flex-wrap">
                  <label class="file-upload-zone" style="flex:1;padding:var(--space-3);">
                    <span class="text-sm text-muted">{{ selectedFile ? selectedFile.name : 'Click to choose a file... (max 1 MB)' }}</span>
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
              <div class="card-body-flush table-responsive">
                <table class="table">
                  <thead><tr><th>File</th><th>Station</th><th>Uploaded By</th><th>Date</th><th></th></tr></thead>
                  <tbody>
                    <tr *ngFor="let d of documents">
                      <td>
                        <div class="font-medium">{{ d.original_filename }}</div>
                        <div class="text-xs text-muted">{{ d.file_size_display }}</div>
                      </td>
                      <td><span class="badge badge-neutral badge-sm">{{ d.station.name }}</span></td>
                      <td class="text-sm">{{ d.uploaded_by.full_name }}</td>
                      <td class="text-sm text-muted cell-nowrap">{{ d.uploaded_at | date:'short' }}</td>
                      <td><button class="btn btn-ghost btn-sm" (click)="downloadDocument(d)">Download</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div *ngIf="documents.length === 0" class="empty-state">
              
              <div class="empty-state-title">No documents</div>
              <div class="empty-state-desc">Upload files to maintain an evidence trail across workflow stations.</div>
            </div>
          </div>

          <!-- Audit Log Tab -->
          <div *ngIf="activeTab === 'log'">
            <div class="card" *ngIf="history.length > 0">
              <div class="card-body-flush table-responsive">
                <table class="table">
                  <thead><tr><th>#</th><th>When</th><th>Action</th><th>By</th><th>Details</th></tr></thead>
                  <tbody>
                    <tr *ngFor="let h of history; let i = index">
                      <td class="text-xs text-muted">{{ rowNumber(i) }}</td>
                      <td class="text-sm cell-nowrap">{{ h.timestamp | date:'medium' }}</td>
                      <td><span class="badge badge-info badge-sm">{{ h.action }}</span></td>
                      <td class="text-sm">{{ h.action_by_name }}</td>
                      <td class="text-sm">
                        <ng-container [ngSwitch]="h.action">
                          <span *ngSwitchCase="'MOVED'">{{ h.from_station_name }} to {{ h.to_station_name }}</span>
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
              <div class="text-sm font-semibold text-warning mb-1">Action Restricted</div>
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
  @Input() instance?: WorkflowInstance;
  @Input() standalone = false;

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
  copied = false;
  loading = false;
  error = '';
  private lastId?: number;

  get publicUrl(): string {
    return this.instance?.public_token
      ? `${window.location.origin}/w/${this.instance.public_token}`
      : '';
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.publicUrl).then(() => {
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
    });
  }

  constructor(public auth: AuthService, private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    if (this.instance) {
      this.onInstanceLoaded(this.instance);
      return;
    }
    this.route.params.subscribe(p => {
      if (p['id']) {
        this.lastId = +p['id'];
        this.loadInstance(+p['id']);
      }
    });
  }

  onInstanceLoaded(i: WorkflowInstance): void {
    this.canAct = i.user_permissions?.can_execute_tasks ?? false;
    this.loadTasks(i.id);
    this.loadDocuments();
    this.loadHistory();
    this.loadAllowedTransitions(i.id);
  }

  loadInstance(id: number): void {
    this.loading = true;
    this.error = '';
    this.instance = undefined;
    this.api.getInstance(id).subscribe({
      next: i => {
        this.instance = i;
        this.loading = false;
        this.onInstanceLoaded(i);
      },
      error: err => {
        this.loading = false;
        if (err.status === 404) {
          this.error = 'This workflow instance was not found. It may have been deleted or the ID is incorrect.';
        } else if (err.status === 403) {
          this.error = 'You do not have permission to view this workflow instance.';
        } else {
          this.error = 'Something went wrong while loading this instance. Please try again.';
        }
      }
    });
  }

  retry(): void {
    if (this.lastId) this.loadInstance(this.lastId);
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

  downloadDocument(d: DocumentInfo): void {
    if (this.instance) this.api.downloadDocument(this.instance.id, d.id, d.original_filename);
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
    const file = event.target.files?.[0] || null;
    if (file && file.size > 1_048_576) {
      alert(`File "${file.name}" is ${(file.size / 1_048_576).toFixed(1)} MB. Maximum allowed is 1 MB.`);
      return;
    }
    this.selectedFile = file;
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
