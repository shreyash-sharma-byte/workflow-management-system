from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'instances', views.WorkflowInstanceViewSet, basename='instance')

urlpatterns = [
    path('', include(router.urls)),

    # Task executions nested under instances
    path('instances/<int:instance_pk>/tasks/',
         views.TaskExecutionViewSet.as_view({'get': 'list'}),
         name='instance-task-list'),
    path('instances/<int:instance_pk>/tasks/<int:pk>/',
         views.TaskExecutionViewSet.as_view({'get': 'retrieve'}),
         name='instance-task-detail'),
    path('instances/<int:instance_pk>/tasks/<int:pk>/start/',
         views.TaskExecutionViewSet.as_view({'post': 'start'}),
         name='instance-task-start'),
    path('instances/<int:instance_pk>/tasks/<int:pk>/submit/',
         views.TaskExecutionViewSet.as_view({'post': 'submit'}),
         name='instance-task-submit'),
    path('instances/<int:instance_pk>/tasks/<int:pk>/save-draft/',
         views.TaskExecutionViewSet.as_view({'post': 'save_draft'}),
         name='instance-task-save-draft'),
]

