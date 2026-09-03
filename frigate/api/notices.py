"""Notice APIs."""

import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from frigate.api.auth import require_role
from frigate.api.defs.tags import Tags
from frigate.notices.registry import DismissResult

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.notices])


@router.get("/notices", dependencies=[Depends(require_role(["admin"]))])
def get_notices(request: Request, include_dismissed: bool = False) -> JSONResponse:
    """Get the active notices, most severe first.

    Args:
        include_dismissed: Also return event notices the user has dismissed

    Returns:
        The active notices
    """
    return JSONResponse(
        content=request.app.notice_registry.active(include_dismissed=include_dismissed)
    )


@router.get("/notices/stats", dependencies=[Depends(require_role(["admin"]))])
def get_notice_stats(request: Request) -> JSONResponse:
    """Get lifetime occurrence counts per notice kind."""
    return JSONResponse(content=request.app.notice_registry.stats())


@router.post(
    "/notices/{notice_id}/dismiss", dependencies=[Depends(require_role(["admin"]))]
)
def dismiss_notice(request: Request, notice_id: str) -> JSONResponse:
    """Hide an event notice until it is raised again."""
    result = request.app.notice_registry.dismiss(notice_id)

    if result == DismissResult.not_found:
        return JSONResponse(
            content={"success": False, "message": "Notice not found"},
            status_code=404,
        )

    if result == DismissResult.not_dismissable:
        return JSONResponse(
            content={
                "success": False,
                "message": "This notice clears itself when the problem is fixed",
            },
            status_code=400,
        )

    return JSONResponse(content={"success": True, "message": "Notice dismissed"})
