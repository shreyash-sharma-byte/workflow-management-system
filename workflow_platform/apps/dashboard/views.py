from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from apps.workflows.models import WorkflowTemplate
from apps.instances.models import WorkflowInstance, TaskExecution
from apps.instances.permissions import IsAdmin


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_dashboard(request):
    """Admin dashboard stats."""
    today = timezone.now().date()

    templates = WorkflowTemplate.objects.all()
    instances = WorkflowInstance.objects.all()

    total_templates = templates.count()
    published_templates = templates.filter(status='PUBLISHED').count()
    draft_templates = templates.filter(status='DRAFT').count()
    archived_templates = templates.filter(status='ARCHIVED').count()

    total_instances = instances.count()
    active_instances = instances.filter(status='ACTIVE').count()
    completed_today = instances.filter(
        status='COMPLETED',
        completed_at__date=today,
    ).count()

    instances_by_template = list(
        instances.values('template_version__template__name')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )
    for item in instances_by_template:
        item['template_name'] = item.pop('template_version__template__name')

    recent_templates = templates.order_by('-updated_at')[:5]
    recent_data = []
    for t in recent_templates:
        recent_data.append({
            'id': t.id,
            'name': t.name,
            'current_version': {
                'id': t.current_version.id if t.current_version else None,
                'version_label': t.current_version.version_label if t.current_version else None,
            } if t.current_version else None,
            'status': t.status,
            'updated_at': t.updated_at,
        })

    return Response({
        'total_templates': total_templates,
        'published_templates': published_templates,
        'draft_templates': draft_templates,
        'archived_templates': archived_templates,
        'total_instances': total_instances,
        'active_instances': active_instances,
        'completed_today': completed_today,
        'instances_by_template': instances_by_template,
        'recent_templates': recent_data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_dashboard(request):
    """User dashboard — my workload."""
    user = request.user
    user_roles = set(user.groups.values_list('name', flat=True))

    # My assigned instances (I'm current owner)
    assigned_to_me = WorkflowInstance.objects.filter(
        current_owner=user, status='ACTIVE'
    )

    # Instances at my stations (I have a role matching current_station.allowed_roles)
    my_station_instances = WorkflowInstance.objects.filter(
        status='ACTIVE',
        current_station__allowed_roles__name__in=user_roles,
    ) if user_roles else WorkflowInstance.objects.none()

    # Blocked by me (I have incomplete required tasks)
    blocked_ids = TaskExecution.objects.filter(
        station__allowed_roles__name__in=user_roles,
        task_definition__is_required=True,
        executed_by__isnull=True,
    ).exclude(status='COMPLETED').values_list('instance_id', flat=True).distinct() if user_roles else []

    blocked_by_me = WorkflowInstance.objects.filter(
        id__in=blocked_ids, status='ACTIVE'
    )

    # Completed by me (history entries)
    completed_by_me = WorkflowInstance.objects.filter(
        history__action_by=user,
        history__action__in=['MOVED', 'TASK_COMPLETED'],
    ).distinct().count()

    # My initiated instances
    initiated = WorkflowInstance.objects.filter(initiated_by=user)
    my_initiated_total = initiated.count()
    my_initiated_in_review = initiated.filter(status='ACTIVE').count()
    my_initiated_completed = initiated.filter(status='COMPLETED').count()

    # Recent instances
    recent_qs = (assigned_to_me | my_station_instances).distinct().order_by('-updated_at')[:10]
    recent_data = []
    for inst in recent_qs:
        # Check if I need to act on this
        needs_my_action = bool(
            user_roles.intersection(
                set(inst.current_station.allowed_roles.values_list('name', flat=True))
            )
        ) if inst.current_station.allowed_roles.exists() else True

        recent_data.append({
            'id': inst.id,
            'reference': inst.reference,
            'title': inst.title,
            'template_name': inst.template_version.template.name,
            'current_station': {'id': inst.current_station.id, 'name': inst.current_station.name},
            'status': inst.status,
            'needs_my_action': needs_my_action,
            'updated_at': inst.updated_at,
        })

    return Response({
        'user': {
            'id': user.id,
            'username': user.username,
            'full_name': user.get_full_name() or user.username,
        },
        'my_workload': {
            'assigned_to_me': assigned_to_me.count(),
            'blocked_by_me': blocked_by_me.count(),
            'completed_by_me': completed_by_me,
        },
        'my_initiated': {
            'total': my_initiated_total,
            'in_review': my_initiated_in_review,
            'completed': my_initiated_completed,
        },
        'recent_instances': recent_data,
    })
