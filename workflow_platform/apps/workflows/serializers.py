from rest_framework import serializers
from django.contrib.auth.models import Group
from apps.workflows.models import (
    WorkflowTemplate, WorkflowTemplateVersion,
    Station, Transition, TaskDefinition,
)


# ── Roles ───────────────────────────────────────────────────

class RoleField(serializers.PrimaryKeyRelatedField):
    """Accepts role IDs but serializes as full role objects."""
    def __init__(self, **kwargs):
        kwargs['queryset'] = Group.objects.all()
        kwargs['many'] = True
        kwargs['required'] = False
        super().__init__(**kwargs)


class RoleNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']

    def to_representation(self, instance):
        return {
            'id': instance.id,
            'name': instance.name,
            'display_name': instance.name.replace('_', ' ').title(),
        }


# ── Task Definition ─────────────────────────────────────────

class TaskDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskDefinition
        fields = ['id', 'name', 'description', 'task_type', 'is_required',
                  'order', 'task_config', 'created_at']
        read_only_fields = ['id', 'created_at']


# ── Station ─────────────────────────────────────────────────

class StationListSerializer(serializers.ModelSerializer):
    """Compact station for list views."""
    allowed_roles = RoleNestedSerializer(many=True, read_only=True)
    task_count = serializers.IntegerField(source='task_definitions.count', read_only=True)
    outgoing_transition_count = serializers.IntegerField(source='outgoing_transitions.count', read_only=True)

    class Meta:
        model = Station
        fields = ['id', 'name', 'description', 'station_type', 'order',
                  'auto_move', 'allowed_roles', 'task_count', 'outgoing_transition_count']


class StationDetailSerializer(serializers.ModelSerializer):
    allowed_roles = RoleNestedSerializer(many=True, read_only=True)
    tasks = TaskDefinitionSerializer(source='task_definitions', many=True, read_only=True)
    allowed_role_ids = serializers.PrimaryKeyRelatedField(
        source='allowed_roles', queryset=Group.objects.all(), many=True, write_only=True, required=False
    )

    class Meta:
        model = Station
        fields = ['id', 'name', 'description', 'station_type', 'order',
                  'auto_move', 'configuration', 'allowed_roles', 'allowed_role_ids',
                  'tasks', 'created_at']
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        role_ids = validated_data.pop('allowed_roles', [])
        station = super().create(validated_data)
        if role_ids:
            station.allowed_roles.set(role_ids)
        return station

    def update(self, instance, validated_data):
        role_ids = validated_data.pop('allowed_roles', None)
        station = super().update(instance, validated_data)
        if role_ids is not None:
            station.allowed_roles.set(role_ids)
        return station


# ── Transition ──────────────────────────────────────────────

class TransitionSerializer(serializers.ModelSerializer):
    from_station_name = serializers.CharField(source='from_station.name', read_only=True)
    to_station_name = serializers.CharField(source='to_station.name', read_only=True)

    class Meta:
        model = Transition
        fields = ['id', 'from_station', 'to_station', 'from_station_name',
                  'to_station_name', 'label', 'remarks_required', 'created_at']
        read_only_fields = ['id', 'created_at']


class TransitionDetailSerializer(serializers.ModelSerializer):
    from_station = serializers.SerializerMethodField()
    to_station = serializers.SerializerMethodField()

    class Meta:
        model = Transition
        fields = ['id', 'from_station', 'to_station', 'label',
                  'remarks_required', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_from_station(self, obj):
        return {'id': obj.from_station.id, 'name': obj.from_station.name}

    def get_to_station(self, obj):
        return {'id': obj.to_station.id, 'name': obj.to_station.name}


# ── Template Version ────────────────────────────────────────

class TemplateVersionSerializer(serializers.ModelSerializer):
    published_by_name = serializers.CharField(source='published_by.get_full_name', read_only=True)
    stations_count = serializers.IntegerField(source='stations.count', read_only=True)
    instance_count = serializers.IntegerField(source='instances.count', read_only=True)

    class Meta:
        model = WorkflowTemplateVersion
        fields = ['id', 'version_label', 'version_number', 'published_by',
                  'published_by_name', 'published_at', 'change_notes',
                  'stations_count', 'instance_count']


class TemplateVersionDetailSerializer(serializers.ModelSerializer):
    """Full version detail with stations, transitions, tasks."""
    stations = StationDetailSerializer(many=True, read_only=True)
    transitions = TransitionDetailSerializer(many=True, read_only=True)
    published_by_name = serializers.CharField(source='published_by.get_full_name', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)

    class Meta:
        model = WorkflowTemplateVersion
        fields = ['id', 'version_label', 'version_number', 'template_id',
                  'template_name', 'published_by', 'published_by_name',
                  'published_at', 'change_notes', 'stations', 'transitions']


# ── Template ────────────────────────────────────────────────

class WorkflowTemplateListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    station_count = serializers.SerializerMethodField()
    instance_count = serializers.SerializerMethodField()
    current_version_info = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowTemplate
        fields = ['id', 'name', 'description', 'category', 'status',
                  'current_version_info', 'station_count', 'instance_count',
                  'created_by', 'created_by_name', 'created_at', 'updated_at']

    def get_station_count(self, obj):
        if obj.current_version:
            return obj.current_version.stations.count()
        if obj.draft_version:
            return obj.draft_version.stations.count()
        return 0

    def get_instance_count(self, obj):
        return sum(v.instances.count() for v in obj.versions.all())

    def get_current_version_info(self, obj):
        if obj.current_version:
            return {
                'id': obj.current_version.id,
                'version_label': obj.current_version.version_label,
                'version_number': obj.current_version.version_number,
            }
        return None


class WorkflowTemplateDetailSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    station_count = serializers.SerializerMethodField()
    transition_count = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()
    instance_count = serializers.SerializerMethodField()
    current_version_info = serializers.SerializerMethodField()
    draft_version_info = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowTemplate
        fields = ['id', 'name', 'description', 'category', 'status',
                  'current_version', 'current_version_info', 'draft_version',
                  'draft_version_info', 'has_draft',
                  'station_count', 'transition_count', 'task_count',
                  'instance_count', 'created_by', 'created_by_name',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'status', 'current_version', 'draft_version',
                           'created_by', 'created_at', 'updated_at']

    def get_station_count(self, obj):
        v = self._get_version(obj)
        return v.stations.count() if v else 0

    def get_transition_count(self, obj):
        v = self._get_version(obj)
        return v.transitions.count() if v else 0

    def get_task_count(self, obj):
        v = self._get_version(obj)
        return TaskDefinition.objects.filter(station__template_version=v).count() if v else 0

    def get_instance_count(self, obj):
        return sum(v.instances.count() for v in obj.versions.all())

    def get_current_version_info(self, obj):
        if obj.current_version:
            return {
                'id': obj.current_version.id,
                'version_label': obj.current_version.version_label,
                'version_number': obj.current_version.version_number,
                'published_by': obj.current_version.published_by.get_full_name(),
                'published_at': obj.current_version.published_at,
                'change_notes': obj.current_version.change_notes,
            }
        return None

    def get_draft_version_info(self, obj):
        if obj.draft_version:
            return {
                'id': obj.draft_version.id,
                'version_label': obj.draft_version.version_label,
                'version_number': obj.draft_version.version_number,
            }
        return None

    def _get_version(self, obj):
        return obj.draft_version or obj.current_version


class WorkflowTemplateCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowTemplate
        fields = ['name', 'description', 'category']


class WorkflowTemplateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowTemplate
        fields = ['name', 'description', 'category']
