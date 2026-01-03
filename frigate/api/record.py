"""Recording APIs."""

import logging
from functools import reduce
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends
from fastapi import Path as PathParam
from fastapi.responses import JSONResponse
from peewee import operator

from frigate.api.auth import (
    get_allowed_cameras_for_filter,
    require_role,
)
from frigate.api.defs.query.recordings_query_parameters import (
    RecordingsDeleteQueryParams,
)
from frigate.api.defs.response.generic_response import GenericResponse
from frigate.api.defs.tags import Tags
from frigate.models import Recordings

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.recordings])


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
