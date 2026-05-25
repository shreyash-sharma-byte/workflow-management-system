from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        # Handle our custom WorkflowEngineError with details
        error_code = getattr(exc, 'error_code', None) or _get_error_code(exc, response)
        message = str(getattr(exc, 'detail', exc)) if hasattr(exc, 'detail') else str(exc)
        details = getattr(exc, 'details', {})

        response.data = {
            'error': error_code,
            'message': message,
            'details': details,
        }
        response.status_code = getattr(exc, 'status_code', response.status_code)

    if response is None:
        return Response(
            {'error': 'internal_error', 'message': 'An unexpected error occurred.', 'details': {}},
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
