import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { TaskExecution, FormField, ChecklistItem } from '../../../shared/models/types';

@Component({
  selector: 'app-task-execution',
  template: `
    <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:200;display:flex;align-items:center;justify-content:center;" (click)="close()">
      <div class="card" style="width:500px;max-height:80vh;overflow-y:auto;" (click)="$event.stopPropagation()">
        <div class="card-header">
          {{ task.task_definition.name }}
          <button class="btn btn-outline btn-sm" (click)="close()">✕</button>
        </div>
        <p class="text-muted text-sm mb-1">Type: {{ task.task_definition.task_type }} | {{ task.task_definition.is_required ? 'Required' : 'Optional' }}</p>

        <!-- APPROVAL -->
        <ng-container *ngIf="task.task_definition.task_type === 'APPROVAL'">
          <div class="form-group">
            <label class="form-label">Decision</label>
            <select class="form-select" [(ngModel)]="response.decision">
              <option *ngFor="let o of task.task_definition.task_config.options || ['Approved','Rejected']" [value]="o">{{ o }}</option>
            </select>
          </div>
        </ng-container>

        <!-- FORM (Dynamic JSON) -->
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

        <!-- CONFIRMATION (Checklist) -->
        <ng-container *ngIf="task.task_definition.task_type === 'CONFIRMATION'">
          <div class="form-group" *ngFor="let item of checklistItems">
            <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;padding:0.5rem 0;">
              <input type="checkbox" [(ngModel)]="response[item.key]">
              <span>{{ item.label }} <span *ngIf="item.required" style="color:var(--danger);">*</span></span>
            </label>
          </div>
        </ng-container>

        <!-- DOCUMENT -->
        <ng-container *ngIf="task.task_definition.task_type === 'DOCUMENT'">
          <p class="text-muted text-sm mb-1">Upload documents using the Documents tab before submitting this task.</p>
          <div *ngIf="task.documents_info?.length" class="text-sm">
            Attached: {{ task.documents_info.length }} file(s)
          </div>
        </ng-container>

        <!-- Remarks -->
        <div class="form-group mt-1">
          <label class="form-label">Remarks</label>
          <textarea class="form-textarea" [(ngModel)]="remarks" placeholder="Add any notes..."></textarea>
        </div>

        <div class="flex gap-1">
          <button class="btn btn-primary" (click)="submit()">Submit</button>
          <button class="btn btn-outline" (click)="saveDraft()">Save Draft</button>
          <button class="btn btn-outline" (click)="close()">Cancel</button>
        </div>
        <div *ngIf="error" class="mt-1" style="color:var(--danger);">{{ error }}</div>
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
