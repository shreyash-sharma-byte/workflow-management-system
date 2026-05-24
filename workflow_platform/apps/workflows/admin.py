from django.contrib import admin
from .models import (
    WorkflowTemplate, WorkflowTemplateVersion,
    Station, Transition, TaskDefinition,
)

@admin.register(WorkflowTemplate)
class WorkflowTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'status', 'created_by', 'created_at']
    list_filter = ['status', 'category']
    search_fields = ['name', 'description']

@admin.register(WorkflowTemplateVersion)
class WorkflowTemplateVersionAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'version_number', 'published_by', 'published_at']
    list_filter = ['template']

@admin.register(Station)
class StationAdmin(admin.ModelAdmin):
    list_display = ['name', 'station_type', 'template_version', 'order']
    list_filter = ['station_type', 'template_version__template']

@admin.register(Transition)
class TransitionAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'from_station', 'to_station', 'label']
    list_filter = ['template_version__template']

@admin.register(TaskDefinition)
class TaskDefinitionAdmin(admin.ModelAdmin):
    list_display = ['name', 'task_type', 'station', 'is_required', 'order']
    list_filter = ['task_type', 'is_required']
