from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/', include('apps.workflows.urls')),
    path('api/v1/', include('apps.instances.urls')),
    path('api/v1/', include('apps.documents.urls')),
    path('api/v1/', include('apps.dashboard.urls')),

    # API Docs
    path('api/v1/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/v1/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
