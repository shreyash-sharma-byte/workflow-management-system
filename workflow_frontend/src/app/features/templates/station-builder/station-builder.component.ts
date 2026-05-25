import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Station, Role, TaskDefinition, WorkflowTemplate, TransitionDetail } from '../../../shared/models/types';

@Component({
  selector: 'app-station-builder',
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
          <span class="text-sm font-semibold text-primary">Stations</span>
          <span class="badge ml-2" [class.badge-success]="templateStatus==='PUBLISHED'" [class.badge-warning]="templateStatus==='DRAFT'">
            {{ templateStatus || 'DRAFT' }}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <div>
            <h3 style="margin:0;">{{ templateName || 'Loading...' }}</h3>
            <p class="text-xs text-muted mt-1" *ngIf="templateDesc">{{ templateDesc }}</p>
          </div>
          <div class="flex gap-2">
            <a class="btn btn-outline btn-sm" [routerLink]="['/templates', templateId, 'transitions']">
              Switch to Transitions →
            </a>
            <a class="btn btn-secondary btn-sm" [routerLink]="['/templates', templateId]">
              ← Template Overview
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Station Form -->
    <div class="card max-w-lg mb-4">
      <div class="card-header">{{ editingStation ? 'Edit Station — ' + editingStation.name : 'Add New Station' }}</div>
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">Station Name <span class="required">*</span></label>
          <input class="form-input" [(ngModel)]="newName" placeholder="e.g., Quality Assurance Review">
        </div>
        <div class="form-group">
          <label class="form-label">Station Type</label>
          <select class="form-select" [(ngModel)]="newType">
            <option value="START">🚀 Start — Entry point of the workflow</option>
            <option value="NORMAL">📋 Normal — Intermediate processing station</option>
            <option value="END">🏁 End — Terminal station</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <input class="form-input" [(ngModel)]="newDesc" placeholder="What happens at this station?">
        </div>
        <div class="form-group">
          <label class="form-label">Assigned Roles <span class="text-xs text-muted">— who can process work here</span></label>
          <div class="flex flex-wrap gap-2">
            <label *ngFor="let r of allRoles" class="form-checkbox">
              <input type="checkbox" [checked]="selectedRoles.has(r.id)" (change)="toggleRole(r.id)">
              {{ r.display_name || r.name }}
            </label>
          </div>
          <p class="form-hint">If no roles selected, all roles can act at this station.</p>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-primary" (click)="saveStation()" [disabled]="!newName.trim()">
            {{ editingStation ? 'Update Station' : 'Add Station' }}
          </button>
          <button class="btn btn-outline btn-sm" *ngIf="editingStation" (click)="cancelEdit()">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Station List -->
    <div class="card">
      <div class="card-header">
        All Stations · {{ stations.length }}
        <span class="text-xs text-muted font-normal">
          {{ stations.length === 0 ? 'Add START and END stations to begin' : (startCount ? '✓' : '⚠ Need START') + ' & ' + (endCount ? '✓' : '⚠ Need END') }}
        </span>
      </div>
      <div class="card-body-flush">
        <div *ngIf="stations.length === 0" class="empty-state">
          <div class="empty-state-icon">🏗️</div>
          <div class="empty-state-title">No stations defined</div>
          <div class="empty-state-desc">Start by adding a START station (entry point) and an END station (completion point).</div>
        </div>
        <div *ngFor="let s of stations; let last = last"
             class="flex justify-between items-center"
             style="padding:var(--space-3) var(--space-5);border-bottom:1px solid var(--border-light);"
             [style.border-bottom]="last ? 'none' : ''">
          <div class="flex items-center gap-3" style="flex:1;min-width:0;">
            <!-- Station type badge -->
            <span class="badge" [class.badge-info]="s.station_type==='START'"
                  [class.badge-danger]="s.station_type==='END'"
                  [class.badge-neutral]="s.station_type==='NORMAL'"
                  style="flex-shrink:0;">
              {{ s.station_type === 'START' ? '🚀 START' : s.station_type === 'END' ? '🏁 END' : s.station_type }}
            </span>
            <div style="min-width:0;">
              <div class="font-medium text-sm truncate">{{ s.name }}</div>
              <div class="text-xs text-muted truncate" *ngIf="s.description">{{ s.description }}</div>
              <div class="text-xs text-muted mt-1">
                {{ s.task_count || 0 }} task{{ s.task_count !== 1 ? 's' : '' }}
                · {{ roleNamesForStation(s) }}
              </div>
            </div>
          </div>
          <div class="flex gap-1 flex-shrink-0 ml-3">
            <button class="btn btn-outline btn-sm" (click)="editStation(s)">Edit</button>
            <button class="btn btn-outline btn-sm" (click)="manageTasks(s)">Tasks</button>
            <button class="btn btn-ghost btn-sm" (click)="deleteStation(s.id)" style="color:var(--danger);">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Mini Transitions Preview -->
    <div class="card mt-4" *ngIf="transitionCount > 0">
      <div class="card-header">
        Connected Transitions · {{ transitionCount }}
        <a class="btn btn-ghost btn-xs" [routerLink]="['/templates', templateId, 'transitions']">Manage →</a>
      </div>
      <div class="card-body" style="padding:var(--space-3) var(--space-5);">
        <div class="flex flex-wrap gap-2">
          <span *ngFor="let t of transitions" class="badge badge-info">
            {{ t.from_station.name }} → {{ t.to_station.name }}
            <span *ngIf="t.label" style="opacity:0.8;">({{ t.label }})</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Task Management Modal -->
    <div *ngIf="taskStation" class="modal-backdrop" (click)="closeTaskModal()">
      <div class="modal modal-lg" (click)="preventClose($event)">
        <div class="modal-header">
          <span>📋 Tasks for <strong>{{ taskStation.name }}</strong></span>
          <button class="btn btn-ghost btn-sm" (click)="closeTaskModal()">✕</button>
        </div>
        <div class="modal-body">

        <!-- Add Task Section -->
        <div style="padding:var(--space-4);background:var(--bg-hover);border-radius:var(--radius-md);margin-bottom:var(--space-4);">
          <h4 class="mb-3">Add New Task</h4>
          <div class="form-group">
            <label class="form-label">Task Name <span class="required">*</span></label>
            <input class="form-input" [(ngModel)]="newTaskName" placeholder="e.g., QA Sign-off">
          </div>
          <div class="form-group">
            <label class="form-label">Task Type</label>
            <select class="form-select" [(ngModel)]="newTaskType" (change)="onTaskTypeChange()">
              <option value="APPROVAL">👍 Approval — Simple approve/reject decision</option>
              <option value="FORM">📝 Form — Collect structured data via fields</option>
              <option value="DOCUMENT">📎 Document — Require file uploads</option>
              <option value="CONFIRMATION">✅ Confirmation — Checklist of items to verify</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-checkbox">
              <input type="checkbox" [(ngModel)]="newTaskRequired">
              Required — must be completed before the workflow can move forward
            </label>
          </div>

          <!-- FORM builder -->
          <div *ngIf="newTaskType === 'FORM'" style="border:1px solid var(--border-default);border-radius:var(--radius-md);padding:var(--space-4);margin-bottom:var(--space-3);">
            <div class="flex justify-between items-center mb-3">
              <span class="font-semibold text-sm">Form Fields</span>
              <button class="btn btn-outline btn-xs" (click)="addFormField()">+ Add Field</button>
            </div>
            <div *ngFor="let f of formFields; let i = index"
                 style="display:flex;gap:var(--space-2);align-items:flex-start;margin-bottom:var(--space-2);padding:var(--space-3);background:var(--bg-surface);border-radius:var(--radius-sm);border:1px solid var(--border-light);">
              <div style="flex:1;">
                <input class="form-input" [(ngModel)]="f.label" placeholder="Field label (e.g., Test Results)" style="margin-bottom:4px;font-size:var(--font-sm);">
                <div style="display:flex;gap:4px;">
                  <input class="form-input" [(ngModel)]="f.key" placeholder="key (e.g., test_results)" style="flex:1;font-size:var(--font-sm);">
                  <select class="form-select" [(ngModel)]="f.type" style="width:110px;font-size:var(--font-sm);">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="textarea">Long Text</option>
                    <option value="select">Dropdown</option>
                    <option value="date">Date</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <div *ngIf="f.type === 'select'" style="margin-top:4px;">
                  <input class="form-input" [(ngModel)]="f.optionsStr" placeholder="Options: Yes, No, Maybe" style="font-size:var(--font-sm);">
                </div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding-top:4px;">
                <label style="font-size:var(--font-xs);white-space:nowrap;">
                  <input type="checkbox" [(ngModel)]="f.required"> Req
                </label>
                <button class="btn btn-ghost btn-xs" (click)="removeFormField(i)" style="color:var(--danger);">✕</button>
              </div>
            </div>
            <div *ngIf="formFields.length === 0" class="text-sm text-muted text-center p-3">No fields yet. Click "+ Add Field" to start building the form.</div>
          </div>

          <!-- CONFIRMATION builder -->
          <div *ngIf="newTaskType === 'CONFIRMATION'" style="border:1px solid var(--border-default);border-radius:var(--radius-md);padding:var(--space-4);margin-bottom:var(--space-3);">
            <div class="flex justify-between items-center mb-3">
              <span class="font-semibold text-sm">Checklist Items</span>
              <button class="btn btn-outline btn-xs" (click)="addCheckItem()">+ Add Item</button>
            </div>
            <div *ngFor="let c of checkItems; let i = index"
                 style="display:flex;gap:var(--space-2);align-items:center;margin-bottom:var(--space-1);padding:var(--space-2);background:var(--bg-surface);border-radius:var(--radius-sm);border:1px solid var(--border-light);">
              <input class="form-input" [(ngModel)]="c.label" placeholder="Item label (e.g., All tests passed)" style="flex:1;font-size:var(--font-sm);">
              <input class="form-input" [(ngModel)]="c.key" placeholder="key" style="width:120px;font-size:var(--font-sm);">
              <label style="font-size:var(--font-xs);white-space:nowrap;">
                <input type="checkbox" [(ngModel)]="c.required"> Req
              </label>
              <button class="btn btn-ghost btn-xs" (click)="removeCheckItem(i)" style="color:var(--danger);">✕</button>
            </div>
            <div *ngIf="checkItems.length === 0" class="text-sm text-muted text-center p-3">No items yet. Click "+ Add Item" to build the checklist.</div>
          </div>

          <button class="btn btn-primary btn-sm" (click)="addTask()" [disabled]="!newTaskName.trim()">Add Task</button>
        </div>

        <!-- Existing Tasks -->
        <h4 class="mb-2">Existing Tasks · {{ stationTasks.length }}</h4>
        <div *ngFor="let t of stationTasks; let last = last"
             class="flex justify-between items-center"
             style="padding:var(--space-2) 0;border-bottom:1px solid var(--border-light);"
             [style.border-bottom]="last ? 'none' : ''">
          <div class="flex items-center gap-2">
            <span class="font-medium text-sm">{{ t.name }}</span>
            <span class="badge badge-neutral badge-sm">{{ t.task_type }}</span>
            <span *ngIf="t.is_required" class="badge badge-danger badge-sm">Required</span>
          </div>
          <button class="btn btn-ghost btn-sm" (click)="doDeleteTask(t.id)" style="color:var(--danger);">Delete</button>
        </div>
        <div *ngIf="stationTasks.length === 0" class="text-sm text-muted text-center p-4">
          No tasks added yet. Use the form above to add tasks to this station.
        </div>

        </div>
      </div>
    </div>
  `,
})
export class StationBuilderComponent implements OnInit {
  templateId = 0;
  templateName = '';
  templateDesc = '';
  templateStatus = '';
  stations: Station[] = [];
  transitions: TransitionDetail[] = [];
  allRoles: Role[] = [];
  selectedRoles = new Set<number>();

  newName = '';
  newType = 'NORMAL';
  newDesc = '';
  editingStation: Station | null = null;

  taskStation: Station | null = null;
  stationTasks: TaskDefinition[] = [];
  newTaskName = '';
  newTaskType = 'APPROVAL';
  newTaskRequired = true;
  formFields: { key: string; label: string; type: string; required: boolean; optionsStr: string }[] = [];
  checkItems: { key: string; label: string; required: boolean }[] = [];

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.templateId = +this.route.snapshot.params['id'];
    this.api.roles().subscribe(r => this.allRoles = r);
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

  get startCount(): number { return this.stations.filter(s => s.station_type === 'START').length; }
  get endCount(): number { return this.stations.filter(s => s.station_type === 'END').length; }
  get transitionCount(): number { return this.transitions.length; }

  toggleRole(id: number): void {
    if (this.selectedRoles.has(id)) this.selectedRoles.delete(id);
    else this.selectedRoles.add(id);
  }

  saveStation(): void {
    const data = {
      name: this.newName.trim(), station_type: this.newType,
      description: this.newDesc, order: this.stations.length + 1,
      allowed_role_ids: Array.from(this.selectedRoles),
    };

    if (this.editingStation) {
      this.api.updateStation(this.templateId, this.editingStation.id, data).subscribe(() => {
        this.cancelEdit(); this.load();
      });
    } else {
      this.api.createStation(this.templateId, data).subscribe(() => {
        this.newName = ''; this.newDesc = ''; this.selectedRoles.clear(); this.load();
      });
    }
  }

  editStation(s: Station): void {
    this.editingStation = s;
    this.newName = s.name;
    this.newType = s.station_type;
    this.newDesc = s.description || '';
    this.selectedRoles = new Set((s.allowed_roles || []).map(r => r.id));
  }

  cancelEdit(): void {
    this.editingStation = null;
    this.newName = ''; this.newType = 'NORMAL'; this.newDesc = '';
    this.selectedRoles.clear();
  }

  deleteStation(id: number): void {
    if (confirm('Permanently delete this station? All associated tasks will also be deleted.')) {
      this.api.deleteStation(this.templateId, id).subscribe(() => this.load());
    }
  }

  // ── Task Management ────────────────────────────────
  manageTasks(s: Station): void {
    this.taskStation = s;
    this.api.listTasks(this.templateId, s.id).subscribe(r => this.stationTasks = r.results);
  }

  addTask(): void {
    if (!this.taskStation) return;

    let config: any = {};
    if (this.newTaskType === 'FORM') {
      config = {
        fields: this.formFields.map(f => ({
          key: f.key, label: f.label, type: f.type, required: f.required,
          ...(f.type === 'select' && f.optionsStr ? { options: f.optionsStr.split(',').map(o => o.trim()) } : {}),
        }))
      };
    } else if (this.newTaskType === 'CONFIRMATION') {
      config = {
        checklist: this.checkItems.map(c => ({ key: c.key, label: c.label, required: c.required }))
      };
    }

    const data = {
      name: this.newTaskName.trim(), task_type: this.newTaskType,
      is_required: this.newTaskRequired, order: this.stationTasks.length + 1,
      task_config: config,
    };

    this.api.createTask(this.templateId, this.taskStation.id, data).subscribe(() => {
      this.newTaskName = ''; this.formFields = []; this.checkItems = [];
      this.manageTasks(this.taskStation!);
    });
  }

  onTaskTypeChange(): void {
    this.formFields = [];
    this.checkItems = [];
  }

  addFormField(): void { this.formFields.push({ key: '', label: '', type: 'text', required: false, optionsStr: '' }); }
  removeFormField(index: number): void { this.formFields.splice(index, 1); }
  addCheckItem(): void { this.checkItems.push({ key: '', label: '', required: true }); }
  removeCheckItem(index: number): void { this.checkItems.splice(index, 1); }

  deleteTask(taskId: number): void {
    if (!this.taskStation) return;
    this.api.deleteTask(this.templateId, this.taskStation.id, taskId).subscribe(() => {
      this.manageTasks(this.taskStation!);
    });
  }

  closeTaskModal(): void { this.taskStation = null; }
  preventClose(e: Event): void { e.stopPropagation(); }
  doDeleteTask(id: number): void { this.deleteTask(id); }

  roleNamesForStation(s: Station): string {
    const roles = s.allowed_roles || [];
    return roles.length ? 'Roles: ' + roles.map(r => r.display_name || r.name).join(', ') : 'All roles';
  }
}

