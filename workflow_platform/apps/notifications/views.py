from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from .models import Notification
from .serializers import NotificationSerializer


class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'


class NotificationListView(views.APIView):
    """List notifications for the current user with pagination and filters."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(recipient=request.user)

        # Filter by read/unread
        is_read = request.query_params.get('is_read')
        if is_read == 'false':
            qs = qs.filter(is_read=False)
        elif is_read == 'true':
            qs = qs.filter(is_read=True)

        # Filter by type
        notif_type = request.query_params.get('type')
        if notif_type:
            qs = qs.filter(notification_type=notif_type)

        unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        total_count = qs.count()

        paginator = NotificationPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = NotificationSerializer(page, many=True)

        return Response({
            'count': total_count,
            'unread_count': unread_count,
            'results': serializer.data,
        })


class NotificationUnreadCountView(views.APIView):
    """Quick unread count for the notification bell."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({'unread_count': count})


class NotificationMarkReadView(views.APIView):
    """Mark a notification as read."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        notif = get_object_or_404(Notification, id=pk, recipient=request.user)
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response({'ok': True})


class NotificationMarkAllReadView(views.APIView):
    """Mark all notifications as read."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'ok': True})
