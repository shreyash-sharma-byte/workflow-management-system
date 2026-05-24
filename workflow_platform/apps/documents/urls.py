from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()

urlpatterns = [
    path('instances/<int:instance_pk>/documents/',
         views.DocumentViewSet.as_view({'get': 'list'}),
         name='instance-document-list'),
    path('instances/<int:instance_pk>/documents/upload/',
         views.DocumentViewSet.as_view({'post': 'upload'}),
         name='instance-document-upload'),
    path('instances/<int:instance_pk>/documents/<int:pk>/download/',
         views.DocumentViewSet.as_view({'get': 'download'}),
         name='instance-document-download'),
]

