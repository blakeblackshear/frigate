"""Export apis."""

import datetime
import logging
import random
import string
import time
import zipfile
from collections import deque
from pathlib import Path
from typing import Iterator, List, Optional

import psutil
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pathvalidate import sanitize_filename, sanitize_filepath
from peewee import DoesNotExist
from playhouse.shortcuts import model_to_dict

from frigate.api.auth import (
    allow_any_authenticated,
    get_allowed_cameras_for_filter,
    get_current_user,
    require_camera_access,
    require_role,
)
from frigate.api.defs.request.batch_export_body import (
    BatchExportBody,
    BatchExportItem,
)
from frigate.api.defs.request.export_bulk_body import (
    ExportBulkDeleteBody,
    ExportBulkReassignBody,
)
from frigate.api.defs.request.export_case_body import (
    ExportCaseCreateBody,
    ExportCaseUpdateBody,
)
from frigate.api.defs.request.export_recordings_body import (
    ExportRecordingsBody,
    ExportRecordingsCustomBody,
)
from frigate.api.defs.request.export_rename_body import ExportRenameBody
from frigate.api.defs.response.export_case_response import (
    ExportCaseModel,
    ExportCasesResponse,
)
from frigate.api.defs.response.export_response import (
    BatchExportResponse,
    ExportJobModel,
    ExportJobsResponse,
    ExportModel,
    ExportsResponse,
    StartExportResponse,
)
from frigate.api.defs.response.generic_response import GenericResponse
from frigate.api.defs.tags import Tags
from frigate.const import CLIPS_DIR, EXPORT_DIR
from frigate.jobs.export import (
    ExportJob,
    ExportQueueFullError,
    available_export_queue_slots,
    cancel_queued_export_jobs_for_case,
    get_export_job,
    list_active_export_jobs,
    start_export_job,
)
from frigate.models import Export, ExportCase, Previews, Recordings
from frigate.record.export import (
    DEFAULT_TIME_LAPSE_FFMPEG_ARGS,
    PlaybackSourceEnum,
    validate_ffmpeg_args,
)
from frigate.util.time import is_current_hour

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.export])


def _generate_id(length: int = 12) -> str:
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=length))


def _generate_export_id(camera_name: str) -> str:
    return f"{camera_name}_{_generate_id(6)}"


def _create_export_case_record(
    name: str,
    description: Optional[str],
) -> ExportCase:
    now = datetime.datetime.fromtimestamp(time.time())
    return ExportCase.create(
        id=_generate_id(),
        name=name,
        description=description,
        created_at=now,
        updated_at=now,
    )


def _validate_camera_name(request: Request, camera_name: str) -> Optional[JSONResponse]:
    if camera_name and request.app.frigate_config.cameras.get(camera_name):
        return None

    return JSONResponse(
        content={"success": False, "message": f"{camera_name} is not a valid camera."},
        status_code=404,
    )


def _validate_export_case(export_case_id: Optional[str]) -> Optional[JSONResponse]:
    if export_case_id is None:
        return None

    try:
        ExportCase.get(ExportCase.id == export_case_id)
    except DoesNotExist:
        return JSONResponse(
            content={"success": False, "message": "Export case not found"},
            status_code=404,
        )

    return None


def _sanitize_existing_image(
    image_path: Optional[str],
) -> tuple[Optional[str], Optional[JSONResponse]]:
    existing_image = sanitize_filepath(image_path) if image_path else None

    if existing_image and not existing_image.startswith(CLIPS_DIR):
        return None, JSONResponse(
            content={"success": False, "message": "Invalid image path"},
            status_code=400,
        )

    return existing_image, None


def _validate_export_source(
    camera_name: str,
    start_time: float,
    end_time: float,
    playback_source: PlaybackSourceEnum,
) -> Optional[str]:
    if playback_source == PlaybackSourceEnum.recordings:
        recordings_count = (
            Recordings.select()
            .where(
                Recordings.start_time.between(start_time, end_time)
                | Recordings.end_time.between(start_time, end_time)
                | (
                    (start_time > Recordings.start_time)
                    & (end_time < Recordings.end_time)
                )
            )
            .where(Recordings.camera == camera_name)
            .count()
        )

        if recordings_count <= 0:
            return "No recordings found for time range"

        return None

    previews_count = (
        Previews.select()
        .where(
            Previews.start_time.between(start_time, end_time)
            | Previews.end_time.between(start_time, end_time)
            | ((start_time > Previews.start_time) & (end_time < Previews.end_time))
        )
        .where(Previews.camera == camera_name)
        .count()
    )

    if not is_current_hour(start_time) and previews_count <= 0:
        return "No previews found for time range"

    return None


def _get_item_recording_export_errors(
    request: Request,
    items: list[BatchExportItem],
) -> dict[int, str]:
    """Return {item_index: error message} for items with invalid state.

    Checks camera configuration and recording presence per item. Groups by
    camera and issues one query per unique camera covering that camera's
    full requested range, then checks each item's range against the returned
    rows in Python. This avoids O(N) DB round-trips on large batches.
    """
    configured_cameras = request.app.frigate_config.cameras
    errors: dict[int, str] = {}

    # Validate camera configuration first
    item_ranges_by_camera: dict[str, list[tuple[int, float, float]]] = {}
    for index, item in enumerate(items):
        if not configured_cameras.get(item.camera):
            errors[index] = f"{item.camera} is not a valid camera."
            continue
        item_ranges_by_camera.setdefault(item.camera, []).append(
            (index, item.start_time, item.end_time)
        )

    if not item_ranges_by_camera:
        return errors

    # For each camera, fetch recordings that cover the union of ranges
    for camera_name, indexed_ranges in item_ranges_by_camera.items():
        min_start = min(r[1] for r in indexed_ranges)
        max_end = max(r[2] for r in indexed_ranges)

        recording_ranges = list(
            Recordings.select(Recordings.start_time, Recordings.end_time)
            .where(
                Recordings.camera == camera_name,
                Recordings.start_time.between(min_start, max_end)
                | Recordings.end_time.between(min_start, max_end)
                | (
                    (min_start > Recordings.start_time)
                    & (max_end < Recordings.end_time)
                ),
            )
            .iterator()
        )

        for index, start_time, end_time in indexed_ranges:
            has_recording = any(
                (
                    start_time <= rec.start_time <= end_time
                    or start_time <= rec.end_time <= end_time
                    or (start_time > rec.start_time and end_time < rec.end_time)
                )
                for rec in recording_ranges
            )
            if not has_recording:
                errors[index] = "No recordings found for time range"

    return errors


def _build_export_job(
    camera_name: str,
    start_time: float,
    end_time: float,
    friendly_name: Optional[str],
    existing_image: Optional[str],
    playback_source: PlaybackSourceEnum,
    export_case_id: Optional[str],
    ffmpeg_input_args: Optional[str] = None,
    ffmpeg_output_args: Optional[str] = None,
    cpu_fallback: bool = False,
) -> ExportJob:
    return ExportJob(
        id=_generate_export_id(camera_name),
        camera=camera_name,
        name=friendly_name,
        image_path=existing_image,
        export_case_id=export_case_id,
        request_start_time=int(start_time),
        request_end_time=int(end_time),
        playback_source=playback_source.value,
        ffmpeg_input_args=ffmpeg_input_args,
        ffmpeg_output_args=ffmpeg_output_args,
        cpu_fallback=cpu_fallback,
    )


def _export_case_to_dict(case: ExportCase) -> dict[str, object]:
    case_dict = model_to_dict(case)

    for field in ("created_at", "updated_at"):
        value = case_dict.get(field)
        if isinstance(value, datetime.datetime):
            case_dict[field] = value.timestamp()

    return case_dict


@router.get(
    "/exports",
    response_model=ExportsResponse,
    dependencies=[Depends(allow_any_authenticated())],
    summary="Get exports",
    description="""Gets all exports from the database for cameras the user has access to.
    Returns a list of exports ordered by date (most recent first).""",
)
def get_exports(
    allowed_cameras: List[str] = Depends(get_allowed_cameras_for_filter),
    export_case_id: Optional[str] = None,
    cameras: Optional[str] = Query(default="all"),
    start_date: Optional[float] = None,
    end_date: Optional[float] = None,
):
    query = Export.select().where(Export.camera << allowed_cameras)

    if export_case_id is not None:
        if export_case_id == "unassigned":
            query = query.where(Export.export_case.is_null(True))
        else:
            query = query.where(Export.export_case == export_case_id)

    if cameras and cameras != "all":
        requested = set(cameras.split(","))
        filtered_cameras = list(requested.intersection(allowed_cameras))
        if not filtered_cameras:
            return JSONResponse(content=[])
        query = query.where(Export.camera << filtered_cameras)

    if start_date is not None:
        query = query.where(Export.date >= start_date)

    if end_date is not None:
        query = query.where(Export.date <= end_date)

    exports = query.order_by(Export.date.desc()).dicts().iterator()
    return JSONResponse(content=[e for e in exports])


@router.get(
    "/cases",
    response_model=ExportCasesResponse,
    dependencies=[Depends(allow_any_authenticated())],
    summary="Get export cases",
    description="Gets all export cases from the database.",
)
def get_export_cases():
    cases = ExportCase.select().order_by(ExportCase.created_at.desc()).iterator()
    return JSONResponse(content=[_export_case_to_dict(case) for case in cases])


@router.post(
    "/cases",
    response_model=ExportCaseModel,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Create export case",
    description="Creates a new export case.",
)
def create_export_case(body: ExportCaseCreateBody):
    case = _create_export_case_record(body.name, body.description)
    return JSONResponse(content=_export_case_to_dict(case))


@router.get(
    "/cases/{case_id}",
    response_model=ExportCaseModel,
    dependencies=[Depends(allow_any_authenticated())],
    summary="Get a single export case",
    description="Gets a specific export case by ID.",
)
def get_export_case(case_id: str):
    try:
        case = ExportCase.get(ExportCase.id == case_id)
        return JSONResponse(content=_export_case_to_dict(case))
    except DoesNotExist:
        return JSONResponse(
            content={"success": False, "message": "Export case not found"},
            status_code=404,
        )


_ZIP_STREAM_CHUNK_SIZE = 1024 * 1024  # 1 MiB


class _StreamingZipBuffer:
    """File-like sink for ZipFile that exposes written bytes via drain().

    ZipFile writes synchronously into this buffer; the generator drains the
    queue between writes so StreamingResponse can yield bytes without
    materializing the whole archive in memory.
    """

    def __init__(self) -> None:
        self._queue: deque[bytes] = deque()
        self._offset = 0

    def write(self, data: bytes) -> int:
        if data:
            self._queue.append(bytes(data))
            self._offset += len(data)
        return len(data)

    def tell(self) -> int:
        return self._offset

    def flush(self) -> None:
        pass

    def drain(self) -> Iterator[bytes]:
        while self._queue:
            yield self._queue.popleft()


def _unique_archive_name(export: Export, used: set[str]) -> str:
    base = sanitize_filename(export.name) if export.name else None
    if not base:
        base = f"{export.camera}_{int(datetime.datetime.timestamp(export.date))}"

    candidate = f"{base}.mp4"
    counter = 1
    while candidate in used:
        candidate = f"{base}_{counter}.mp4"
        counter += 1

    used.add(candidate)
    return candidate


def _stream_case_archive(exports: List[Export]) -> Iterator[bytes]:
    """Yield bytes of a zip archive built from the given exports' mp4 files."""
    buffer = _StreamingZipBuffer()
    used_names: set[str] = set()

    # ZIP_STORED: mp4 is already compressed, recompressing wastes CPU for ~0% size win.
    with zipfile.ZipFile(
        buffer,
        mode="w",
        compression=zipfile.ZIP_STORED,
        allowZip64=True,
    ) as archive:
        for export in exports:
            source = Path(export.video_path)
            if not source.exists():
                continue

            arcname = _unique_archive_name(export, used_names)

            with (
                archive.open(arcname, mode="w", force_zip64=True) as entry,
                source.open("rb") as src,
            ):
                while True:
                    chunk = src.read(_ZIP_STREAM_CHUNK_SIZE)
                    if not chunk:
                        break

                    entry.write(chunk)
                    yield from buffer.drain()

            yield from buffer.drain()

    yield from buffer.drain()


@router.get(
    "/cases/{case_id}/download",
    dependencies=[Depends(allow_any_authenticated())],
    summary="Download export case as zip",
    description="Streams a zip archive containing every completed export's mp4 for the given case.",
)
def download_export_case(
    case_id: str,
    allowed_cameras: List[str] = Depends(get_allowed_cameras_for_filter),
):
    try:
        case = ExportCase.get(ExportCase.id == case_id)
    except DoesNotExist:
        return JSONResponse(
            content={"success": False, "message": "Export case not found"},
            status_code=404,
        )

    exports = list(
        Export.select()
        .where(
            Export.export_case == case_id,
            ~Export.in_progress,
            Export.camera << allowed_cameras,
        )
        .order_by(Export.date.asc())
    )

    if not exports:
        return JSONResponse(
            content={"success": False, "message": "No exports available to download."},
            status_code=404,
        )

    archive_base = sanitize_filename(case.name) if case.name else ""
    if not archive_base:
        archive_base = case_id

    return StreamingResponse(
        _stream_case_archive(exports),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{archive_base}.zip"',
        },
    )


@router.patch(
    "/cases/{case_id}",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Update export case",
    description="Updates an existing export case.",
)
def update_export_case(case_id: str, body: ExportCaseUpdateBody):
    try:
        case = ExportCase.get(ExportCase.id == case_id)
    except DoesNotExist:
        return JSONResponse(
            content={"success": False, "message": "Export case not found"},
            status_code=404,
        )

    if body.name is not None:
        case.name = body.name
    if body.description is not None:
        case.description = body.description

    case.updated_at = datetime.datetime.fromtimestamp(time.time())

    case.save()

    return JSONResponse(
        content={"success": True, "message": "Successfully updated export case."}
    )


@router.delete(
    "/cases/{case_id}",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Delete export case",
    description="""Deletes an export case.\n    Exports that reference this case will have their export_case set to null.\n    """,
)
def delete_export_case(case_id: str, request: Request, delete_exports: bool = False):
    try:
        case = ExportCase.get(ExportCase.id == case_id)
    except DoesNotExist:
        return JSONResponse(
            content={"success": False, "message": "Export case not found"},
            status_code=404,
        )

    if delete_exports:
        cancel_queued_export_jobs_for_case(request.app.frigate_config, case_id)

        exports = list(Export.select().where(Export.export_case == case_id))
        for export in exports:
            Path(export.video_path).unlink(missing_ok=True)
            if export.thumb_path:
                Path(export.thumb_path).unlink(missing_ok=True)
            export.delete_instance()
    else:
        # Unassign exports from this case but keep the exports themselves
        Export.update(export_case=None).where(Export.export_case == case_id).execute()

    case.delete_instance()

    return JSONResponse(
        content={"success": True, "message": "Successfully deleted export case."}
    )


@router.get(
    "/jobs/export",
    response_model=ExportJobsResponse,
    dependencies=[Depends(allow_any_authenticated())],
    summary="Get active export jobs",
    description="Gets queued and running export jobs.",
)
def get_active_export_jobs(
    request: Request,
    allowed_cameras: List[str] = Depends(get_allowed_cameras_for_filter),
):
    jobs = list_active_export_jobs(request.app.frigate_config)
    return JSONResponse(
        content=[job.to_dict() for job in jobs if job.camera in allowed_cameras]
    )


@router.get(
    "/jobs/export/{export_id}",
    response_model=ExportJobModel,
    dependencies=[Depends(allow_any_authenticated())],
    summary="Get export job status",
    description="Gets queued, running, or completed status for a specific export job.",
)
async def get_export_job_status(export_id: str, request: Request):
    job = get_export_job(request.app.frigate_config, export_id)
    if job is None:
        return JSONResponse(
            content={"success": False, "message": "Job not found"},
            status_code=404,
        )

    await require_camera_access(job.camera, request=request)

    return JSONResponse(content=job.to_dict())


@router.post(
    "/exports/batch",
    response_model=BatchExportResponse,
    dependencies=[Depends(allow_any_authenticated())],
    summary="Start recording export batch",
    description=(
        "Starts recording exports for a batch of items, each with its own camera "
        "and time range, and assigns them to a single export case. Attaching to "
        "an existing case is temporarily admin-only until case-level ACLs exist."
    ),
)
def export_recordings_batch(
    request: Request,
    body: BatchExportBody,
    allowed_cameras: List[str] = Depends(get_allowed_cameras_for_filter),
    current_user: dict = Depends(get_current_user),
):
    if isinstance(current_user, JSONResponse):
        return current_user

    # Stopgap: attaching to an existing case remains admin-only until
    # case-level ACLs exist. Non-admins can still create a fresh case
    # as a side effect of queueing items they already have camera access to.
    if body.export_case_id is not None and current_user["role"] != "admin":
        return JSONResponse(
            content={
                "success": False,
                "message": "Only admins can attach exports to an existing case.",
            },
            status_code=403,
        )

    case_validation_error = _validate_export_case(body.export_case_id)
    if case_validation_error is not None:
        return case_validation_error

    # Fail-closed camera access: any item referencing an inaccessible
    # camera rejects the whole request. The UI's review list is already
    # filtered by camera access, so reaching this branch implies a stale
    # session or a crafted request — reject loudly rather than silently
    # dropping items.
    allowed_camera_set = set(allowed_cameras)
    for item in body.items:
        if item.camera not in allowed_camera_set:
            return JSONResponse(
                content={
                    "success": False,
                    "message": f"Cannot export from {item.camera}: access denied",
                },
                status_code=403,
            )

    # Sanitize each item's image_path up front. A bad path in any item
    # kills the whole request, consistent with single-export behavior.
    sanitized_images: list[Optional[str]] = []
    for item in body.items:
        existing_image, image_validation_error = _sanitize_existing_image(
            item.image_path
        )
        if image_validation_error is not None:
            return image_validation_error
        sanitized_images.append(existing_image)

    item_errors = _get_item_recording_export_errors(request, body.items)

    queueable_indexes = [
        index for index in range(len(body.items)) if index not in item_errors
    ]

    if not queueable_indexes:
        return JSONResponse(
            content={
                "success": False,
                "message": (
                    "No exports could be queued: no recordings found for the "
                    "requested ranges."
                ),
            },
            status_code=400,
        )

    # Preflight admission: reject the whole batch if we can't fit every
    # queueable item. Prevents partial batches where the tail fails with
    # "queue full" after we've already created a case.
    if available_export_queue_slots(request.app.frigate_config) < len(
        queueable_indexes
    ):
        return JSONResponse(
            content={
                "success": False,
                "message": "Export queue is full. Try again once current exports finish.",
            },
            status_code=503,
        )

    export_case = None
    export_case_id = body.export_case_id
    if export_case_id is None and body.new_case_name:
        export_case = _create_export_case_record(
            body.new_case_name,
            body.new_case_description,
        )
        export_case_id = export_case.id

    export_ids: list[str] = []
    results: list[dict[str, Optional[str] | bool | int]] = []
    for index, item in enumerate(body.items):
        if index in item_errors:
            results.append(
                {
                    "camera": item.camera,
                    "export_id": None,
                    "success": False,
                    "status": None,
                    "error": item_errors[index],
                    "item_index": index,
                    "client_item_id": item.client_item_id,
                }
            )
            continue

        export_job = _build_export_job(
            item.camera,
            item.start_time,
            item.end_time,
            item.friendly_name,
            sanitized_images[index],
            PlaybackSourceEnum.recordings,
            export_case_id,
        )
        try:
            start_export_job(request.app.frigate_config, export_job)
        except Exception:
            logger.exception("Failed to queue export job %s", export_job.id)
            results.append(
                {
                    "camera": item.camera,
                    "export_id": None,
                    "success": False,
                    "status": None,
                    "error": "Failed to queue export job",
                    "item_index": index,
                    "client_item_id": item.client_item_id,
                }
            )
            continue

        export_ids.append(export_job.id)
        results.append(
            {
                "camera": item.camera,
                "export_id": export_job.id,
                "success": True,
                "status": "queued",
                "error": None,
                "item_index": index,
                "client_item_id": item.client_item_id,
            }
        )

    if export_case is not None and not export_ids:
        export_case.delete_instance()
        export_case_id = None

    return JSONResponse(
        content={
            "export_case_id": export_case_id,
            "export_ids": export_ids,
            "results": results,
        },
        status_code=202,
    )


@router.post(
    "/export/{camera_name}/start/{start_time}/end/{end_time}",
    response_model=StartExportResponse,
    dependencies=[Depends(require_camera_access)],
    summary="Start recording export",
    description="""Starts an export of a recording for the specified time range.
    The export can be from recordings or preview footage. Returns the export ID if
    successful, or an error message if the camera is invalid or no recordings/previews
    are found for the time range.""",
)
def export_recording(
    request: Request,
    camera_name: str,
    start_time: float,
    end_time: float,
    body: ExportRecordingsBody,
    current_user: dict = Depends(get_current_user),
):
    if isinstance(current_user, JSONResponse):
        return current_user

    camera_validation_error = _validate_camera_name(request, camera_name)
    if camera_validation_error is not None:
        return camera_validation_error

    playback_source = body.source
    friendly_name = body.name
    existing_image, image_validation_error = _sanitize_existing_image(body.image_path)
    if image_validation_error is not None:
        return image_validation_error

    export_case_id = body.export_case_id

    # Attaching to an existing case requires admin. Single-export for
    # cameras the user can access is otherwise non-admin; we only gate
    # the case-attachment side effect.
    if export_case_id is not None and current_user["role"] != "admin":
        return JSONResponse(
            content={
                "success": False,
                "message": "Only admins can attach exports to an existing case.",
            },
            status_code=403,
        )

    case_validation_error = _validate_export_case(export_case_id)
    if case_validation_error is not None:
        return case_validation_error

    source_error = _validate_export_source(
        camera_name,
        start_time,
        end_time,
        playback_source,
    )
    if source_error is not None:
        return JSONResponse(
            content={"success": False, "message": source_error},
            status_code=400,
        )

    export_job = _build_export_job(
        camera_name,
        start_time,
        end_time,
        friendly_name,
        existing_image,
        playback_source,
        export_case_id,
    )
    try:
        start_export_job(request.app.frigate_config, export_job)
    except ExportQueueFullError:
        logger.warning("Export queue is full; rejecting %s", export_job.id)
        return JSONResponse(
            content={
                "success": False,
                "message": "Export queue is full. Try again once current exports finish.",
            },
            status_code=503,
        )

    return JSONResponse(
        content=(
            {
                "success": True,
                "message": "Export queued.",
                "export_id": export_job.id,
                "status": "queued",
            }
        ),
        status_code=202,
    )


@router.patch(
    "/export/{event_id}/rename",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Rename export",
    description="""Renames an export.
    NOTE: This changes the friendly name of the export, not the filename.
    """,
)
async def export_rename(event_id: str, body: ExportRenameBody, request: Request):
    try:
        export: Export = Export.get(Export.id == event_id)
        await require_camera_access(export.camera, request=request)
    except DoesNotExist:
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": "Export not found.",
                }
            ),
            status_code=404,
        )

    export.name = body.name
    export.save()
    return JSONResponse(
        content=(
            {
                "success": True,
                "message": "Successfully renamed export.",
            }
        ),
        status_code=200,
    )


@router.post(
    "/export/custom/{camera_name}/start/{start_time}/end/{end_time}",
    response_model=StartExportResponse,
    dependencies=[Depends(require_camera_access)],
    summary="Start custom recording export",
    description="""Starts an export of a recording for the specified time range using custom FFmpeg arguments.
    The export can be from recordings or preview footage. Returns the export ID if
    successful, or an error message if the camera is invalid or no recordings/previews
    are found for the time range. If ffmpeg_input_args and ffmpeg_output_args are not provided,
    defaults to timelapse export settings.""",
)
def export_recording_custom(
    request: Request,
    camera_name: str,
    start_time: float,
    end_time: float,
    body: ExportRecordingsCustomBody,
):
    camera_validation_error = _validate_camera_name(request, camera_name)
    if camera_validation_error is not None:
        return camera_validation_error

    playback_source = body.source
    friendly_name = body.name
    existing_image, image_validation_error = _sanitize_existing_image(body.image_path)
    if image_validation_error is not None:
        return image_validation_error
    ffmpeg_input_args = body.ffmpeg_input_args
    ffmpeg_output_args = body.ffmpeg_output_args
    cpu_fallback = body.cpu_fallback

    export_case_id = body.export_case_id
    case_validation_error = _validate_export_case(export_case_id)
    if case_validation_error is not None:
        return case_validation_error

    source_error = _validate_export_source(
        camera_name,
        start_time,
        end_time,
        playback_source,
    )
    if source_error is not None:
        return JSONResponse(
            content={"success": False, "message": source_error},
            status_code=400,
        )

    # Validate user-provided ffmpeg args to prevent injection.
    # Admin users are trusted and skip validation.
    is_admin = request.headers.get("remote-role", "") == "admin"

    if not is_admin:
        for args_label, args_value in [
            ("input", ffmpeg_input_args),
            ("output", ffmpeg_output_args),
        ]:
            if args_value is not None:
                valid, message = validate_ffmpeg_args(args_value)
                if not valid:
                    return JSONResponse(
                        content=(
                            {
                                "success": False,
                                "message": f"Invalid ffmpeg {args_label} arguments: {message}",
                            }
                        ),
                        status_code=400,
                    )

    # Set default values if not provided (timelapse defaults)
    if ffmpeg_input_args is None:
        ffmpeg_input_args = ""

    if ffmpeg_output_args is None:
        ffmpeg_output_args = DEFAULT_TIME_LAPSE_FFMPEG_ARGS

    export_job = _build_export_job(
        camera_name,
        start_time,
        end_time,
        friendly_name,
        existing_image,
        playback_source,
        export_case_id,
        ffmpeg_input_args,
        ffmpeg_output_args,
        cpu_fallback,
    )
    try:
        start_export_job(request.app.frigate_config, export_job)
    except ExportQueueFullError:
        logger.warning("Export queue is full; rejecting %s", export_job.id)
        return JSONResponse(
            content={
                "success": False,
                "message": "Export queue is full. Try again once current exports finish.",
            },
            status_code=503,
        )

    return JSONResponse(
        content=(
            {
                "success": True,
                "message": "Export queued.",
                "export_id": export_job.id,
                "status": "queued",
            }
        ),
        status_code=202,
    )


@router.get(
    "/exports/{export_id}",
    response_model=ExportModel,
    dependencies=[Depends(allow_any_authenticated())],
    summary="Get a single export",
    description="""Gets a specific export by ID. The user must have access to the camera
    associated with the export.""",
)
async def get_export(export_id: str, request: Request):
    try:
        export = Export.get(Export.id == export_id)
        await require_camera_access(export.camera, request=request)
        return JSONResponse(content=model_to_dict(export))
    except DoesNotExist:
        return JSONResponse(
            content={"success": False, "message": "Export not found"},
            status_code=404,
        )


def _get_files_in_use() -> set[str]:
    """Get set of export filenames currently in use by ffmpeg."""
    files_in_use: set[str] = set()
    for process in psutil.process_iter():
        try:
            if process.name() != "ffmpeg":
                continue
            file_list = process.open_files()
            if file_list:
                for nt in file_list:
                    if nt.path.startswith(EXPORT_DIR):
                        files_in_use.add(nt.path.split("/")[-1])
        except psutil.Error:
            continue
    return files_in_use


@router.post(
    "/exports/delete",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Bulk delete exports",
    description="Deletes one or more exports by ID. All IDs must exist and none can be in-progress.",
)
def bulk_delete_exports(body: ExportBulkDeleteBody):
    exports = list(Export.select().where(Export.id << body.ids))

    if len(exports) != len(body.ids):
        return JSONResponse(
            content={"success": False, "message": "One or more exports not found."},
            status_code=404,
        )

    files_in_use = _get_files_in_use()

    for export in exports:
        if export.video_path.split("/")[-1] in files_in_use:
            return JSONResponse(
                content={
                    "success": False,
                    "message": "Can not delete in-progress export.",
                },
                status_code=400,
            )

    for export in exports:
        Path(export.video_path).unlink(missing_ok=True)
        if export.thumb_path:
            Path(export.thumb_path).unlink(missing_ok=True)

    Export.delete().where(Export.id << body.ids).execute()

    return JSONResponse(
        content={
            "success": True,
            "message": f"Successfully deleted {len(exports)} export(s).",
        },
        status_code=200,
    )


@router.post(
    "/exports/reassign",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Bulk reassign exports to a case",
    description="Assigns or unassigns one or more exports to/from a case. All IDs must exist.",
)
def bulk_reassign_exports(body: ExportBulkReassignBody):
    exports = list(Export.select().where(Export.id << body.ids))

    if len(exports) != len(body.ids):
        return JSONResponse(
            content={"success": False, "message": "One or more exports not found."},
            status_code=404,
        )

    if body.export_case_id is not None:
        try:
            ExportCase.get(ExportCase.id == body.export_case_id)
        except DoesNotExist:
            return JSONResponse(
                content={"success": False, "message": "Export case not found."},
                status_code=404,
            )

    Export.update(export_case=body.export_case_id).where(
        Export.id << body.ids
    ).execute()

    return JSONResponse(
        content={
            "success": True,
            "message": f"Successfully updated {len(exports)} export(s).",
        },
        status_code=200,
    )
