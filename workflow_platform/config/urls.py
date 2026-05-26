from django.urls import path, include
from django.conf import settings
from django.contrib import admin
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    # Admin — renamed URL for security
    path(settings.ADMIN_URL, admin.site.urls),

    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/', include('apps.workflows.urls')),
    path('api/v1/', include('apps.instances.urls')),
    path('api/v1/', include('apps.documents.urls')),
    path('api/v1/', include('apps.dashboard.urls')),
    path('api/v1/', include('apps.notifications.urls')),

    # API Docs
    path('api/v1/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/v1/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
