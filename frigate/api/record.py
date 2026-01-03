"""Recording APIs."""

import logging
from datetime import datetime, timedelta
from functools import reduce
from pathlib import Path
from typing import List
from urllib.parse import unquote

from fastapi import APIRouter, Depends, Request
from fastapi import Path as PathParam
from fastapi.responses import JSONResponse
from peewee import fn, operator

from frigate.api.auth import (
    allow_any_authenticated,
    get_allowed_cameras_for_filter,
    require_camera_access,
    require_role,
)
from frigate.api.defs.query.recordings_query_parameters import (
    MediaRecordingsAvailabilityQueryParams,
    MediaRecordingsSummaryQueryParams,
    RecordingsDeleteQueryParams,
)
from frigate.api.defs.response.generic_response import GenericResponse
from frigate.api.defs.tags import Tags
from frigate.const import RECORD_DIR
from frigate.models import Event, Recordings
from frigate.util.time import get_dst_transitions

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.recordings])


@router.get("/recordings/storage", dependencies=[Depends(allow_any_authenticated())])
def get_recordings_storage_usage(request: Request):
    recording_stats = request.app.stats_emitter.get_latest_stats()["service"][
        "storage"
    ][RECORD_DIR]

    if not recording_stats:
        return JSONResponse({})

    total_mb = recording_stats["total"]

    camera_usages: dict[str, dict] = (
        request.app.storage_maintainer.calculate_camera_usages()
    )

    for camera_name in camera_usages.keys():
        if camera_usages.get(camera_name, {}).get("usage"):
            camera_usages[camera_name]["usage_percent"] = (
                camera_usages.get(camera_name, {}).get("usage", 0) / total_mb
            ) * 100

    return JSONResponse(content=camera_usages)


@router.get("/recordings/summary", dependencies=[Depends(allow_any_authenticated())])
def all_recordings_summary(
    request: Request,
    params: MediaRecordingsSummaryQueryParams = Depends(),
    allowed_cameras: List[str] = Depends(get_allowed_cameras_for_filter),
):
    """Returns true/false by day indicating if recordings exist"""

    cameras = params.cameras
    if cameras != "all":
        requested = set(unquote(cameras).split(","))
        filtered = requested.intersection(allowed_cameras)
        if not filtered:
            return JSONResponse(content={})
        camera_list = list(filtered)
    else:
        camera_list = allowed_cameras

    time_range_query = (
        Recordings.select(
            fn.MIN(Recordings.start_time).alias("min_time"),
            fn.MAX(Recordings.start_time).alias("max_time"),
        )
        .where(Recordings.camera << camera_list)
        .dicts()
        .get()
    )

    min_time = time_range_query.get("min_time")
    max_time = time_range_query.get("max_time")

    if min_time is None or max_time is None:
        return JSONResponse(content={})

    dst_periods = get_dst_transitions(params.timezone, min_time, max_time)

    days: dict[str, bool] = {}

    for period_start, period_end, period_offset in dst_periods:
        hours_offset = int(period_offset / 60 / 60)
        minutes_offset = int(period_offset / 60 - hours_offset * 60)
        period_hour_modifier = f"{hours_offset} hour"
        period_minute_modifier = f"{minutes_offset} minute"

        period_query = (
            Recordings.select(
                fn.strftime(
                    "%Y-%m-%d",
                    fn.datetime(
                        Recordings.start_time,
                        "unixepoch",
                        period_hour_modifier,
                        period_minute_modifier,
                    ),
                ).alias("day")
            )
            .where(
                (Recordings.camera << camera_list)
                & (Recordings.end_time >= period_start)
                & (Recordings.start_time <= period_end)
            )
            .group_by(
                fn.strftime(
                    "%Y-%m-%d",
                    fn.datetime(
                        Recordings.start_time,
                        "unixepoch",
                        period_hour_modifier,
                        period_minute_modifier,
                    ),
                )
            )
            .order_by(Recordings.start_time.desc())
            .namedtuples()
        )

        for g in period_query:
            days[g.day] = True

    return JSONResponse(content=dict(sorted(days.items())))


@router.get(
    "/{camera_name}/recordings/summary", dependencies=[Depends(require_camera_access)]
)
async def recordings_summary(camera_name: str, timezone: str = "utc"):
    """Returns hourly summary for recordings of given camera"""

    time_range_query = (
        Recordings.select(
            fn.MIN(Recordings.start_time).alias("min_time"),
            fn.MAX(Recordings.start_time).alias("max_time"),
        )
        .where(Recordings.camera == camera_name)
        .dicts()
        .get()
    )

    min_time = time_range_query.get("min_time")
    max_time = time_range_query.get("max_time")

    days: dict[str, dict] = {}

    if min_time is None or max_time is None:
        return JSONResponse(content=list(days.values()))

    dst_periods = get_dst_transitions(timezone, min_time, max_time)

    for period_start, period_end, period_offset in dst_periods:
        hours_offset = int(period_offset / 60 / 60)
        minutes_offset = int(period_offset / 60 - hours_offset * 60)
        period_hour_modifier = f"{hours_offset} hour"
        period_minute_modifier = f"{minutes_offset} minute"

        recording_groups = (
            Recordings.select(
                fn.strftime(
                    "%Y-%m-%d %H",
                    fn.datetime(
                        Recordings.start_time,
                        "unixepoch",
                        period_hour_modifier,
                        period_minute_modifier,
                    ),
                ).alias("hour"),
                fn.SUM(Recordings.duration).alias("duration"),
                fn.SUM(Recordings.motion).alias("motion"),
                fn.SUM(Recordings.objects).alias("objects"),
            )
            .where(
                (Recordings.camera == camera_name)
                & (Recordings.end_time >= period_start)
                & (Recordings.start_time <= period_end)
            )
            .group_by((Recordings.start_time + period_offset).cast("int") / 3600)
            .order_by(Recordings.start_time.desc())
            .namedtuples()
        )

        event_groups = (
            Event.select(
                fn.strftime(
                    "%Y-%m-%d %H",
                    fn.datetime(
                        Event.start_time,
                        "unixepoch",
                        period_hour_modifier,
                        period_minute_modifier,
                    ),
                ).alias("hour"),
                fn.COUNT(Event.id).alias("count"),
            )
            .where(Event.camera == camera_name, Event.has_clip)
            .where(
                (Event.start_time >= period_start) & (Event.start_time <= period_end)
            )
            .group_by((Event.start_time + period_offset).cast("int") / 3600)
            .namedtuples()
        )

        event_map = {g.hour: g.count for g in event_groups}

        for recording_group in recording_groups:
            parts = recording_group.hour.split()
            hour = parts[1]
            day = parts[0]
            events_count = event_map.get(recording_group.hour, 0)
            hour_data = {
                "hour": hour,
                "events": events_count,
                "motion": recording_group.motion,
                "objects": recording_group.objects,
                "duration": round(recording_group.duration),
            }
            if day in days:
                # merge counts if already present (edge-case at DST boundary)
                days[day]["events"] += events_count or 0
                days[day]["hours"].append(hour_data)
            else:
                days[day] = {
                    "events": events_count or 0,
                    "hours": [hour_data],
                    "day": day,
                }

    return JSONResponse(content=list(days.values()))


@router.get("/{camera_name}/recordings", dependencies=[Depends(require_camera_access)])
async def recordings(
    camera_name: str,
    after: float = (datetime.now() - timedelta(hours=1)).timestamp(),
    before: float = datetime.now().timestamp(),
):
    """Return specific camera recordings between the given 'after'/'end' times. If not provided the last hour will be used"""
    recordings = (
        Recordings.select(
            Recordings.id,
            Recordings.start_time,
            Recordings.end_time,
            Recordings.segment_size,
            Recordings.motion,
            Recordings.objects,
            Recordings.duration,
        )
        .where(
            Recordings.camera == camera_name,
            Recordings.end_time >= after,
            Recordings.start_time <= before,
        )
        .order_by(Recordings.start_time)
        .dicts()
        .iterator()
    )

    return JSONResponse(content=list(recordings))


@router.get(
    "/recordings/unavailable",
    response_model=list[dict],
    dependencies=[Depends(allow_any_authenticated())],
)
async def no_recordings(
    request: Request,
    params: MediaRecordingsAvailabilityQueryParams = Depends(),
    allowed_cameras: List[str] = Depends(get_allowed_cameras_for_filter),
):
    """Get time ranges with no recordings."""
    cameras = params.cameras
    if cameras != "all":
        requested = set(unquote(cameras).split(","))
        filtered = requested.intersection(allowed_cameras)
        if not filtered:
            return JSONResponse(content=[])
        cameras = ",".join(filtered)
    else:
        cameras = allowed_cameras

    before = params.before or datetime.datetime.now().timestamp()
    after = (
        params.after
        or (datetime.datetime.now() - datetime.timedelta(hours=1)).timestamp()
    )
    scale = params.scale

    clauses = [(Recordings.end_time >= after) & (Recordings.start_time <= before)]
    if cameras != "all":
        camera_list = cameras.split(",")
        clauses.append((Recordings.camera << camera_list))
    else:
        camera_list = allowed_cameras

    # Get recording start times
    data: list[Recordings] = (
        Recordings.select(Recordings.start_time, Recordings.end_time)
        .where(reduce(operator.and_, clauses))
        .order_by(Recordings.start_time.asc())
        .dicts()
        .iterator()
    )

    # Convert recordings to list of (start, end) tuples
    recordings = [(r["start_time"], r["end_time"]) for r in data]

    # Iterate through time segments and check if each has any recording
    no_recording_segments = []
    current = after
    current_gap_start = None

    while current < before:
        segment_end = min(current + scale, before)

        # Check if this segment overlaps with any recording
        has_recording = any(
            rec_start < segment_end and rec_end > current
            for rec_start, rec_end in recordings
        )

        if not has_recording:
            # This segment has no recordings
            if current_gap_start is None:
                current_gap_start = current  # Start a new gap
        else:
            # This segment has recordings
            if current_gap_start is not None:
                # End the current gap and append it
                no_recording_segments.append(
                    {"start_time": int(current_gap_start), "end_time": int(current)}
                )
                current_gap_start = None

        current = segment_end

    # Append the last gap if it exists
    if current_gap_start is not None:
        no_recording_segments.append(
            {"start_time": int(current_gap_start), "end_time": int(before)}
        )

    return JSONResponse(content=no_recording_segments)


@router.delete(
    "/recordings/start/{start}/end/{end}",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Delete recordings",
    description="""Deletes recordings within the specified time range.
    Recordings can be filtered by cameras and kept based on motion, objects, or audio attributes.
    """,
)
async def delete_recordings(
    start: float = PathParam(..., description="Start timestamp (unix)"),
    end: float = PathParam(..., description="End timestamp (unix)"),
    params: RecordingsDeleteQueryParams = Depends(),
    allowed_cameras: List[str] = Depends(get_allowed_cameras_for_filter),
):
    """Delete recordings in the specified time range."""
    if start >= end:
        return JSONResponse(
            content={
                "success": False,
                "message": "Start time must be less than end time.",
            },
            status_code=400,
        )

    cameras = params.cameras

    if cameras != "all":
        requested = set(cameras.split(","))
        filtered = requested.intersection(allowed_cameras)

        if not filtered:
            return JSONResponse(
                content={
                    "success": False,
                    "message": "No valid cameras found in the request.",
                },
                status_code=400,
            )

        camera_list = list(filtered)
    else:
        camera_list = allowed_cameras

    # Parse keep parameter
    keep_set = set()

    if params.keep:
        keep_set = set(params.keep.split(","))

    # Build query to find overlapping recordings
    clauses = [
        (
            Recordings.start_time.between(start, end)
            | Recordings.end_time.between(start, end)
            | ((start > Recordings.start_time) & (end < Recordings.end_time))
        ),
        (Recordings.camera << camera_list),
    ]

    keep_clauses = []

    if "motion" in keep_set:
        keep_clauses.append(Recordings.motion.is_null(False) & (Recordings.motion > 0))

    if "object" in keep_set:
        keep_clauses.append(
            Recordings.objects.is_null(False) & (Recordings.objects > 0)
        )

    if "audio" in keep_set:
        keep_clauses.append(Recordings.dBFS.is_null(False))

    if keep_clauses:
        keep_condition = reduce(operator.or_, keep_clauses)
        clauses.append(~keep_condition)

    recordings_to_delete = (
        Recordings.select(Recordings.id, Recordings.path)
        .where(reduce(operator.and_, clauses))
        .dicts()
        .iterator()
    )

    recording_ids = []
    deleted_count = 0
    error_count = 0

    for recording in recordings_to_delete:
        recording_ids.append(recording["id"])

        try:
            Path(recording["path"]).unlink(missing_ok=True)
            deleted_count += 1
        except Exception as e:
            logger.error(f"Failed to delete recording file {recording['path']}: {e}")
            error_count += 1

    if recording_ids:
        max_deletes = 100000
        recording_ids_list = list(recording_ids)

        for i in range(0, len(recording_ids_list), max_deletes):
            Recordings.delete().where(
                Recordings.id << recording_ids_list[i : i + max_deletes]
            ).execute()

    message = f"Successfully deleted {deleted_count} recording(s)."

    if error_count > 0:
        message += f" {error_count} file deletion error(s) occurred."

    return JSONResponse(
        content={"success": True, "message": message},
        status_code=200,
    )
