"""Notice APIs."""

import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from frigate.api.auth import require_role
from frigate.api.defs.tags import Tags

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.notices])


@router.get("/notices", dependencies=[Depends(require_role(["admin"]))])
def get_notices(request: Request, include_hidden: bool = False) -> JSONResponse:
    """Get notices, most severe first.

    Args:
        include_hidden: Also return acknowledged and muted notices, for the
            hidden list

    Returns:
        The notices
    """
    return JSONResponse(
        content=request.app.notice_registry.active(include_hidden=include_hidden)
    )


@router.get("/notices/stats", dependencies=[Depends(require_role(["admin"]))])
def get_notice_stats(request: Request) -> JSONResponse:
    """Get lifetime occurrence counts per notice kind."""
    return JSONResponse(content=request.app.notice_registry.stats())


@router.get("/notices/muted_checks", dependencies=[Depends(require_role(["admin"]))])
def get_muted_checks(request: Request) -> JSONResponse:
    """Get the muted config and stream check rows, newest first."""
    return JSONResponse(content=request.app.notice_registry.muted_checks())


@router.delete("/notices/hidden", dependencies=[Depends(require_role(["admin"]))])
def unhide_all_notices(request: Request) -> JSONResponse:
    """Show every acknowledged and muted notice and check row again."""
    request.app.notice_registry.unhide_all()
    return JSONResponse(content={"success": True, "message": "Notices shown again"})


# model notice ids contain a slash, so the id is a path parameter
@router.post(
    "/notices/{notice_id:path}/acknowledge",
    dependencies=[Depends(require_role(["admin"]))],
)
def acknowledge_notice(request: Request, notice_id: str) -> JSONResponse:
    """Hide a notice until it happens again.

    Config and stream check rows and the update notice never repeat, so they
    can only be muted.
    """
    if not request.app.notice_registry.acknowledge(notice_id):
        return JSONResponse(
            content={"success": False, "message": "Notice not found"},
            status_code=404,
        )

    return JSONResponse(content={"success": True, "message": "Notice acknowledged"})


@router.post(
    "/notices/{notice_id:path}/mute",
    dependencies=[Depends(require_role(["admin"]))],
)
def mute_notice(request: Request, notice_id: str) -> JSONResponse:
    """Hide a notice or a config or stream check row for good."""
    if not request.app.notice_registry.mute(notice_id):
        return JSONResponse(
            content={"success": False, "message": "Notice not found"},
            status_code=404,
        )

    return JSONResponse(content={"success": True, "message": "Notice muted"})


@router.delete(
    "/notices/{notice_id:path}/hidden",
    dependencies=[Depends(require_role(["admin"]))],
)
def unhide_notice(request: Request, notice_id: str) -> JSONResponse:
    """Show an acknowledged or muted notice or check row again."""
    if not request.app.notice_registry.unhide(notice_id):
        return JSONResponse(
            content={"success": False, "message": "Notice not found"},
            status_code=404,
        )

    return JSONResponse(content={"success": True, "message": "Notice shown again"})
