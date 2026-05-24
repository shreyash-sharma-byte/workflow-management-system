from django.contrib import admin
from .models import Document

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['original_filename', 'file_size_display', 'station', 'uploaded_by', 'uploaded_at']
    list_filter = ['station__template_version__template', 'uploaded_at']
    search_fields = ['original_filename', 'description']
    readonly_fields = ['file_size']

    def file_size_display(self, obj):
        if obj.file_size >= 1_048_576:
            return f"{obj.file_size / 1_048_576:.1f} MB"
        return f"{obj.file_size / 1_024:.0f} KB"
    file_size_display.short_description = 'File Size'
