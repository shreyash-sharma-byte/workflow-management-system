"""
Role-based permission classes for the Workflow Management System.

Usage:
    class MyView(APIView):
        permission_classes = [IsAdmin | IsInitiator | IsStationOwner]
"""

from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """User has ADMIN role."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.groups.filter(name='ADMIN').exists()


class IsAdminOrReadOnly(permissions.BasePermission):
    """Admin can write, others can read."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.groups.filter(name='ADMIN').exists()


class IsInitiator(permissions.BasePermission):
    """User can create workflow instances (ADMIN or PM_TEAM)."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        user_roles = set(request.user.groups.values_list('name', flat=True))
        return bool(user_roles.intersection({'ADMIN', 'PM_TEAM', 'PM_MANAGER'}))


class IsStationOwner(permissions.BasePermission):
    """
    User belongs to one of the allowed_roles of the current station.
    Works with WorkflowInstance (current_station) and TaskExecution (station).
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return True

    def has_object_permission(self, request, view, obj):
        # Handle both WorkflowInstance and TaskExecution
        from apps.instances.models import WorkflowInstance, TaskExecution
        if isinstance(obj, TaskExecution):
            station = obj.station
        elif isinstance(obj, WorkflowInstance):
            station = obj.current_station
        else:
            station = getattr(obj, 'current_station', None) or getattr(obj, 'station', None)

        if not station:
            return False

        allowed_roles = station.allowed_roles.all()
        if not allowed_roles.exists():
            return True

        user_roles = set(request.user.groups.values_list('name', flat=True))
        station_roles = set(allowed_roles.values_list('name', flat=True))
        return bool(user_roles.intersection(station_roles))


class IsInstanceInitiator(permissions.BasePermission):
    """User initiated this instance (BA/PM)."""
    def has_object_permission(self, request, view, obj):
        return obj.initiated_by == request.user


class IsInstanceOwnerOrAdmin(permissions.BasePermission):
    """User is current owner or admin or initiator."""
    def has_object_permission(self, request, view, obj):
        if request.user.groups.filter(name='ADMIN').exists():
            return True
        if obj.initiated_by == request.user:
            return True
        if obj.current_owner == request.user:
            return True
        return False


class CanViewInstance(permissions.BasePermission):
    """
    View permission for instances:
    - Admin: all
    - Initiator: their own
    - Station owners: instances at their stations
    - Auditor: all (read-only)
    """
    def has_object_permission(self, request, view, obj):
        if request.method not in permissions.SAFE_METHODS:
            return True  # Write permissions handled by other classes

        user = request.user
        if user.groups.filter(name__in=['ADMIN', 'AUDITOR']).exists():
            return True

        # Initiator can see their own
        if obj.initiated_by == user:
            return True

        # Station owners can see instances at their stations
        user_roles = set(user.groups.values_list('name', flat=True))
        station_roles = set(obj.current_station.allowed_roles.values_list('name', flat=True))
        if station_roles and user_roles.intersection(station_roles):
            return True

        return False
