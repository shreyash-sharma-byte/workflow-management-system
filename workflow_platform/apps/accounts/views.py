from django.contrib.auth.models import Group
from rest_framework import viewsets, mixins
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import User
from .serializers import UserSerializer, RoleSerializer


@api_view(['GET'])
def me(request):
    """Return the current authenticated user with roles from Keycloak JWT."""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


class RoleViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """List all roles (for station assignment dropdowns)."""
    queryset = Group.objects.all().order_by('name')
    serializer_class = RoleSerializer
