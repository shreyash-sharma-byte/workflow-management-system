from django.db import models


class Notification(models.Model):
    """In-app notification for workflow events."""
    class NotificationType(models.TextChoices):
        INSTANCE_ASSIGNED = 'INSTANCE_ASSIGNED', 'Instance Assigned'
        TASK_READY = 'TASK_READY', 'Task Ready'
        TASK_COMPLETED = 'TASK_COMPLETED', 'Task Completed'
        INSTANCE_MOVED = 'INSTANCE_MOVED', 'Instance Moved'
        INSTANCE_COMPLETED = 'INSTANCE_COMPLETED', 'Instance Completed'
        INSTANCE_CANCELLED = 'INSTANCE_CANCELLED', 'Instance Cancelled'

    recipient = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=30, choices=NotificationType.choices)
    title = models.CharField(max_length=300)
    message = models.TextField(blank=True)
    link = models.CharField(max_length=500, blank=True)  # frontend route e.g. /instances/5
    instance_id = models.IntegerField(null=True, blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['recipient', 'is_read']),
        ]

    def __str__(self):
        return f"[{self.notification_type}] {self.title} → {self.recipient.username}"
