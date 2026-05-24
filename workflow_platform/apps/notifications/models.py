from django.db import models
from apps.instances.models import WorkflowInstance


class Notification(models.Model):
    """Email notification record (Phase 2)."""
    class NotificationType(models.TextChoices):
        WORKFLOW_MOVED = 'WORKFLOW_MOVED', 'Workflow Moved'
        TASK_ASSIGNED = 'TASK_ASSIGNED', 'Task Assigned'
        TASK_COMPLETED = 'TASK_COMPLETED', 'Task Completed'
        INSTANCE_COMPLETED = 'INSTANCE_COMPLETED', 'Instance Completed'
        INSTANCE_BLOCKED = 'INSTANCE_BLOCKED', 'Instance Blocked'

    instance = models.ForeignKey(WorkflowInstance, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=30, choices=NotificationType.choices)
    recipient = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='notifications')
    recipient_email = models.EmailField()
    cc_emails = models.JSONField(default=list, blank=True)
    subject = models.CharField(max_length=500)
    body_html = models.TextField()
    sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.notification_type} → {self.recipient_email}"
