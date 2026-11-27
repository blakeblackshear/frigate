"""Shared responses for endpoints that call Frigate+."""

from fastapi.responses import JSONResponse

from frigate.plus import PlusRateLimitError


def plus_rate_limited_response(err: PlusRateLimitError) -> JSONResponse:
    """Tell the client Frigate+ is rate limiting requests and how long to wait.

    Args:
        err: The rate limit raised by the Frigate+ client

    Returns:
        A 429 response with the wait in retry_after (and the Retry-After
        header) when Frigate+ provided one
    """
    headers = None

    if err.retry_after is not None:
        headers = {"Retry-After": str(err.retry_after)}

    return JSONResponse(
        content={
            "success": False,
            "message": "Frigate+ is rate limiting requests, try again later",
            "retry_after": err.retry_after,
        },
        status_code=429,
        headers=headers,
    )
