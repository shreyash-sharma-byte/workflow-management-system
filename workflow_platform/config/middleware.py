"""
Middlewares: Input sanitization — strips HTML from text fields to prevent XSS.
"""
import re

HTML_TAG_RE = re.compile(r'<[^>]*>')


class SanitizeInputMiddleware:
    """Strip HTML tags from all text fields in POST/PUT/PATCH requests."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method in ('POST', 'PUT', 'PATCH'):
            post = request.POST
            if post:
                # Django marks request.POST read-only once the request body has
                # been consumed — which is the case for multipart uploads, where
                # the body is read to parse the file parts. Mutating it in place
                # raised "This QueryDict instance is immutable" and turned every
                # document upload into a 500. Copy first, then assign it back.
                if not getattr(post, '_mutable', True):
                    post = post.copy()
                    request.POST = post
                self._sanitize_data(post)
            if hasattr(request, 'data') and isinstance(request.data, dict):
                self._sanitize_data(request.data)
        return self.get_response(request)

    def _sanitize_data(self, data):
        for key, value in list(data.items()):
            if isinstance(value, str):
                # Only sanitize text fields, skip JSON/tokens
                if key not in ('token', 'access_token', 'refresh_token', 'response_data', 'task_config', 'instance_data', 'configuration'):
                    data[key] = HTML_TAG_RE.sub('', value)
