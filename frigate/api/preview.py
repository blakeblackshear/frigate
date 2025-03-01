"""Preview apis."""

import logging
import os
from datetime import datetime, timedelta, timezone

import pytz
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from frigate.api.defs.tags import Tags
from frigate.const import BASE_DIR, CACHE_DIR, PREVIEW_FRAME_TYPE
from frigate.models import Previews

logger = logging.getLogger(__name__)


router = APIRouter(tags=[Tags.preview])


@router.get("/preview/{camera_name}/start/{start_ts}/end/{end_ts}")
def preview_ts(camera_name: str, start_ts: float, end_ts: float):
    """Get all mp4 previews relevant for time period."""
    if camera_name != "all":
        camera_clause = Previews.camera == camera_name
    else:
        camera_clause = True

    previews = (
        Previews.select(
            Previews.camera,
            Previews.path,
            Previews.duration,
            Previews.start_time,
            Previews.end_time,
        )
        .where(
            Previews.start_time.between(start_ts, end_ts)
            | Previews.end_time.between(start_ts, end_ts)
            | ((start_ts > Previews.start_time) & (end_ts < Previews.end_time))
        )
        .where(camera_clause)
        .order_by(Previews.start_time.asc())
        .dicts()
        .iterator()
    )

    clips = []

    preview: Previews
    for preview in previews:
        clips.append(
            {
                "camera": preview["camera"],
                "src": preview["path"].replace(BASE_DIR, ""),
                "type": "video/mp4",
                "start": preview["start_time"],
                "end": preview["end_time"],
            }
        )

    if not clips:
        return JSONResponse(
            content={
                "success": False,
                "message": "No previews found.",
            },
            status_code=404,
        )

    return JSONResponse(content=clips, status_code=200)


@router.get("/preview/{year_month}/{day}/{hour}/{camera_name}/{tz_name}")
def preview_hour(year_month: str, day: int, hour: int, camera_name: str, tz_name: str):
    """Get all mp4 previews relevant for time period given the timezone"""
    parts = year_month.split("-")
    start_date = (
        datetime(int(parts[0]), int(parts[1]), int(day), int(hour), tzinfo=timezone.utc)
        - datetime.now(pytz.timezone(tz_name.replace(",", "/"))).utcoffset()
    )
    end_date = start_date + timedelta(hours=1) - timedelta(milliseconds=1)
    start_ts = start_date.timestamp()
    end_ts = end_date.timestamp()

    return preview_ts(camera_name, start_ts, end_ts)


@router.get("/preview/{camera_name}/start/{start_ts}/end/{end_ts}/frames")
def get_preview_frames_from_cache(camera_name: str, start_ts: float, end_ts: float):
    """Get list of cached preview frames"""
    preview_dir = os.path.join(CACHE_DIR, "preview_frames")
    file_start = f"preview_{camera_name}"
    start_file = f"{file_start}-{start_ts}.{PREVIEW_FRAME_TYPE}"
    end_file = f"{file_start}-{end_ts}.{PREVIEW_FRAME_TYPE}"
    selected_previews = []

    for file in sorted(os.listdir(preview_dir)):
        if not file.startswith(file_start):
            continue

        if file < start_file:
            continue

        if file > end_file:
            break

        selected_previews.append(file)

    return JSONResponse(
        content=selected_previews,
        status_code=200,
    )
