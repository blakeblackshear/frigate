"""Notice APIs."""

import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from frigate.api.auth import require_role
from frigate.api.defs.tags import Tags

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.notices])


@router.get("/notices", dependencies=[Depends(require_role(["admin"]))])
def get_notices(request: Request, include_dismissed: bool = False) -> JSONResponse:
    """Get notices, most severe first.

    Args:
        include_dismissed: Also return dismissed notices, for the history view

    Returns:
        The notices
    """
    return JSONResponse(
        content=request.app.notice_registry.active(include_dismissed=include_dismissed)
    )


@router.get("/notices/stats", dependencies=[Depends(require_role(["admin"]))])
def get_notice_stats(request: Request) -> JSONResponse:
    """Get lifetime occurrence counts per notice kind."""
    return JSONResponse(content=request.app.notice_registry.stats())


@router.get(
    "/notices/dismissed_checks", dependencies=[Depends(require_role(["admin"]))]
)
def get_dismissed_checks(request: Request) -> JSONResponse:
    """Get the dismissed config and stream check rows, newest first."""
    return JSONResponse(content=request.app.notice_registry.dismissed_checks())


@router.delete("/notices/dismissed", dependencies=[Depends(require_role(["admin"]))])
def purge_dismissed(request: Request) -> JSONResponse:
    """Delete every dismissed notice and check row so each can show again."""
    request.app.notice_registry.purge_dismissed()
    return JSONResponse(
        content={"success": True, "message": "Dismissed notices cleared"}
    )


# model notice ids contain a slash, so the id is a path parameter
@router.post(
    "/notices/{notice_id:path}/dismiss",
    dependencies=[Depends(require_role(["admin"]))],
)
def dismiss_notice(request: Request, notice_id: str) -> JSONResponse:
    """Hide a notice or a config or stream check row.

    It stays hidden if the same problem happens again.
    """
    if not request.app.notice_registry.dismiss(notice_id):
        return JSONResponse(
            content={"success": False, "message": "Notice not found"},
            status_code=404,
        )

    return JSONResponse(content={"success": True, "message": "Notice dismissed"})
