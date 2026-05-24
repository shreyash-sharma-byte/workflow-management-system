from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/admin/', views.admin_dashboard, name='dashboard-admin'),
    path('dashboard/user/', views.user_dashboard, name='dashboard-user'),
]

