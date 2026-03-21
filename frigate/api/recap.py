"""Recap API endpoints."""

import logging
import random
import string
from typing import Optional

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from frigate.api.auth import require_camera_access, require_role
from frigate.api.defs.tags import Tags
from frigate.models import Export
from frigate.recap.recap import RecapGenerator

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.recap])


@router.post(
    "/recap/{camera_name}",
    summary="Generate a time-stacked recap video",
    description="Creates a video showing all detected objects from the given time range "
    "composited onto a clean background. Each detection appears at its real "
    "position with a timestamp label.",
)
def generate_recap(
    request: Request,
    camera_name: str,
    start_time: float,
    end_time: float,
    label: Optional[str] = None,
    _: str = Depends(require_role(["admin"])),
):
    config = request.app.frigate_config

    if not config.recap.enabled:
        return JSONResponse(
            content={
                "success": False,
                "message": "recap generation is not enabled in config",
            },
            status_code=400,
        )

    if camera_name not in config.cameras:
        return JSONResponse(
            content={"success": False, "message": f"unknown camera: {camera_name}"},
            status_code=404,
        )

    if end_time <= start_time:
        return JSONResponse(
            content={"success": False, "message": "end_time must be after start_time"},
            status_code=400,
        )

    use_label = label or config.recap.default_label
    export_id = (
        f"{camera_name}_recap_"
        f"{''.join(random.choices(string.ascii_lowercase + string.digits, k=6))}"
    )

    generator = RecapGenerator(
        config=config,
        export_id=export_id,
        camera=camera_name,
        start_time=start_time,
        end_time=end_time,
        label=use_label,
    )
    generator.start()

    return JSONResponse(
        content={
            "success": True,
            "message": "recap generation started",
            "export_id": export_id,
        }
    )


@router.get(
    "/recap/{camera_name}",
    summary="List recap exports for a camera",
)
def get_recaps(
    request: Request,
    camera_name: str,
    _: str = Depends(require_camera_access()),
):
    recaps = (
        Export.select()
        .where(Export.camera == camera_name)
        .where(Export.id.contains("_recap_"))
        .order_by(Export.date.desc())
        .dicts()
    )
    return list(recaps)
