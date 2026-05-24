import time
from django.db import models
from apps.instances.models import WorkflowInstance, TaskExecution
from apps.workflows.models import Station


def document_upload_path(instance, filename):
    """Store as: workflows/{instance_ref}/{station_name}/{timestamp}_{filename}"""
    ts = int(time.time())
    safe_name = filename.replace(' ', '_')
    return (f"workflows/{instance.instance.reference}/"
            f"{instance.station.name}/{ts}_{safe_name}")


class Document(models.Model):
    """A file uploaded during workflow execution. Part of the Document Trail."""
    instance = models.ForeignKey(WorkflowInstance, on_delete=models.CASCADE, related_name='documents')
    station = models.ForeignKey(Station, on_delete=models.PROTECT, related_name='documents')
    task_execution = models.ForeignKey(TaskExecution, on_delete=models.SET_NULL,
                                       null=True, blank=True, related_name='documents')

    file = models.FileField(upload_to=document_upload_path)
    original_filename = models.CharField(max_length=500)
    file_size = models.PositiveBigIntegerField()
    content_type = models.CharField(max_length=100)

    uploaded_by = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='uploaded_documents')
    description = models.CharField(max_length=500, blank=True)
    tags = models.JSONField(default=list, blank=True)

    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['instance', '-uploaded_at']),
            models.Index(fields=['station']),
        ]

    def __str__(self):
        return self.original_filename

    def delete(self, *args, **kwargs):
        """Documents are immutable — cannot be deleted."""
        raise ValueError("Documents cannot be deleted. They are part of the immutable trail.")
