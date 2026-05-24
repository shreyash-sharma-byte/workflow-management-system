from django.contrib.auth.models import Group
from rest_framework import serializers
from .models import User


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']


class UserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    is_admin = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'full_name', 'roles', 'is_admin']

    def get_roles(self, obj):
        return obj.role_names

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username
