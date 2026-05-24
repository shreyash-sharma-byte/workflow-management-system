from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'templates', views.WorkflowTemplateViewSet, basename='template')

urlpatterns = [
    path('', include(router.urls)),

    # Stations nested under templates
    path('templates/<int:template_pk>/stations/',
         views.StationViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='template-station-list'),
    path('templates/<int:template_pk>/stations/<int:pk>/',
         views.StationViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
         name='template-station-detail'),

    # Tasks nested under stations
    path('templates/<int:template_pk>/stations/<int:station_pk>/tasks/',
         views.TaskDefinitionViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='station-task-list'),
    path('templates/<int:template_pk>/stations/<int:station_pk>/tasks/<int:pk>/',
         views.TaskDefinitionViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
         name='station-task-detail'),

    # Transitions nested under templates
    path('templates/<int:template_pk>/transitions/',
         views.TransitionViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='template-transition-list'),
    path('templates/<int:template_pk>/transitions/<int:pk>/',
         views.TransitionViewSet.as_view({'get': 'retrieve', 'delete': 'destroy'}),
         name='template-transition-detail'),
]


