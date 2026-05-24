from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.workflows.models import (
    WorkflowTemplate, WorkflowTemplateVersion,
    Station, Transition, TaskDefinition,
)
from apps.workflows.serializers import (
    WorkflowTemplateListSerializer, WorkflowTemplateDetailSerializer,
    WorkflowTemplateCreateSerializer, WorkflowTemplateUpdateSerializer,
    TemplateVersionSerializer, TemplateVersionDetailSerializer,
    StationListSerializer, StationDetailSerializer,
    TransitionSerializer, TransitionDetailSerializer,
    TaskDefinitionSerializer,
)
from apps.instances.permissions import IsAdmin, IsAdminOrReadOnly


# ═══════════════════════════════════════════════════════════════
# Workflow Template ViewSet
# ═══════════════════════════════════════════════════════════════

class WorkflowTemplateViewSet(viewsets.ModelViewSet):
    """
    CRUD for workflow templates.
    Admin-only for write operations. Read for all authenticated users.
    """
    queryset = WorkflowTemplate.objects.all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'category']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'publish', 'create_draft']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'list':
            return WorkflowTemplateListSerializer
        if self.action in ['create']:
            return WorkflowTemplateCreateSerializer
        if self.action in ['update', 'partial_update']:
            return WorkflowTemplateUpdateSerializer
        return WorkflowTemplateDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Non-admin sees only published templates
        if not self.request.user.groups.filter(name='ADMIN').exists():
            qs = qs.filter(status=WorkflowTemplate.Status.PUBLISHED)
        return qs.select_related('current_version', 'draft_version', 'created_by')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def create(self, request, *args, **kwargs):
        """Create template with auto-generated draft version for editing."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            template = serializer.save(created_by=self.request.user)

            # Auto-create a draft version for editing
            draft = WorkflowTemplateVersion.objects.create(
                template=template,
                version_number=1,
                version_label='v1.0 (Draft)',
                published_by=self.request.user,
            )
            template.draft_version = draft
            template.save(update_fields=['draft_version'])

        output = WorkflowTemplateDetailSerializer(template, context={'request': request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        template = self.get_object()
        if template.status == WorkflowTemplate.Status.PUBLISHED:
            return Response(
                {'error': 'cannot_delete_published',
                 'message': 'Published templates cannot be deleted. Archive it instead.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    # ── Publish ──────────────────────────────────────

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Snapshots current draft into an immutable version."""
        template = self.get_object()

        if template.draft_version:
            draft = template.draft_version
        else:
            return Response(
                {'error': 'no_draft', 'message': 'Template has no draft to publish.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate
        errors = self._validate_for_publish(draft)
        if errors:
            return Response(
                {'error': 'validation_failed',
                 'message': 'Cannot publish. Fix the following issues.',
                 'details': errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        change_notes = request.data.get('change_notes', '')

        with transaction.atomic():
            # Draft becomes the published version
            draft.published_by = request.user
            draft.change_notes = change_notes
            # draft is already the new version — just mark template accordingly
            draft.save()

            # If there was a previous published version, unlink it
            old_current = template.current_version
            if old_current and old_current != draft:
                old_current.next_draft = draft
                old_current.save()

            template.current_version = draft
            template.draft_version = None
            template.status = WorkflowTemplate.Status.PUBLISHED
            template.save()

        return Response({
            'success': True,
            'message': f'Template published as {draft.version_label}',
            'template_id': template.id,
            'version': TemplateVersionSerializer(draft).data,
        }, status=status.HTTP_201_CREATED)

    def _validate_for_publish(self, draft):
        errors = {}
        stations = draft.stations.all()

        # Must have exactly one START
        start_count = stations.filter(station_type=Station.StationType.START).count()
        if start_count == 0:
            errors['missing_start_station'] = True
        elif start_count > 1:
            errors['multiple_start_stations'] = True

        # Must have at least one END
        if stations.filter(station_type=Station.StationType.END).count() == 0:
            errors['missing_end_station'] = True

        # Every non-END station must have at least one outgoing transition
        stranded = []
        for s in stations.exclude(station_type=Station.StationType.END):
            if s.outgoing_transitions.count() == 0:
                stranded.append(s.name)
        if stranded:
            errors['stations_without_transitions'] = stranded

        return errors if errors else None

    # ── Create Draft ──────────────────────────────────

    @action(detail=True, methods=['post'])
    def create_draft(self, request, pk=None):
        """Clone the latest published version into a new editable draft."""
        template = self.get_object()

        if not template.current_version:
            return Response(
                {'error': 'no_published_version',
                 'message': 'Template has no published version to create a draft from.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if template.draft_version:
            return Response(
                {'error': 'draft_exists',
                 'message': f'A draft ({template.draft_version.version_label}) already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        source = template.current_version
        next_num = source.version_number + 1
        label = f"v{next_num}.0"

        change_notes = request.data.get('change_notes', '')

        with transaction.atomic():
            # Clone the version
            draft = WorkflowTemplateVersion.objects.create(
                template=template,
                version_number=next_num,
                version_label=f"{label} (Draft)",
                published_by=request.user,
                change_notes=change_notes,
            )

            # Deep clone stations
            station_map = {}
            for s in source.stations.all():
                old_id = s.id
                s.pk = None
                s.template_version = draft
                s.save()
                station_map[old_id] = s

                # Clone task definitions
                for td in source.stations.get(id=old_id).task_definitions.all():
                    td.pk = None
                    td.station = s
                    td.save()

            # Clone transitions with new station IDs
            for t in source.transitions.all():
                t.pk = None
                t.template_version = draft
                t.from_station = station_map[t.from_station_id]
                t.to_station = station_map[t.to_station_id]
                t.save()

            template.draft_version = draft
            template.save()

        return Response({
            'success': True,
            'message': f'New draft {label} created from {source.version_label}',
            'draft_version': {
                'id': draft.id,
                'version_label': draft.version_label,
                'version_number': draft.version_number,
                'created_from_version': source.id,
                'stations_count': draft.stations.count(),
                'transitions_count': draft.transitions.count(),
                'tasks_count': TaskDefinition.objects.filter(station__template_version=draft).count(),
            }
        }, status=status.HTTP_201_CREATED)

    # ── Versions ──────────────────────────────────────

    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        template = self.get_object()
        versions = template.versions.all().order_by('-version_number')
        serializer = TemplateVersionSerializer(versions, many=True)
        return Response({'count': versions.count(), 'results': serializer.data})

    @action(detail=True, methods=['get'], url_path='versions/(?P<version_id>[^/.]+)')
    def version_detail(self, request, pk=None, version_id=None):
        template = self.get_object()
        version = get_object_or_404(WorkflowTemplateVersion, id=version_id, template=template)
        serializer = TemplateVersionDetailSerializer(version)
        return Response(serializer.data)


# ═══════════════════════════════════════════════════════════════
# Station ViewSet (operates on draft)
# ═══════════════════════════════════════════════════════════════

class StationViewSet(viewsets.ModelViewSet):
    """CRUD for stations. Operates on the template's draft version."""
    serializer_class = StationDetailSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_serializer_class(self):
        if self.action == 'list':
            return StationListSerializer
        return StationDetailSerializer

    def get_queryset(self):
        template = get_object_or_404(WorkflowTemplate, id=self.kwargs['template_pk'])
        version = template.draft_version or template.current_version
        if not version:
            # Auto-create draft if needed
            version = WorkflowTemplateVersion.objects.create(
                template=template,
                version_number=1,
                version_label='v1.0 (Draft)',
                published_by=self.request.user,
            )
            template.draft_version = version
            template.save(update_fields=['draft_version'])
        return version.stations.all().order_by('order')

    def perform_create(self, serializer):
        template = get_object_or_404(WorkflowTemplate, id=self.kwargs['template_pk'])
        version = template.draft_version or template.current_version
        if not version:
            version = WorkflowTemplateVersion.objects.create(
                template=template,
                version_number=1,
                version_label='v1.0 (Draft)',
                published_by=self.request.user,
            )
            template.draft_version = version
            template.save(update_fields=['draft_version'])
        serializer.save(template_version=version)


# ═══════════════════════════════════════════════════════════════
# TaskDefinition ViewSet (operates on draft)
# ═══════════════════════════════════════════════════════════════

class TaskDefinitionViewSet(viewsets.ModelViewSet):
    """CRUD for task definitions on a station."""
    serializer_class = TaskDefinitionSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        station = get_object_or_404(Station, id=self.kwargs['station_pk'])
        return station.task_definitions.all().order_by('order')

    def perform_create(self, serializer):
        station = get_object_or_404(Station, id=self.kwargs['station_pk'])
        serializer.save(station=station)


# ═══════════════════════════════════════════════════════════════
# Transition ViewSet (operates on draft)
# ═══════════════════════════════════════════════════════════════

class TransitionViewSet(viewsets.ModelViewSet):
    """CRUD for transitions. Operates on the template's draft version."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return TransitionDetailSerializer
        return TransitionSerializer

    def get_queryset(self):
        template = get_object_or_404(WorkflowTemplate, id=self.kwargs['template_pk'])
        version = template.draft_version or template.current_version
        if not version:
            version = self._ensure_draft(template)
        return version.transitions.all().select_related('from_station', 'to_station')

    def perform_create(self, serializer):
        template = get_object_or_404(WorkflowTemplate, id=self.kwargs['template_pk'])
        version = template.draft_version or template.current_version
        if not version:
            version = self._ensure_draft(template)

        from_station = serializer.validated_data['from_station']
        to_station = serializer.validated_data['to_station']

        if from_station.template_version_id != version.id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'from_station': 'Station does not belong to this template version.'})
        if to_station.template_version_id != version.id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'to_station': 'Station does not belong to this template version.'})
        if from_station.is_end:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'from_station': 'Cannot create transitions from an END station.'})
        if to_station.station_type == Station.StationType.START:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'to_station': 'Cannot create transitions to a START station.'})

        serializer.save(template_version=version)

    def _ensure_draft(self, template):
        """Auto-create draft version if none exists."""
        version = WorkflowTemplateVersion.objects.create(
            template=template,
            version_number=1,
            version_label='v1.0 (Draft)',
            published_by=self.request.user,
        )
        template.draft_version = version
        template.save(update_fields=['draft_version'])
        return version
