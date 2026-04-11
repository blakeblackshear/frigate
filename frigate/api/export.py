"""Export apis."""

import datetime
import logging
import random
import string
import threading
import time
from pathlib import Path
from typing import List, Optional

import psutil
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse
from pathvalidate import sanitize_filepath
from peewee import DoesNotExist
from playhouse.shortcuts import model_to_dict

from frigate.api.auth import (
    allow_any_authenticated,
    get_allowed_cameras_for_filter,
    require_camera_access,
    require_role,
)
from frigate.api.defs.request.batch_export_body import BatchExportBody
from frigate.api.defs.request.export_case_body import (
    ExportCaseAssignBody,
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
    ExportModel,
    ExportsResponse,
    StartExportResponse,
)
from frigate.api.defs.response.generic_response import GenericResponse
from frigate.api.defs.tags import Tags
from frigate.const import CLIPS_DIR, EXPORT_DIR
from frigate.models import Export, ExportCase, Previews, Recordings
from frigate.record.export import (
    DEFAULT_TIME_LAPSE_FFMPEG_ARGS,
    PlaybackSourceEnum,
    RecordingExporter,
    validate_ffmpeg_args,
)
from frigate.util.time import is_current_hour

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.export])

EXPORT_START_SEMAPHORE = threading.Semaphore(3)


class ManagedRecordingExporter(RecordingExporter):
    """Recording exporter that releases the shared concurrency slot on exit."""

    def run(self) -> None:
        try:
            super().run()
        finally:
            EXPORT_START_SEMAPHORE.release()


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


def _get_batch_recording_export_errors(
    request: Request,
    camera_names: list[str],
    start_time: float,
    end_time: float,
) -> dict[str, str]:
    unique_camera_names = list(dict.fromkeys(camera_names))
    configured_cameras = request.app.frigate_config.cameras
    errors: dict[str, str] = {}

    valid_camera_names = [
        camera_name
        for camera_name in unique_camera_names
        if configured_cameras.get(camera_name)
    ]

    for camera_name in unique_camera_names:
        if camera_name not in valid_camera_names:
            errors[camera_name] = f"{camera_name} is not a valid camera."

    if not valid_camera_names:
        return errors

    recordings = (
        Recordings.select(Recordings.camera)
        .distinct()
        .where(
            Recordings.camera << valid_camera_names,
            Recordings.start_time.between(start_time, end_time)
            | Recordings.end_time.between(start_time, end_time)
            | ((start_time > Recordings.start_time) & (end_time < Recordings.end_time)),
        )
        .iterator()
    )
    cameras_with_recordings = {recording.camera for recording in recordings}

    for camera_name in valid_camera_names:
        if camera_name not in cameras_with_recordings:
            errors[camera_name] = "No recordings found for time range"

    return errors


def _build_exporter(
    request: Request,
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
) -> ManagedRecordingExporter:
    return ManagedRecordingExporter(
        request.app.frigate_config,
        _generate_export_id(camera_name),
        camera_name,
        friendly_name,
        existing_image,
        int(start_time),
        int(end_time),
        playback_source,
        export_case_id,
        ffmpeg_input_args,
        ffmpeg_output_args,
        cpu_fallback,
    )


def _start_exporter(exporter: ManagedRecordingExporter) -> None:
    EXPORT_START_SEMAPHORE.acquire()
    try:
        exporter.start()
    except Exception:
        EXPORT_START_SEMAPHORE.release()
        raise


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
def delete_export_case(case_id: str):
    try:
        case = ExportCase.get(ExportCase.id == case_id)
    except DoesNotExist:
        return JSONResponse(
            content={"success": False, "message": "Export case not found"},
            status_code=404,
        )

    # Unassign exports from this case but keep the exports themselves
    Export.update(export_case=None).where(Export.export_case == case).execute()

    case.delete_instance()

    return JSONResponse(
        content={"success": True, "message": "Successfully deleted export case."}
    )


@router.patch(
    "/export/{export_id}/case",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Assign export to case",
    description=(
        "Assigns an export to a case, or unassigns it if export_case_id is null."
    ),
)
async def assign_export_case(
    export_id: str,
    body: ExportCaseAssignBody,
    request: Request,
):
    try:
        export: Export = Export.get(Export.id == export_id)
        await require_camera_access(export.camera, request=request)
    except DoesNotExist:
        return JSONResponse(
            content={"success": False, "message": "Export not found."},
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
        export.export_case = body.export_case_id
    else:
        export.export_case = None

    export.save()

    return JSONResponse(
        content={"success": True, "message": "Successfully updated export case."}
    )


@router.post(
    "/exports/batch",
    response_model=BatchExportResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Start multi-camera recording export",
    description=(
        "Starts recording exports for multiple cameras for the same time range and "
        "assigns them to a single export case."
    ),
)
def export_recordings_batch(request: Request, body: BatchExportBody):
    case_validation_error = _validate_export_case(body.export_case_id)
    if case_validation_error is not None:
        return case_validation_error

    export_case_id = body.export_case_id
    if export_case_id is None:
        export_case = _create_export_case_record(
            body.new_case_name or body.name or "New Case",
            body.new_case_description,
        )
        export_case_id = export_case.id

    export_ids: list[str] = []
    results: list[dict[str, Optional[str] | bool]] = []
    camera_errors = _get_batch_recording_export_errors(
        request,
        body.camera_ids,
        body.start_time,
        body.end_time,
    )

    for camera_name in dict.fromkeys(body.camera_ids):
        camera_error = camera_errors.get(camera_name)
        if camera_error is not None:
            results.append(
                {
                    "camera": camera_name,
                    "export_id": None,
                    "success": False,
                    "error": camera_error,
                }
            )
            continue

        exporter = _build_exporter(
            request,
            camera_name,
            body.start_time,
            body.end_time,
            f"{body.name} - {camera_name}" if body.name else None,
            None,
            PlaybackSourceEnum.recordings,
            export_case_id,
        )
        _start_exporter(exporter)

        export_ids.append(exporter.export_id)
        results.append(
            {
                "camera": camera_name,
                "export_id": exporter.export_id,
                "success": True,
                "error": None,
            }
        )

    return JSONResponse(
        content={
            "export_case_id": export_case_id,
            "export_ids": export_ids,
            "results": results,
        }
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
):
    camera_validation_error = _validate_camera_name(request, camera_name)
    if camera_validation_error is not None:
        return camera_validation_error

    playback_source = body.source
    friendly_name = body.name
    existing_image, image_validation_error = _sanitize_existing_image(body.image_path)
    if image_validation_error is not None:
        return image_validation_error

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

    exporter = _build_exporter(
        request,
        camera_name,
        start_time,
        end_time,
        friendly_name,
        existing_image,
        playback_source,
        export_case_id,
    )
    _start_exporter(exporter)

    return JSONResponse(
        content=(
            {
                "success": True,
                "message": "Starting export of recording.",
                "export_id": exporter.export_id,
            }
        ),
        status_code=200,
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


@router.delete(
    "/export/{event_id}",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Delete export",
)
async def export_delete(event_id: str, request: Request):
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

    files_in_use = []
    for process in psutil.process_iter():
        try:
            if process.name() != "ffmpeg":
                continue
            file_list = process.open_files()
            if file_list:
                for nt in file_list:
                    if nt.path.startswith(EXPORT_DIR):
                        files_in_use.append(nt.path.split("/")[-1])
        except psutil.Error:
            continue

    if export.video_path.split("/")[-1] in files_in_use:
        return JSONResponse(
            content=(
                {"success": False, "message": "Can not delete in progress export."}
            ),
            status_code=400,
        )

    Path(export.video_path).unlink(missing_ok=True)

    if export.thumb_path:
        Path(export.thumb_path).unlink(missing_ok=True)

    export.delete_instance()
    return JSONResponse(
        content=(
            {
                "success": True,
                "message": "Successfully deleted export.",
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

    exporter = _build_exporter(
        request,
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
    _start_exporter(exporter)

    return JSONResponse(
        content=(
            {
                "success": True,
                "message": "Starting export of recording.",
                "export_id": exporter.export_id,
            }
        ),
        status_code=200,
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
