from rest_framework import serializers
from apps.instances.models import (
    WorkflowInstance, WorkflowInstanceHistory, TaskExecution,
)
from apps.workflows.models import Station, TaskDefinition
from apps.workflows.serializers import StationDetailSerializer


# ── User Mini ───────────────────────────────────────────────

class UserMiniSerializer(serializers.Serializer):
    """Lightweight user reference — avoids importing accounts.User in serializer field."""
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    full_name = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


# ── Instance List ───────────────────────────────────────────

class WorkflowInstanceListSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template_version.template.name', read_only=True)
    version_label = serializers.CharField(source='template_version.version_label', read_only=True)
    current_station_name = serializers.CharField(source='current_station.name', read_only=True)
    current_station_type = serializers.CharField(source='current_station.station_type', read_only=True)
    initiated_by_name = serializers.CharField(source='initiated_by.get_full_name', read_only=True)
    current_owner_name = serializers.CharField(source='current_owner.get_full_name', read_only=True)
    pending_required_tasks = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowInstance
        fields = ['id', 'reference', 'title', 'status', 'template_version',
                  'template_name', 'version_label', 'current_station',
                  'current_station_name', 'current_station_type',
                  'current_owner', 'current_owner_name',
                  'initiated_by', 'initiated_by_name',
                  'instance_data', 'pending_required_tasks',
                  'public_token',
                  'created_at', 'updated_at']

    def get_pending_required_tasks(self, obj):
        return obj.task_executions.filter(
            station=obj.current_station,
            task_definition__is_required=True,
        ).exclude(status=TaskExecution.ExecutionStatus.COMPLETED).count()


# ── Instance Detail ─────────────────────────────────────────

class WorkflowInstanceDetailSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template_version.template.name', read_only=True)
    version_label = serializers.CharField(source='template_version.version_label', read_only=True)
    initiated_by_info = serializers.SerializerMethodField()
    current_owner_info = serializers.SerializerMethodField()
    current_station_info = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    station_timeline = serializers.SerializerMethodField()
    user_permissions = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowInstance
        fields = ['id', 'reference', 'title', 'status', 'version',
                  'template_version', 'template_name', 'version_label',
                  'current_station', 'current_station_info',
                  'current_owner', 'current_owner_info',
                  'initiated_by', 'initiated_by_info',
                  'instance_data', 'user_permissions', 'progress',
                  'station_timeline', 'public_token',
                  'created_at', 'updated_at', 'completed_at']

    def get_initiated_by_info(self, obj):
        u = obj.initiated_by
        return {'id': u.id, 'username': u.username, 'full_name': u.get_full_name() or u.username}

    def get_current_owner_info(self, obj):
        if obj.current_owner:
            u = obj.current_owner
            return {'id': u.id, 'username': u.username, 'full_name': u.get_full_name() or u.username}
        return None

    def get_current_station_info(self, obj):
        s = obj.current_station
        roles = [{'id': r.id, 'name': r.name, 'display_name': r.name.replace('_', ' ').title()}
                 for r in s.allowed_roles.all()]
        return {
            'id': s.id, 'name': s.name, 'station_type': s.station_type,
            'description': s.description, 'allowed_roles': roles,
        }

    def get_user_permissions(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return {'can_execute_tasks': False, 'can_move_workflow': False,
                    'can_upload_documents': False, 'reason_if_blocked': 'Not authenticated'}

        user_roles = set(request.user.groups.values_list('name', flat=True))
        station_roles = set(obj.current_station.allowed_roles.values_list('name', flat=True))
        can_act_on_station = bool(user_roles.intersection(station_roles)) if station_roles else True

        pending = obj.task_executions.filter(
            station=obj.current_station,
            task_definition__is_required=True,
        ).exclude(status=TaskExecution.ExecutionStatus.COMPLETED).exists()

        # Per-task permissions: which tasks can this user execute?
        executable_tasks = []
        for te in obj.task_executions.filter(station=obj.current_station):
            td = te.task_definition
            task_roles = set(td.allowed_roles.values_list('name', flat=True))
            if task_roles:
                can_exec = bool(user_roles.intersection(task_roles))
            else:
                can_exec = can_act_on_station  # inherit station
            executable_tasks.append({'task_execution_id': te.id, 'can_execute': can_exec})

        return {
            'can_execute_tasks': can_act_on_station,
            'can_move_workflow': can_act_on_station and not pending,
            'can_upload_documents': can_act_on_station,
            'reason_if_blocked': 'Required tasks pending' if (can_act_on_station and pending) else None,
            'executable_tasks': executable_tasks,
        }

    def get_progress(self, obj):
        version = obj.template_version
        stations = version.stations.all().order_by('order')
        history_moves = {
            h.from_station_id: h for h in obj.history.filter(
                action__in=['MOVED', 'INSTANCE_CREATED']
            ).order_by('timestamp')
        }

        result = []
        current_reached = False
        for s in stations:
            if s.id == obj.current_station_id:
                status = 'CURRENT'
                current_reached = True
            elif current_reached:
                status = 'PENDING'
            else:
                status = 'COMPLETED'

            result.append({
                'station': {'id': s.id, 'name': s.name, 'station_type': s.station_type},
                'status': status,
            })
        return {
            'total_stations': stations.count(),
            'completed_stations': sum(1 for r in result if r['status'] == 'COMPLETED'),
            'stations': result,
        }

    def get_station_timeline(self, obj):
        timeline = []
        for h in obj.history.filter(action__in=['INSTANCE_CREATED', 'MOVED', 'INSTANCE_COMPLETED']).order_by('timestamp'):
            entry = {
                'timestamp': h.timestamp,
                'action': h.action,
                'by': h.action_by.get_full_name() or h.action_by.username,
            }
            if h.from_station and h.to_station:
                entry['detail'] = f"{h.from_station.name} → {h.to_station.name}"
                entry['remarks'] = h.remarks
            elif h.action == 'INSTANCE_CREATED':
                entry['detail'] = f"Instance created from {obj.template_version}"
            timeline.append(entry)
        return timeline


# ── Instance Create ─────────────────────────────────────────

class WorkflowInstanceCreateSerializer(serializers.Serializer):
    template_id = serializers.IntegerField()
    title = serializers.CharField(max_length=255)
    instance_data = serializers.JSONField(default=dict, required=False)

    def validate_template_id(self, value):
        from apps.workflows.models import WorkflowTemplate
        try:
            template = WorkflowTemplate.objects.get(id=value)
        except WorkflowTemplate.DoesNotExist:
            raise serializers.ValidationError('Template not found')
        if template.status != 'PUBLISHED' or not template.current_version:
            raise serializers.ValidationError('Template is not published')
        return value


# ── Move ────────────────────────────────────────────────────

class WorkflowMoveSerializer(serializers.Serializer):
    to_station_id = serializers.IntegerField()
    remarks = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_to_station_id(self, value):
        if not Station.objects.filter(id=value).exists():
            raise serializers.ValidationError('Station not found')
        return value


# ── Task Execution ──────────────────────────────────────────

class TaskDefinitionMiniSerializer(serializers.ModelSerializer):
    allowed_roles = serializers.SerializerMethodField()

    class Meta:
        model = TaskDefinition
        fields = ['id', 'name', 'task_type', 'is_required', 'order', 'task_config', 'allowed_roles']

    def get_allowed_roles(self, obj):
        """Task-level roles. Empty list = inherit station roles."""
        return [{'id': r.id, 'name': r.name, 'display_name': r.name.replace('_', ' ').title()}
                for r in obj.allowed_roles.all()]


class TaskExecutionSerializer(serializers.ModelSerializer):
    task_definition = TaskDefinitionMiniSerializer(read_only=True)
    executed_by_name = serializers.CharField(source='executed_by.get_full_name', read_only=True)
    documents_info = serializers.SerializerMethodField()

    class Meta:
        model = TaskExecution
        fields = ['id', 'task_definition', 'station', 'status',
                  'response_data', 'executed_by', 'executed_by_name',
                  'remarks', 'documents_info',
                  'created_at', 'started_at', 'completed_at']

    def get_documents_info(self, obj):
        return [
            {'id': d.id, 'original_filename': d.original_filename}
            for d in obj.documents.all()
        ]


class TaskSubmitSerializer(serializers.Serializer):
    response_data = serializers.JSONField(default=dict)
    remarks = serializers.CharField(required=False, allow_blank=True, default='')


# ── History ─────────────────────────────────────────────────

class WorkflowInstanceHistorySerializer(serializers.ModelSerializer):
    action_by_name = serializers.CharField(source='action_by.get_full_name', read_only=True)
    from_station_name = serializers.CharField(source='from_station.name', read_only=True)
    to_station_name = serializers.CharField(source='to_station.name', read_only=True)
    task_name = serializers.CharField(source='task_definition.name', read_only=True)
    task_type = serializers.CharField(source='task_definition.task_type', read_only=True)

    class Meta:
        model = WorkflowInstanceHistory
        fields = ['id', 'action', 'action_by', 'action_by_name',
                  'from_station', 'from_station_name',
                  'to_station', 'to_station_name',
                  'task_definition', 'task_name', 'task_type',
                  'remarks', 'metadata', 'timestamp']


# ── Cancel ──────────────────────────────────────────────────

class WorkflowCancelSerializer(serializers.Serializer):
    remarks = serializers.CharField(required=False, allow_blank=True, default='')


# ── Instance Update ─────────────────────────────────────────

class WorkflowInstanceUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowInstance
        fields = ['title', 'instance_data']
