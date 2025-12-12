"""Preview apis."""

import logging
import os
from datetime import datetime, timedelta, timezone

import pytz
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from frigate.api.auth import (
    allow_any_authenticated,
    get_allowed_cameras_for_filter,
    require_camera_access,
)
from frigate.api.defs.response.preview_response import (
    PreviewFramesResponse,
    PreviewsResponse,
)
from frigate.api.defs.tags import Tags
from frigate.const import BASE_DIR, CACHE_DIR, PREVIEW_FRAME_TYPE
from frigate.models import Previews

logger = logging.getLogger(__name__)


router = APIRouter(tags=[Tags.preview])


@router.get(
    "/preview/{camera_name}/start/{start_ts}/end/{end_ts}",
    response_model=PreviewsResponse,
    dependencies=[Depends(allow_any_authenticated())],
    summary="Get preview clips for time range",
    description="""Gets all preview clips for a specified camera and time range.
    Returns a list of preview video clips that overlap with the requested time period,
    ordered by start time. Use camera_name='all' to get previews from all cameras.
    Returns an error if no previews are found.""",
)
def preview_ts(
    camera_name: str,
    start_ts: float,
    end_ts: float,
    allowed_cameras: list[str] = Depends(get_allowed_cameras_for_filter),
):
    """Get all mp4 previews relevant for time period."""
    if camera_name != "all":
        if camera_name not in allowed_cameras:
            raise HTTPException(status_code=403, detail="Access denied for camera")
        camera_list = [camera_name]
    else:
        camera_list = allowed_cameras

    if not camera_list:
        return JSONResponse(
            content={"success": False, "message": "No previews found."},
            status_code=404,
        )

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
        .where(Previews.camera << camera_list)
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


@router.get(
    "/preview/{year_month}/{day}/{hour}/{camera_name}/{tz_name}",
    response_model=PreviewsResponse,
    dependencies=[Depends(allow_any_authenticated())],
    summary="Get preview clips for specific hour",
    description="""Gets all preview clips for a specific hour in a given timezone.
    Converts the provided date/time from the specified timezone to UTC and retrieves
    all preview clips for that hour. Use camera_name='all' to get previews from all cameras.
    The tz_name should be a timezone like 'America/New_York' (use commas instead of slashes).""",
)
def preview_hour(
    year_month: str,
    day: int,
    hour: int,
    camera_name: str,
    tz_name: str,
    allowed_cameras: list[str] = Depends(get_allowed_cameras_for_filter),
):
    """Get all mp4 previews relevant for time period given the timezone"""
    parts = year_month.split("-")
    start_date = (
        datetime(int(parts[0]), int(parts[1]), int(day), int(hour), tzinfo=timezone.utc)
        - datetime.now(pytz.timezone(tz_name.replace(",", "/"))).utcoffset()
    )
    end_date = start_date + timedelta(hours=1) - timedelta(milliseconds=1)
    start_ts = start_date.timestamp()
    end_ts = end_date.timestamp()

    return preview_ts(camera_name, start_ts, end_ts, allowed_cameras)


@router.get(
    "/preview/{camera_name}/start/{start_ts}/end/{end_ts}/frames",
    response_model=PreviewFramesResponse,
    dependencies=[Depends(require_camera_access)],
    summary="Get cached preview frame filenames",
    description="""Gets a list of cached preview frame filenames for a specific camera and time range.
    Returns an array of filenames for preview frames that fall within the specified time period,
    sorted in chronological order. These are individual frame images cached for quick preview display.""",
)
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
