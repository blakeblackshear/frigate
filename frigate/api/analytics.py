"""Analytics APIs."""

import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from frigate.analytics.report import preview_report
from frigate.api.auth import require_role
from frigate.api.defs.tags import Tags

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.analytics])


@router.get("/analytics/preview", dependencies=[Depends(require_role(["admin"]))])
def get_analytics_preview(request: Request) -> JSONResponse:
    """Get the analytics report Frigate would send next, without sending it."""
    report = preview_report(
        request.app.frigate_config,
        request.app.stats_emitter,
        request.app.notice_registry,
    )
    return JSONResponse(content=report.model_dump(mode="json"))
