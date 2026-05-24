from django.contrib import admin
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['notification_type', 'recipient_email', 'sent', 'created_at']
    list_filter = ['notification_type', 'sent']
