from django.contrib import admin
from .models import WorkflowInstance, WorkflowInstanceHistory, TaskExecution

@admin.register(WorkflowInstance)
class WorkflowInstanceAdmin(admin.ModelAdmin):
    list_display = ['reference', 'title', 'status', 'current_station', 'initiated_by', 'created_at']
    list_filter = ['status', 'template_version__template']
    search_fields = ['reference', 'title']
    readonly_fields = ['version']

@admin.register(WorkflowInstanceHistory)
class WorkflowInstanceHistoryAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'action', 'action_by', 'timestamp']
    list_filter = ['action']
    readonly_fields = ['instance', 'action', 'action_by', 'from_station', 'to_station', 'timestamp']
    # Prevent add/delete in admin for immutable history
    def has_add_permission(self, request):
        return False
    def has_delete_permission(self, request, obj=None):
        return False

@admin.register(TaskExecution)
class TaskExecutionAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'status', 'executed_by', 'created_at']
    list_filter = ['status', 'task_definition__task_type']
    readonly_fields = ['version']
