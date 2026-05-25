from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.workflows.models import WorkflowTemplate
from apps.instances.models import (
    WorkflowInstance, WorkflowInstanceHistory, TaskExecution,
)
from apps.instances.engine import WorkflowEngine, WorkflowEngineError
from apps.instances.serializers import (
    WorkflowInstanceListSerializer, WorkflowInstanceDetailSerializer,
    WorkflowInstanceCreateSerializer, WorkflowInstanceUpdateSerializer,
    WorkflowMoveSerializer, WorkflowCancelSerializer,
    TaskExecutionSerializer, TaskSubmitSerializer,
    WorkflowInstanceHistorySerializer,
)
from apps.instances.permissions import (
    IsInitiator, IsStationOwner, IsInstanceInitiator,
    IsInstanceOwnerOrAdmin, CanViewInstance, IsAdmin,
)


class WorkflowInstanceViewSet(viewsets.ModelViewSet):
    """
    Workflow instance CRUD + engine operations.
    """
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'current_station']
    search_fields = ['reference', 'title']
    ordering_fields = ['reference', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_permissions(self):
        action_perms = {
            'create': [IsAuthenticated(), IsInitiator()],
            'update': [IsAuthenticated(), IsAdmin()],
            'partial_update': [IsAuthenticated(), IsAdmin()],
            'destroy': [IsAuthenticated(), IsAdmin()],
            'move': [IsAuthenticated(), IsStationOwner()],
            'cancel': [IsAuthenticated(), IsInstanceOwnerOrAdmin()],
            'allowed_transitions': [IsAuthenticated()],
            'tasks': [IsAuthenticated()],
            'history': [IsAuthenticated()],
        }
        perms = action_perms.get(self.action, [IsAuthenticated()])
        # Add CanViewInstance for read actions
        if self.action in ['retrieve', 'list']:
            return [IsAuthenticated()]  # Filtered in get_queryset
        return perms

    def get_serializer_class(self):
        serializer_map = {
            'list': WorkflowInstanceListSerializer,
            'retrieve': WorkflowInstanceDetailSerializer,
            'create': WorkflowInstanceCreateSerializer,
            'update': WorkflowInstanceUpdateSerializer,
            'partial_update': WorkflowInstanceUpdateSerializer,
            'move': WorkflowMoveSerializer,
            'cancel': WorkflowCancelSerializer,
            'tasks': TaskExecutionSerializer,
            'allowed_transitions': None,
        }
        return serializer_map.get(self.action, WorkflowInstanceDetailSerializer)

    def get_queryset(self):
        user = self.request.user
        qs = WorkflowInstance.objects.select_related(
            'template_version__template', 'current_station',
            'initiated_by', 'current_owner',
        )

        # Admin/Auditor sees all
        if user.groups.filter(name__in=['ADMIN', 'AUDITOR']).exists():
            pass
        # Initiator sees their own
        elif user.groups.filter(name__in=['PM_TEAM', 'PM_MANAGER']).exists():
            qs = qs.filter(initiated_by=user)
        # Others see instances at their stations
        else:
            user_roles = set(user.groups.values_list('name', flat=True))
            if user_roles:
                qs = qs.filter(current_station__allowed_roles__name__in=user_roles).distinct()
            else:
                qs = qs.none()

        # Filter query params
        assigned_to_me = self.request.query_params.get('assigned_to_me')
        if assigned_to_me and assigned_to_me.lower() == 'true':
            qs = qs.filter(current_owner=user)

        initiated_by_me = self.request.query_params.get('initiated_by_me')
        if initiated_by_me and initiated_by_me.lower() == 'true':
            qs = qs.filter(initiated_by=user)

        template_id = self.request.query_params.get('template_id')
        if template_id:
            qs = qs.filter(template_version__template_id=template_id)

        return qs

    # ── Create ────────────────────────────────────────

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        template = WorkflowTemplate.objects.get(id=serializer.validated_data['template_id'])
        version = template.current_version

        engine = WorkflowEngine()
        try:
            instance = engine.create_instance(
                template_version=version,
                user=request.user,
                title=serializer.validated_data['title'],
                instance_data=serializer.validated_data.get('instance_data', {}),
            )
        except WorkflowEngineError as e:
            return Response(
                {'error': e.error_code, 'message': str(e), 'details': e.details},
                status=e.status_code
            )

        output = WorkflowInstanceDetailSerializer(instance, context={'request': request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    # ── Update ────────────────────────────────────────

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance.is_active:
            return Response(
                {'error': 'not_active', 'message': 'Can only update active instances.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().update(request, *args, **kwargs)

    # ── MOVE (The Engine) ─────────────────────────────

    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        """Move workflow to another station. All validation via engine."""
        instance = self.get_object()
        serializer = WorkflowMoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from apps.workflows.models import Station
        to_station = get_object_or_404(Station, id=serializer.validated_data['to_station_id'])

        engine = WorkflowEngine()
        try:
            result = engine.move(
                instance=instance,
                to_station=to_station,
                user=request.user,
                remarks=serializer.validated_data.get('remarks', ''),
            )
        except WorkflowEngineError as e:
            return Response(
                {'error': e.error_code, 'message': str(e), 'details': e.details},
                status=e.status_code
            )

        # Build response
        instance = result['instance']
        transition_qs = instance.template_version.transitions.filter(
            from_station=result['from_station'],
            to_station=result['to_station'],
        )

        response_data = {
            'success': True,
            'message': f"Workflow moved: {result['from_station'].name} → {result['to_station'].name}",
            'transition': {
                'id': transition_qs.first().id if transition_qs.exists() else None,
                'label': transition_qs.first().label if transition_qs.exists() else '',
                'from_station': {'id': result['from_station'].id, 'name': result['from_station'].name},
                'to_station': {'id': result['to_station'].id, 'name': result['to_station'].name},
            },
            'instance': {
                'id': instance.id,
                'reference': instance.reference,
                'status': instance.status,
                'current_station': {'id': instance.current_station.id, 'name': instance.current_station.name, 'station_type': instance.current_station.station_type},
                'version': instance.version,
                'updated_at': instance.updated_at,
                'completed_at': instance.completed_at,
            },
            'new_tasks_created': [
                {'id': t.id, 'task_name': t.task_definition.name, 'task_type': t.task_definition.task_type}
                for t in result['new_tasks']
            ],
            'history_entry': {
                'id': result['history_entry'].id,
                'action': result['history_entry'].action,
                'timestamp': result['history_entry'].timestamp,
            }
        }

        return Response(response_data)

    # ── Allowed Transitions ───────────────────────────

    @action(detail=True, methods=['get'])
    def allowed_transitions(self, request, pk=None):
        """Get available moves from current station."""
        instance = self.get_object()
        current = instance.current_station

        transitions = current.outgoing_transitions.select_related('to_station').all()
        pending_required = instance.task_executions.filter(
            station=current,
            task_definition__is_required=True,
        ).exclude(status=TaskExecution.ExecutionStatus.COMPLETED).exists()

        transition_list = []
        for t in transitions:
            transition_list.append({
                'id': t.id,
                'to_station': {'id': t.to_station.id, 'name': t.to_station.name,
                               'station_type': t.to_station.station_type},
                'label': t.label,
                'remarks_required': t.remarks_required,
                'disabled': pending_required,
            })

        response = {
            'current_station': {'id': current.id, 'name': current.name},
            'can_move': not pending_required,
            'blocked_reason': f'{pending_required} required task(s) pending' if pending_required else None,
            'transitions': transition_list,
        }

        return Response(response)

    # ── Cancel ────────────────────────────────────────

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        instance = self.get_object()
        serializer = WorkflowCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        engine = WorkflowEngine()
        try:
            instance, history = engine.cancel_instance(
                instance=instance,
                user=request.user,
                remarks=serializer.validated_data.get('remarks', ''),
            )
        except WorkflowEngineError as e:
            return Response(
                {'error': e.error_code, 'message': str(e)},
                status=e.status_code
            )

        return Response({
            'success': True,
            'message': f'{instance.reference} has been cancelled.',
            'instance': {
                'id': instance.id,
                'reference': instance.reference,
                'status': instance.status,
                'updated_at': instance.updated_at,
            },
            'history_entry': {
                'id': history.id,
                'action': history.action,
                'timestamp': history.timestamp,
            }
        })

    # ── Tasks ─────────────────────────────────────────

    @action(detail=True, methods=['get'])
    def tasks(self, request, pk=None):
        """List task executions at the current station."""
        instance = self.get_object()
        tasks = instance.task_executions.filter(
            station=instance.current_station
        ).select_related('task_definition', 'executed_by').prefetch_related('documents').order_by(
            'task_definition__order'
        )

        response_data = {
            'station': {'id': instance.current_station.id, 'name': instance.current_station.name},
            'count': tasks.count(),
            'results': TaskExecutionSerializer(tasks, many=True).data,
        }
        return Response(response_data)

    # ── History ───────────────────────────────────────

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Get immutable audit log."""
        instance = self.get_object()
        qs = instance.history.all().select_related('action_by', 'from_station', 'to_station', 'task_definition')

        action_filter = request.query_params.get('action')
        if action_filter:
            qs = qs.filter(action=action_filter)

        from_date = request.query_params.get('from_date')
        if from_date:
            qs = qs.filter(timestamp__gte=from_date)

        to_date = request.query_params.get('to_date')
        if to_date:
            qs = qs.filter(timestamp__lte=to_date)

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = WorkflowInstanceHistorySerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = WorkflowInstanceHistorySerializer(qs, many=True)
        return Response({'count': qs.count(), 'results': serializer.data})


# ═══════════════════════════════════════════════════════════════
# TaskExecution ViewSet
# ═══════════════════════════════════════════════════════════════

class TaskExecutionViewSet(viewsets.GenericViewSet):
    """Task execution operations: start, submit, save-draft."""
    permission_classes = [IsAuthenticated, IsStationOwner]
    serializer_class = TaskSubmitSerializer

    def get_queryset(self):
        return TaskExecution.objects.filter(
            instance_id=self.kwargs['instance_pk']
        ).select_related('task_definition', 'station')

    def get_object(self):
        return get_object_or_404(TaskExecution, id=self.kwargs['pk'], instance_id=self.kwargs['instance_pk'])

    @action(detail=True, methods=['post'])
    def start(self, request, instance_pk=None, pk=None):
        task_exec = self.get_object()
        engine = WorkflowEngine()
        try:
            engine.start_task(task_exec, request.user)
        except WorkflowEngineError as e:
            return Response({'error': e.error_code, 'message': str(e)}, status=e.status_code)
        return Response({'id': task_exec.id, 'status': task_exec.status, 'started_at': task_exec.started_at})

    @action(detail=True, methods=['post'])
    def submit(self, request, instance_pk=None, pk=None):
        task_exec = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        engine = WorkflowEngine()
        try:
            engine.submit_task(
                task_execution=task_exec,
                user=request.user,
                response_data=serializer.validated_data.get('response_data', {}),
                remarks=serializer.validated_data.get('remarks', ''),
            )
        except WorkflowEngineError as e:
            return Response(
                {'error': e.error_code, 'message': str(e), 'details': e.details},
                status=e.status_code
            )

        return Response({
            'id': task_exec.id,
            'status': task_exec.status,
            'response_data': task_exec.response_data,
            'completed_at': task_exec.completed_at,
            'history_entry': {
                'action': 'TASK_COMPLETED',
                'timestamp': task_exec.completed_at,
            }
        })

    @action(detail=True, methods=['post'])
    def save_draft(self, request, instance_pk=None, pk=None):
        task_exec = self.get_object()
        if task_exec.status not in ['PENDING', 'IN_PROGRESS']:
            return Response(
                {'error': 'invalid_state', 'message': f'Task is {task_exec.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        response_data = request.data.get('response_data', {})
        task_exec.response_data = response_data
        task_exec.status = TaskExecution.ExecutionStatus.IN_PROGRESS
        if not task_exec.started_at:
            task_exec.started_at = timezone.now()
        task_exec.executed_by = request.user
        task_exec.save()

        return Response({'id': task_exec.id, 'status': task_exec.status, 'message': 'Draft saved'})
