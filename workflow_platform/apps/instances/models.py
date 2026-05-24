from django.db import models
from apps.workflows.models import WorkflowTemplateVersion, Station, TaskDefinition


class WorkflowInstance(models.Model):
    """A running workflow execution created from a template version."""
    class InstanceStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'
        BLOCKED = 'BLOCKED', 'Blocked'

    template_version = models.ForeignKey(
        WorkflowTemplateVersion, on_delete=models.PROTECT, related_name='instances'
    )
    reference = models.CharField(max_length=50, unique=True, db_index=True)
    title = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=InstanceStatus.choices, default=InstanceStatus.ACTIVE)
    current_station = models.ForeignKey(Station, on_delete=models.PROTECT, related_name='active_instances')
    instance_data = models.JSONField(default=dict, blank=True)

    # Optimistic locking
    version = models.PositiveIntegerField(default=1)

    initiated_by = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, related_name='initiated_instances'
    )
    current_owner = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='owned_instances'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['current_station']),
            models.Index(fields=['reference']),
            models.Index(fields=['status', 'current_station']),
        ]

    def __str__(self):
        return f"{self.reference}: {self.title}"

    @property
    def is_active(self):
        return self.status == self.InstanceStatus.ACTIVE

    @property
    def is_completed(self):
        return self.status == self.InstanceStatus.COMPLETED


# ── Audit History ────────────────────────────────────────────

class WorkflowInstanceHistory(models.Model):
    """Append-only immutable audit log. NEVER update or delete after creation."""
    class ActionType(models.TextChoices):
        INSTANCE_CREATED = 'INSTANCE_CREATED', 'Instance Created'
        MOVED = 'MOVED', 'Moved'
        TASK_STARTED = 'TASK_STARTED', 'Task Started'
        TASK_COMPLETED = 'TASK_COMPLETED', 'Task Completed'
        TASK_FAILED = 'TASK_FAILED', 'Task Failed'
        DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED', 'Document Uploaded'
        REMARKS_ADDED = 'REMARKS_ADDED', 'Remarks Added'
        INSTANCE_CANCELLED = 'INSTANCE_CANCELLED', 'Instance Cancelled'
        INSTANCE_COMPLETED = 'INSTANCE_COMPLETED', 'Instance Completed'

    instance = models.ForeignKey(WorkflowInstance, on_delete=models.CASCADE, related_name='history')
    action = models.CharField(max_length=30, choices=ActionType.choices)
    action_by = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='history_actions')

    # For MOVED actions
    from_station = models.ForeignKey(Station, on_delete=models.PROTECT, null=True, blank=True,
                                     related_name='history_from')
    to_station = models.ForeignKey(Station, on_delete=models.PROTECT, null=True, blank=True,
                                   related_name='history_to')

    # For TASK_* actions
    task_definition = models.ForeignKey(TaskDefinition, on_delete=models.PROTECT, null=True, blank=True)
    task_execution = models.ForeignKey('TaskExecution', on_delete=models.SET_NULL, null=True, blank=True)

    remarks = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = 'Workflow Instance Histories'
        indexes = [
            models.Index(fields=['instance', '-timestamp']),
            models.Index(fields=['action']),
        ]

    def __str__(self):
        return f"{self.instance.reference}: {self.get_action_display()} @ {self.timestamp}"

    def save(self, *args, **kwargs):
        """Enforce append-only: once created, cannot be updated."""
        if self.pk is not None:
            raise ValueError("WorkflowInstanceHistory is append-only. Cannot update.")
        super().save(*args, **kwargs)


# ── Task Execution ───────────────────────────────────────────

class TaskExecution(models.Model):
    """Runtime record of a task being executed within a workflow instance."""
    class ExecutionStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'
        SKIPPED = 'SKIPPED', 'Skipped'

    instance = models.ForeignKey(WorkflowInstance, on_delete=models.CASCADE, related_name='task_executions')
    task_definition = models.ForeignKey(TaskDefinition, on_delete=models.PROTECT, related_name='executions')
    station = models.ForeignKey(Station, on_delete=models.PROTECT, related_name='task_executions')

    status = models.CharField(max_length=20, choices=ExecutionStatus.choices, default=ExecutionStatus.PENDING)

    # Stores the user's actual response (varies by task type)
    # FORM: {"test_cases": 45, "summary": "..."}
    # CONFIRMATION: {"unit_tests_passed": true, "security_scan_done": false}
    # APPROVAL: {"decision": "Approved", "remarks": "..."}
    response_data = models.JSONField(default=dict, blank=True)

    executed_by = models.ForeignKey('accounts.User', on_delete=models.PROTECT, null=True, blank=True,
                                    related_name='task_executions')
    remarks = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)

    # Optimistic locking
    version = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.task_definition.name} — {self.status}"

    @property
    def is_required(self):
        return self.task_definition.is_required

    @property
    def is_completed(self):
        return self.status == self.ExecutionStatus.COMPLETED
