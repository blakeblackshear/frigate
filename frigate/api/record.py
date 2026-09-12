"""Recording APIs."""

import datetime as dt
import logging
from datetime import datetime, timedelta
from functools import reduce
from pathlib import Path
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
from frigate.const import (
    MAX_SEGMENT_DURATION,
    RECORD_DIR,
    STREAM_TYPE_MAIN,
    STREAM_TYPE_SUB,
)
from frigate.models import Event, Recordings
from frigate.util.recording_coverage import (
    coverage_spans,
    known_video_codecs,
    realized_timelines,
    resolve_coverage,
    stream_media_summary,
)
from frigate.util.time import get_dst_transitions

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.recordings])


@router.get("/recordings/storage", dependencies=[Depends(require_role(["admin"]))])
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
async def all_recordings_summary(
    request: Request,
    params: MediaRecordingsSummaryQueryParams = Depends(),
    allowed_cameras: list[str] = Depends(get_allowed_cameras_for_filter),
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

    min_time: float | None = None
    max_time: float | None = None
    for camera in camera_list:
        cam_min = (
            Recordings.select(fn.MIN(Recordings.start_time))
            .where(Recordings.camera == camera)
            .scalar()
        )
        if cam_min is None:
            continue
        cam_max = (
            Recordings.select(fn.MAX(Recordings.start_time))
            .where(Recordings.camera == camera)
            .scalar()
        )
        min_time = cam_min if min_time is None else min(min_time, cam_min)
        max_time = cam_max if max_time is None else max(max_time, cam_max)

    if min_time is None or max_time is None:
        return JSONResponse(content={})

    dst_periods = get_dst_transitions(params.timezone, min_time, max_time)

    days: dict[str, bool] = {}

    for period_start, period_end, period_offset in dst_periods:
        first_start = max(min_time, period_start - MAX_SEGMENT_DURATION)
        first_day = int((first_start + period_offset) // 86400)
        last_day = int((min(max_time, period_end) + period_offset) // 86400)

        day_idx = first_day
        while day_idx <= last_day:
            day_str = (dt.date(1970, 1, 1) + dt.timedelta(days=day_idx)).isoformat()
            day_start = day_idx * 86400 - period_offset
            day_end = day_start + 86400

            if day_str in days:
                day_idx += 1
                continue

            if day_end <= period_end:
                upper = Recordings.start_time < day_end
            else:
                upper = Recordings.start_time <= period_end

            has_recordings = (
                Recordings.select(Recordings.id)
                .where(
                    (Recordings.camera << camera_list)
                    & (Recordings.end_time >= period_start)
                    & (Recordings.start_time >= day_start)
                    & upper
                )
                .exists()
            )
            if has_recordings:
                days[day_str] = True
                day_idx += 1
                continue

            # empty day
            next_start: float | None = None
            for camera in camera_list:
                cam_next = (
                    Recordings.select(fn.MIN(Recordings.start_time))
                    .where(
                        Recordings.camera == camera,
                        Recordings.start_time >= day_end,
                        Recordings.start_time <= period_end,
                    )
                    .scalar()
                )
                if cam_next is not None and (
                    next_start is None or cam_next < next_start
                ):
                    next_start = cam_next

            if next_start is None:
                break
            day_idx = max(day_idx + 1, int((next_start + period_offset) // 86400))

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

        hour_expression = fn.strftime(
            "%Y-%m-%d %H",
            fn.datetime(
                Recordings.start_time,
                "unixepoch",
                period_hour_modifier,
                period_minute_modifier,
            ),
        )

        # sub rows duplicate the camera's motion/object stats, so
        # aggregating them too would double-count
        recording_groups = (
            Recordings.select(
                hour_expression.alias("hour"),
                fn.SUM(Recordings.duration).alias("duration"),
                fn.SUM(Recordings.motion).alias("motion"),
                fn.SUM(Recordings.objects).alias("objects"),
            )
            .where(
                (Recordings.camera == camera_name)
                & (Recordings.stream_type == STREAM_TYPE_MAIN)
                & (Recordings.end_time >= period_start)
                & (Recordings.start_time <= period_end)
            )
            .group_by((Recordings.start_time + period_offset).cast("int") / 3600)
            .order_by(Recordings.start_time.desc())
            .namedtuples()
        )

        # sub recordings can outlive main, so hours covered only by sub
        # rows are reported too, flagged as sub_only
        sub_groups = (
            Recordings.select(
                hour_expression.alias("hour"),
                fn.SUM(Recordings.duration).alias("duration"),
            )
            .where(
                (Recordings.camera == camera_name)
                & (Recordings.stream_type == STREAM_TYPE_SUB)
                & (Recordings.end_time >= period_start)
                & (Recordings.start_time <= period_end)
            )
            .group_by((Recordings.start_time + period_offset).cast("int") / 3600)
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

        hour_stats = [
            (
                g.hour,
                {
                    "motion": g.motion,
                    "objects": g.objects,
                    "duration": round(g.duration),
                },
            )
            for g in recording_groups
        ]
        main_hours = {group_hour for group_hour, _ in hour_stats}
        hour_stats.extend(
            (
                g.hour,
                {
                    "motion": 0,
                    "objects": 0,
                    "duration": round(g.duration),
                    "sub_only": True,
                },
            )
            for g in sub_groups
            if g.hour not in main_hours
        )
        # restore the most-recent-first ordering after merging in sub hours
        hour_stats.sort(key=lambda entry: entry[0], reverse=True)

        for group_hour, stats in hour_stats:
            parts = group_hour.split()
            hour = parts[1]
            day = parts[0]
            events_count = event_map.get(group_hour, 0)
            hour_data = {
                "hour": hour,
                "events": events_count,
                **stats,
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


@router.get(
    "/{camera_name}/recordings/coverage",
    dependencies=[Depends(require_camera_access)],
)
async def recordings_coverage(
    camera_name: str, after: float, before: float, timelines: bool = False
):
    """Returns merged recording coverage spans plus codec compatibility.

    codecs_compatible is false only when more than one known video codec
    appears across the range's rows, the case where the merged vod route
    degrades to a single-stream manifest.
    """
    intervals = resolve_coverage(camera_name, after, before)

    content = {
        "spans": coverage_spans(intervals),
        "codecs_compatible": len(known_video_codecs(intervals)) <= 1,
        "streams": stream_media_summary(intervals),
    }

    # pure computation (shared plan_clip, record-time keyframe index), but
    # opt-in for payload hygiene: day-level requests need only the spans
    if timelines:
        content["timelines"] = realized_timelines(intervals)

    return JSONResponse(content=content)


@router.get("/{camera_name}/recordings", dependencies=[Depends(require_camera_access)])
async def recordings(
    camera_name: str,
    after: float | None = None,
    before: float | None = None,
):
    """Return specific camera recordings between the given 'after'/'end' times. If not provided the last hour will be used"""
    now = datetime.now()
    after = after if after is not None else (now - timedelta(hours=1)).timestamp()
    before = before if before is not None else now.timestamp()
    recordings = (
        Recordings.select(
            Recordings.id,
            Recordings.start_time,
            Recordings.end_time,
            Recordings.segment_size,
            Recordings.motion,
            Recordings.objects,
            Recordings.motion_heatmap,
            Recordings.duration,
        )
        .where(
            Recordings.camera == camera_name,
            Recordings.stream_type == STREAM_TYPE_MAIN,
            Recordings.start_time >= after - MAX_SEGMENT_DURATION,
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
    allowed_cameras: list[str] = Depends(get_allowed_cameras_for_filter),
):
    """Get time ranges with no recordings."""
    cameras = params.cameras
    if cameras != "all":
        requested = set(unquote(cameras).split(","))
        camera_list = list(requested.intersection(allowed_cameras))
    else:
        camera_list = list(allowed_cameras)

    if not camera_list:
        return JSONResponse(content=[])

    before = params.before or datetime.datetime.now().timestamp()
    after = (
        params.after
        or (datetime.datetime.now() - datetime.timedelta(hours=1)).timestamp()
    )
    scale = params.scale

    recordings: list[tuple[float, float]] = []
    for camera in camera_list:
        recordings.extend(
            Recordings.select(Recordings.start_time, Recordings.end_time)
            .where(
                Recordings.camera == camera,
                Recordings.start_time >= after - MAX_SEGMENT_DURATION,
                Recordings.end_time >= after,
                Recordings.start_time <= before,
            )
            .tuples()
            .iterator()
        )

    # the merge pass below expects a single start-ordered timeline
    recordings.sort()

    # Merge overlapping/adjacent recordings into covered intervals. The query
    # orders by start_time, so a single pass merges them
    covered: list[tuple[float, float]] = []
    for rec_start, rec_end in recordings:
        if covered and rec_start <= covered[-1][1]:
            covered[-1] = (covered[-1][0], max(covered[-1][1], rec_end))
        else:
            covered.append((rec_start, rec_end))

    # Iterate through time segments and check if each has any recording
    no_recording_segments = []
    current = after
    current_gap_start = None
    idx = 0
    covered_count = len(covered)

    while current < before:
        segment_end = min(current + scale, before)

        # Advance past covered intervals that end before this segment begins;
        # they cannot overlap this or any later segment.
        while idx < covered_count and covered[idx][1] <= current:
            idx += 1

        # A covered interval overlaps the segment when it starts before the
        # segment ends (its end is already known to be > current).
        has_recording = idx < covered_count and covered[idx][0] < segment_end

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
    allowed_cameras: list[str] = Depends(get_allowed_cameras_for_filter),
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
