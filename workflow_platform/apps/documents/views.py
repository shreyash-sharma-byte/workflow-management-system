from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse

from apps.instances.models import WorkflowInstance, WorkflowInstanceHistory
from apps.documents.models import Document
from apps.instances.permissions import IsStationOwner


class DocumentViewSet(viewsets.GenericViewSet):
    """Document upload, list, download."""
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action == 'upload':
            return [IsAuthenticated(), IsStationOwner()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return Document.objects.filter(
            instance_id=self.kwargs['instance_pk']
        ).select_related('station', 'uploaded_by')

    def list(self, request, instance_pk=None):
        """Document trail for an instance."""
        qs = self.get_queryset()

        station_id = request.query_params.get('station_id')
        if station_id:
            qs = qs.filter(station_id=station_id)

        page = self.paginate_queryset(qs)
        results = []
        for d in (page or qs):
            results.append({
                'id': d.id,
                'original_filename': d.original_filename,
                'file_size': d.file_size,
                'file_size_display': _format_size(d.file_size),
                'content_type': d.content_type,
                'station': {'id': d.station.id, 'name': d.station.name},
                'uploaded_by': {'id': d.uploaded_by.id, 'username': d.uploaded_by.username,
                                'full_name': d.uploaded_by.get_full_name() or d.uploaded_by.username},
                'description': d.description,
                'tags': d.tags,
                'task_execution_id': d.task_execution_id,
                'uploaded_at': d.uploaded_at,
                'download_url': f'/api/v1/instances/{instance_pk}/documents/{d.id}/download/',
            })

        if page is not None:
            return self.get_paginated_response(results)
        return Response({'count': qs.count(), 'results': results})

    @action(detail=False, methods=['post'], url_path='upload')
    def upload(self, request, instance_pk=None):
        """Upload a document to an instance."""
        instance = get_object_or_404(WorkflowInstance, id=instance_pk)
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({'error': 'no_file', 'message': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        description = request.data.get('description', '')
        tags_str = request.data.get('tags', '')
        tags = [t.strip() for t in tags_str.split(',')] if tags_str else []
        task_execution_id = request.data.get('task_execution_id')

        doc = Document.objects.create(
            instance=instance,
            station=instance.current_station,
            task_execution_id=task_execution_id if task_execution_id else None,
            file=uploaded_file,
            original_filename=uploaded_file.name,
            file_size=uploaded_file.size,
            content_type=uploaded_file.content_type or 'application/octet-stream',
            uploaded_by=request.user,
            description=description,
            tags=tags,
        )

        # Create history entry
        history = WorkflowInstanceHistory.objects.create(
            instance=instance,
            action=WorkflowInstanceHistory.ActionType.DOCUMENT_UPLOADED,
            action_by=request.user,
            metadata={'filename': doc.original_filename, 'file_size': _format_size(doc.file_size)},
        )

        return Response({
            'id': doc.id,
            'original_filename': doc.original_filename,
            'file_size': doc.file_size,
            'file_size_display': _format_size(doc.file_size),
            'content_type': doc.content_type,
            'station': {'id': doc.station.id, 'name': doc.station.name},
            'uploaded_by': {'id': doc.uploaded_by.id, 'username': doc.uploaded_by.username},
            'description': doc.description,
            'tags': doc.tags,
            'task_execution_id': doc.task_execution_id,
            'uploaded_at': doc.uploaded_at,
            'download_url': f'/api/v1/instances/{instance_pk}/documents/{doc.id}/download/',
            'history_entry': {'id': history.id, 'action': history.action, 'timestamp': history.timestamp},
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, instance_pk=None, pk=None):
        """Download a document."""
        doc = get_object_or_404(Document, id=pk, instance_id=instance_pk)
        response = FileResponse(doc.file.open('rb'), content_type=doc.content_type)
        response['Content-Disposition'] = f'attachment; filename="{doc.original_filename}"'
        return response


def _format_size(size_bytes):
    if size_bytes >= 1_048_576:
        return f"{size_bytes / 1_048_576:.1f} MB"
    return f"{size_bytes / 1_024:.0f} KB"
