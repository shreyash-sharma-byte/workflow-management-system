from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        # Standardize error format across all endpoints
        response.data = {
            'error': _get_error_code(exc, response),
            'message': str(response.data.get('detail', exc)),
            'details': response.data if not isinstance(response.data.get('detail'), str) else {}
        }

    # Handle unhandled exceptions
    if response is None:
        return Response(
            {
                'error': 'internal_error',
                'message': 'An unexpected error occurred. Please try again.',
                'details': {}
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response


def _get_error_code(exc, response):
    status_map = {
        400: 'bad_request',
        401: 'authentication_required',
        403: 'forbidden',
        404: 'not_found',
        409: 'concurrency_conflict',
        422: 'validation_failed',
        429: 'rate_limited',
    }
    return status_map.get(response.status_code, 'error')
