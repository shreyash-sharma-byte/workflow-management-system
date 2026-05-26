"""
Workflow Engine — Central Orchestration Service.

All workflow movement MUST pass through this service.
Handles: permission validation, transition validation, task validation,
optimistic locking, audit history creation.

Usage:
    from apps.instances.engine import WorkflowEngine
    engine = WorkflowEngine()
    result = engine.move(instance, to_station, user, remarks)
"""

from django.utils import timezone
from django.db import transaction
from django.db.models import F
from django.contrib.auth.models import Group
from rest_framework import exceptions
import uuid

# Import at bottom to avoid circular imports
from apps.workflows.models import Station, Transition
from apps.instances.models import (
    WorkflowInstance,
    WorkflowInstanceHistory,
    TaskExecution,
)


class WorkflowEngineError(exceptions.APIException):
    """Engine validation errors that return proper HTTP status codes."""
    def __init__(self, error_code, message, details=None, status_code=400):
        self.error_code = error_code
        self.details = details or {}
        super().__init__(detail=message, code=error_code)
        self.status_code = status_code


class WorkflowEngine:
    """
    Central workflow orchestration engine.
    """

    # ── Public API ─────────────────────────────────────

    def move(self, instance: WorkflowInstance, to_station: Station,
             user, remarks: str = '') -> dict:
        """
        Move a workflow instance from its current station to a target station.

        Validation order:
        1. Instance is ACTIVE
        2. User has role permission at current station
        3. Transition exists (current → target)
        4. All required tasks are completed
        5. Optimistic lock matches

        Returns a result dict with updated instance, history, and new tasks.
        """
        self._validate_instance_active(instance)
        self._validate_user_permission(instance, user)
        self._validate_transition(instance, to_station)
        self._validate_tasks_completed(instance)

        # All validations passed — execute within a transaction
        return self._execute_move(instance, to_station, user, remarks)

    def create_instance(self, template_version, user, title: str,
                        instance_data: dict = None) -> WorkflowInstance:
        """Create a new workflow instance from a template version."""
        start_station = template_version.stations.filter(
            station_type=Station.StationType.START
        ).first()

        if not start_station:
            raise WorkflowEngineError(
                'no_start_station',
                'Template version has no START station defined.'
            )

        with transaction.atomic():
            # Generate reference
            last_instance = WorkflowInstance.objects.order_by('-id').first()
            next_id = (last_instance.id + 1) if last_instance else 1
            reference = f"WF-{next_id}"

            instance = WorkflowInstance.objects.create(
                template_version=template_version,
                reference=reference,
                title=title,
                status=WorkflowInstance.InstanceStatus.ACTIVE,
                current_station=start_station,
                instance_data=instance_data or {},
                initiated_by=user,
                current_owner=user,
                version=1,
                public_token=uuid.uuid4(),
            )

            # Create history
            WorkflowInstanceHistory.objects.create(
                instance=instance,
                action=WorkflowInstanceHistory.ActionType.INSTANCE_CREATED,
                action_by=user,
                to_station=start_station,
                metadata={
                    'template': str(template_version),
                    'version_label': template_version.version_label,
                    'initial_data': instance.instance_data,
                }
            )

            # Auto-create PENDING task executions for all tasks at START station
            self._create_pending_tasks(instance, start_station)

        # Notify: instance assigned
        self._notify_station_users(
            instance, start_station,
            notif_type='INSTANCE_ASSIGNED',
            title=f'New instance: {instance.title}',
            message=f'Workflow {instance.reference} has been created and is at "{start_station.name}".',
            link=f'/instances/{instance.id}',
        )

        return instance

    # ── Validation Methods ──────────────────────────────

    def _validate_instance_active(self, instance):
        if not instance.is_active:
            if instance.is_completed:
                raise WorkflowEngineError(
                    'workflow_completed',
                    f'{instance.reference} has reached its END station. No further moves allowed.'
                )
            raise WorkflowEngineError(
                'workflow_not_active',
                f'{instance.reference} is {instance.status}. Only ACTIVE instances can be moved.',
                status_code=400
            )

    def _validate_user_permission(self, instance, user):
        """Check if user has a role allowed at the current station."""
        current = instance.current_station
        allowed_roles = current.allowed_roles.all()

        if not allowed_roles.exists():
            # No roles configured — allow all (permissive)
            return

        user_roles = set(user.groups.values_list('name', flat=True))
        station_roles = set(allowed_roles.values_list('name', flat=True))

        if not user_roles.intersection(station_roles):
            raise WorkflowEngineError(
                'forbidden',
                f'You do not have permission to act on "{current.name}". '
                f'Required roles: {", ".join(sorted(station_roles))}. '
                f'Your roles: {", ".join(sorted(user_roles)) if user_roles else "none"}.',
                status_code=403
            )

    def _validate_transition(self, instance, to_station):
        """Check if a transition exists from current to target station."""
        current = instance.current_station

        if current.id == to_station.id:
            raise WorkflowEngineError(
                'invalid_transition',
                f'Cannot move to the same station: "{current.name}".'
            )

        transition = Transition.objects.filter(
            template_version=instance.template_version,
            from_station=current,
            to_station=to_station,
        ).first()

        if not transition:
            # Show user what IS allowed
            allowed = Transition.objects.filter(
                template_version=instance.template_version,
                from_station=current,
            ).select_related('to_station')

            allowed_list = [
                {'id': t.id, 'to_station': t.to_station.id,
                 'to_station_name': t.to_station.name, 'label': t.label}
                for t in allowed
            ]

            raise WorkflowEngineError(
                'invalid_transition',
                f'Cannot move from "{current.name}" to "{to_station.name}". '
                f'No such transition exists.',
                details={'allowed_transitions': allowed_list}
            )

    def _validate_tasks_completed(self, instance):
        """Check that all required tasks at the current station are completed."""
        pending = TaskExecution.objects.filter(
            instance=instance,
            station=instance.current_station,
            task_definition__is_required=True,
        ).exclude(status=TaskExecution.ExecutionStatus.COMPLETED)

        if pending.exists():
            pending_list = [
                {'id': t.id, 'task_name': t.task_definition.name,
                 'task_type': t.task_definition.task_type, 'status': t.status}
                for t in pending
            ]
            completed_list = list(
                TaskExecution.objects.filter(
                    instance=instance,
                    station=instance.current_station,
                    status=TaskExecution.ExecutionStatus.COMPLETED,
                ).values_list('task_definition__name', flat=True)
            )

            raise WorkflowEngineError(
                'tasks_incomplete',
                f'{len(pending)} required task(s) not yet completed. '
                f'Complete them before moving.',
                details={
                    'pending_tasks': pending_list,
                    'completed_tasks': completed_list,
                }
            )

    # ── Execution ───────────────────────────────────────

    def _execute_move(self, instance, to_station, user, remarks):
        """Perform the actual move within a DB transaction."""
        from_station = instance.current_station
        old_version = instance.version

        with transaction.atomic():
            # Optimistic lock: update only if version hasn't changed
            updated = WorkflowInstance.objects.filter(
                id=instance.id,
                version=old_version,
            ).update(
                current_station=to_station,
                current_owner=user,
                version=F('version') + 1,
                updated_at=timezone.now(),
            )

            if updated == 0:
                raise WorkflowEngineError(
                    'concurrency_conflict',
                    'This workflow was modified by another user. Please refresh and try again.',
                    details={'your_version': old_version},
                    status_code=409
                )

            # Refresh instance from DB
            instance.refresh_from_db()

            # If moved to END station, mark as completed
            action = WorkflowInstanceHistory.ActionType.MOVED
            if to_station.is_end:
                WorkflowInstance.objects.filter(id=instance.id).update(
                    status=WorkflowInstance.InstanceStatus.COMPLETED,
                    completed_at=timezone.now(),
                )
                action = WorkflowInstanceHistory.ActionType.INSTANCE_COMPLETED
                instance.refresh_from_db()

            # Create immutable history entry
            history = WorkflowInstanceHistory.objects.create(
                instance=instance,
                action=action,
                action_by=user,
                from_station=from_station,
                to_station=to_station,
                remarks=remarks,
                metadata={
                    'transition_label': Transition.objects.filter(
                        template_version=instance.template_version,
                        from_station=from_station,
                        to_station=to_station,
                    ).first().label if Transition.objects.filter(
                        template_version=instance.template_version,
                        from_station=from_station,
                        to_station=to_station,
                    ).exists() else '',
                }
            )

            # Auto-create PENDING tasks at the new station
            new_tasks = self._create_pending_tasks(instance, to_station)

        # Notify users at the new station
        action_text = 'completed' if to_station.is_end else f'moved to "{to_station.name}"'
        self._notify_station_users(
            instance, to_station,
            notif_type='INSTANCE_COMPLETED' if to_station.is_end else 'INSTANCE_MOVED',
            title=f'{instance.reference}: {action_text}',
            message=f'Workflow {instance.reference} was moved from "{from_station.name}" to "{to_station.name}" by {user.get_full_name() or user.username}.',
            link=f'/instances/{instance.id}',
        )

        return {
            'instance': instance,
            'history_entry': history,
            'new_tasks': new_tasks,
            'from_station': from_station,
            'to_station': to_station,
        }

    def _create_pending_tasks(self, instance, station):
        """Create PENDING TaskExecution records for all tasks at a station."""
        task_defs = station.task_definitions.all()
        new_tasks = []

        for td in task_defs:
            task_exec = TaskExecution.objects.create(
                instance=instance,
                task_definition=td,
                station=station,
                status=TaskExecution.ExecutionStatus.PENDING,
            )
            new_tasks.append(task_exec)

        return new_tasks

    # ── Notification Helpers ─────────────────────────

    def _notify_station_users(self, instance, station, notif_type, title, message, link):
        """Create notifications for all users who have a role at this station."""
        from apps.notifications.models import Notification
        from apps.accounts.models import User

        allowed_roles = station.allowed_roles.all()
        if not allowed_roles.exists():
            # No station roles — notify the initiator as fallback
            self._notify_and_email_user(
                instance.initiated_by, instance, station,
                notif_type=notif_type, title=title, message=message, link=link,
            )
            return

        # Find all users who belong to at least one of the station's roles
        users = User.objects.filter(
            groups__in=allowed_roles
        ).distinct()

        notifications = [
            Notification(
                recipient=user,
                notification_type=notif_type,
                title=title,
                message=message,
                link=link,
                instance_id=instance.id,
            )
            for user in users
        ]
        Notification.objects.bulk_create(notifications)

        # Also send email for important events
        if notif_type in ('INSTANCE_ASSIGNED', 'INSTANCE_COMPLETED', 'INSTANCE_CANCELLED'):
            self._email_station_users(users, instance, station, notif_type, title, message, link)

    def _email_station_users(self, users, instance, station, notif_type, title, message, link):
        """Send email notifications for important workflow events."""
        from django.core.mail import send_mail
        from django.conf import settings

        subject = f'[{instance.reference}] {title}'
        body = f"""
Workflow: {instance.reference} — {instance.title}
Status: {instance.status}
Station: {station.name}
Template: {instance.template_version.template.name}

{message}

View: {link}

---
Workflow Management System
        """.strip()

        recipient_emails = [u.email for u in users if u.email]
        if not recipient_emails:
            return

        # Dev override: send all emails to a single test address
        if hasattr(settings, 'DEV_EMAIL_OVERRIDE') and settings.DEV_EMAIL_OVERRIDE:
            recipient_emails = [settings.DEV_EMAIL_OVERRIDE]

        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=recipient_emails,
                fail_silently=False,
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f'Email failed: {e}')

    def _notify_and_email_user(self, user, instance, station, notif_type, title, message, link):
        """Send notification and email to a single user."""
        from apps.notifications.models import Notification

        Notification.objects.create(
            recipient=user,
            notification_type=notif_type,
            title=title,
            message=message,
            link=link,
            instance_id=instance.id,
        )

        if user.email:
            from django.core.mail import send_mail
            from django.conf import settings
            subject = f'[{instance.reference}] {title}'
            body = f"""Workflow: {instance.reference} — {instance.title}
Status: {instance.status}
{message}

View: {link}
---
Workflow Management System""".strip()
            # Dev override
            to_email = getattr(settings, 'DEV_EMAIL_OVERRIDE', None) or user.email
            try:
                send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to_email], fail_silently=False)
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f'Email failed: {e}')

    def _validate_task_permission(self, task_execution: TaskExecution, user):
        """
        Check user has a role allowed for this specific task.
        If task has no allowed_roles, inherits station's allowed_roles.
        """
        td = task_execution.task_definition
        task_roles = td.allowed_roles.all()

        if task_roles.exists():
            # Task has specific role requirements — check against those
            user_roles = set(user.groups.values_list('name', flat=True))
            task_role_names = set(task_roles.values_list('name', flat=True))

            if not user_roles.intersection(task_role_names):
                raise WorkflowEngineError(
                    'forbidden',
                    f'You do not have permission to execute "{td.name}". '
                    f'Required roles: {", ".join(sorted(task_role_names))}. '
                    f'Your roles: {", ".join(sorted(user_roles)) if user_roles else "none"}.',
                    status_code=403
                )

    # ── Task Execution Helpers ──────────────────────────

    def start_task(self, task_execution: TaskExecution, user):
        """Mark a task as IN_PROGRESS."""
        if task_execution.status != TaskExecution.ExecutionStatus.PENDING:
            raise WorkflowEngineError(
                'task_not_pending',
                f'Task is already {task_execution.status}.'
            )
        self._validate_task_permission(task_execution, user)
        task_execution.status = TaskExecution.ExecutionStatus.IN_PROGRESS
        task_execution.started_at = timezone.now()
        task_execution.executed_by = user
        task_execution.save(update_fields=['status', 'started_at', 'executed_by'])

        WorkflowInstanceHistory.objects.create(
            instance=task_execution.instance,
            action=WorkflowInstanceHistory.ActionType.TASK_STARTED,
            action_by=user,
            task_definition=task_execution.task_definition,
            task_execution=task_execution,
            metadata={'task_name': task_execution.task_definition.name},
        )
        return task_execution

    def submit_task(self, task_execution: TaskExecution, user,
                    response_data: dict, remarks: str = ''):
        """Submit/complete a task with response data."""
        if task_execution.status == TaskExecution.ExecutionStatus.COMPLETED:
            raise WorkflowEngineError(
                'task_already_completed',
                'This task is already completed.'
            )

        self._validate_task_permission(task_execution, user)

        # Validate response data based on task type
        self._validate_task_response(task_execution, response_data)

        task_execution.status = TaskExecution.ExecutionStatus.COMPLETED
        task_execution.response_data = response_data
        task_execution.remarks = remarks
        task_execution.completed_at = timezone.now()
        task_execution.executed_by = user
        task_execution.save()

        WorkflowInstanceHistory.objects.create(
            instance=task_execution.instance,
            action=WorkflowInstanceHistory.ActionType.TASK_COMPLETED,
            action_by=user,
            task_definition=task_execution.task_definition,
            task_execution=task_execution,
            remarks=remarks,
            metadata={
                'task_name': task_execution.task_definition.name,
                'task_type': task_execution.task_definition.task_type,
                'response_summary': _summarize_response(task_execution.task_definition.task_type, response_data),
            }
        )
        return task_execution

    def _validate_task_response(self, task_execution, response_data):
        """Validate response_data against task_config schema."""
        td = task_execution.task_definition

        if td.task_type == TaskDefinition.TaskType.CONFIRMATION:
            checklist = td.task_config.get('checklist', [])
            unchecked_required = []
            for item in checklist:
                if item.get('required') and not response_data.get(item['key'], False):
                    unchecked_required.append(item)
            if unchecked_required:
                raise WorkflowEngineError(
                    'checklist_incomplete',
                    f'{len(unchecked_required)} required item(s) not confirmed.',
                    details={'unchecked_required': unchecked_required}
                )

        elif td.task_type == TaskDefinition.TaskType.FORM:
            fields = td.task_config.get('fields', [])
            missing = []
            for field in fields:
                val = response_data.get(field['key'])
                if field.get('required') and (val is None or (isinstance(val, str) and not val.strip())):
                    missing.append(field['key'])
            if missing:
                raise WorkflowEngineError(
                    'form_incomplete',
                    f'Required fields missing: {", ".join(missing)}.',
                    details={'missing_fields': missing}
                )

        elif td.task_type == TaskDefinition.TaskType.DOCUMENT:
            min_files = td.task_config.get('min_files', 1)
            doc_count = task_execution.documents.count()
            if doc_count < min_files:
                raise WorkflowEngineError(
                    'insufficient_documents',
                    f'Minimum {min_files} document(s) required. Currently attached: {doc_count}.'
                )

        elif td.task_type == TaskDefinition.TaskType.APPROVAL:
            options = td.task_config.get('options', ['Approved', 'Rejected'])
            decision = response_data.get('decision')
            if decision not in options:
                raise WorkflowEngineError(
                    'invalid_decision',
                    f'Invalid decision: "{decision}". Must be one of: {options}.'
                )

    # ── Cancel ─────────────────────────────────────────

    def cancel_instance(self, instance, user, remarks: str = ''):
        """Cancel a workflow instance."""
        if not instance.is_active:
            raise WorkflowEngineError(
                'cannot_cancel',
                f'Cannot cancel instance with status: {instance.status}.'
            )

        with transaction.atomic():
            instance.status = WorkflowInstance.InstanceStatus.CANCELLED
            instance.save(update_fields=['status', 'updated_at'])

            history = WorkflowInstanceHistory.objects.create(
                instance=instance,
                action=WorkflowInstanceHistory.ActionType.INSTANCE_CANCELLED,
                action_by=user,
                from_station=instance.current_station,
                remarks=remarks,
            )

        # Notify initiator on cancellation
        self._notify_and_email_user(
            instance.initiated_by, instance, instance.current_station,
            notif_type='INSTANCE_CANCELLED',
            title=f'{instance.reference} cancelled',
            message=f'Workflow {instance.reference} was cancelled by {user.get_full_name() or user.username}.',
            link=f'/instances/{instance.id}',
        )

        return instance, history


# Import here to avoid circular import
from apps.workflows.models import TaskDefinition


def _summarize_response(task_type, response_data):
    """Create a human-readable summary of task response for the audit log."""
    if task_type == 'APPROVAL':
        return {'decision': response_data.get('decision', 'N/A')}
    elif task_type == 'CONFIRMATION':
        total = len(response_data)
        checked = sum(1 for v in response_data.values() if v)
        return {'checked': f'{checked}/{total}'}
    elif task_type == 'FORM':
        return {'fields_filled': len(response_data)}
    elif task_type == 'DOCUMENT':
        return {'response': 'Document task completed'}
    return {}
