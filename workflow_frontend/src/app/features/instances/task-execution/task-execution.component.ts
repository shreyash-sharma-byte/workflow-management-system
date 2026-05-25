import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { TaskExecution, FormField, ChecklistItem } from '../../../shared/models/types';

@Component({
  selector: 'app-task-execution',
  template: `
    <div class="modal-backdrop" (click)="close()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          {{ task.task_definition.name }}
          <button class="btn btn-ghost btn-sm" (click)="close()">✕</button>
        </div>
        <div class="modal-body">
        <p class="text-muted text-sm mb-1">
          {{ task.task_definition.task_type }} · {{ task.task_definition.is_required ? 'Required' : 'Optional' }}
        </p>

        <!-- APPROVAL -->
        <ng-container *ngIf="task.task_definition.task_type === 'APPROVAL'">
          <div class="form-group">
            <label class="form-label">Decision</label>
            <select class="form-select" [(ngModel)]="response.decision">
              <option *ngFor="let o of task.task_definition.task_config.options || ['Approved','Rejected']" [value]="o">{{ o }}</option>
            </select>
          </div>
        </ng-container>

        <!-- FORM (Dynamic) -->
        <ng-container *ngIf="task.task_definition.task_type === 'FORM'">
          <div class="form-group" *ngFor="let field of formFields">
            <label class="form-label">{{ field.label }} <span *ngIf="field.required" style="color:var(--danger);">*</span></label>
            <ng-container [ngSwitch]="field.type">
              <input *ngSwitchCase="'text'" class="form-input" [(ngModel)]="response[field.key]" [placeholder]="field.placeholder || ''">
              <input *ngSwitchCase="'number'" class="form-input" type="number" [(ngModel)]="response[field.key]">
              <input *ngSwitchCase="'email'" class="form-input" type="email" [(ngModel)]="response[field.key]">
              <input *ngSwitchCase="'date'" class="form-input" type="date" [(ngModel)]="response[field.key]">
              <textarea *ngSwitchCase="'textarea'" class="form-textarea" [(ngModel)]="response[field.key]" [placeholder]="field.placeholder || ''"></textarea>
              <select *ngSwitchCase="'select'" class="form-select" [(ngModel)]="response[field.key]">
                <option value="">-- Select --</option>
                <option *ngFor="let o of field.options" [value]="o">{{ o }}</option>
              </select>
              <label *ngSwitchCase="'checkbox'" style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                <input type="checkbox" [(ngModel)]="response[field.key]"> {{ field.label }}
              </label>
              <input *ngSwitchDefault class="form-input" [(ngModel)]="response[field.key]">
            </ng-container>
          </div>
        </ng-container>

        <!-- CONFIRMATION -->
        <ng-container *ngIf="task.task_definition.task_type === 'CONFIRMATION'">
          <div *ngFor="let item of checklistItems" style="padding:0.5rem 0;border-bottom:1px solid var(--border-light);">
            <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-size:0.875rem;">
              <input type="checkbox" [(ngModel)]="response[item.key]">
              <span>{{ item.label }} <span *ngIf="item.required" style="color:var(--danger);">*</span></span>
            </label>
          </div>
        </ng-container>

        <!-- DOCUMENT -->
        <ng-container *ngIf="task.task_definition.task_type === 'DOCUMENT'">
          <p class="text-muted text-sm">Upload documents using the Documents tab, then submit this task.</p>
          <div *ngIf="task.documents_info?.length" class="text-sm mt-1">
            📎 {{ task.documents_info.length }} file(s) attached
          </div>
        </ng-container>

        <div class="form-group mt-1">
          <label class="form-label">Remarks</label>
          <textarea class="form-textarea" [(ngModel)]="remarks" placeholder="Any notes..."></textarea>
        </div>

        <div *ngIf="error" class="text-sm" style="color:var(--danger);margin-bottom:0.5rem;">{{ error }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" (click)="close()">Cancel</button>
          <button class="btn btn-ghost" (click)="saveDraft()">Save Draft</button>
          <button class="btn btn-primary" (click)="submit()">Submit</button>
        </div>
      </div>
    </div>
  `,
})
export class TaskExecutionComponent {
  @Input() task!: TaskExecution;
  @Input() instanceId!: number;
  @Output() closed = new EventEmitter<void>();

  response: any = {};
  remarks = '';
  error = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    // Pre-populate from existing response
    if (this.task.response_data) {
      this.response = { ...this.task.response_data };
    }
    // Initialize defaults
    const cfg = this.task.task_definition.task_config;
    if (cfg?.checklist) {
      for (const item of cfg.checklist) this.response[item.key] = this.response[item.key] ?? false;
    }
    if (cfg?.options && !this.response.decision) {
      this.response.decision = cfg.options[0];
    }
  }

  get formFields(): FormField[] {
    return this.task.task_definition.task_config?.fields || [];
  }

  get checklistItems(): ChecklistItem[] {
    return this.task.task_definition.task_config?.checklist || [];
  }

  submit(): void {
    this.api.submitTask(this.instanceId, this.task.id, this.response, this.remarks).subscribe({
      next: () => this.close(),
      error: (e) => this.error = e.error?.message || 'Submit failed',
    });
  }

  saveDraft(): void {
    this.api.saveTaskDraft(this.instanceId, this.task.id, this.response).subscribe({
      next: () => this.close(),
      error: (e) => this.error = e.error?.message || 'Save failed',
    });
  }

  close(): void { this.closed.emit(); }
}
