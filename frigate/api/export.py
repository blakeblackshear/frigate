"""Export apis."""

import logging
import random
import string
from pathlib import Path
from typing import List

import psutil
from fastapi import APIRouter, Depends, Request
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
from frigate.api.defs.request.export_recordings_body import ExportRecordingsBody
from frigate.api.defs.request.export_rename_body import ExportRenameBody
from frigate.api.defs.response.export_response import (
    ExportModel,
    ExportsResponse,
    StartExportResponse,
)
from frigate.api.defs.response.generic_response import GenericResponse
from frigate.api.defs.tags import Tags
from frigate.const import CLIPS_DIR, EXPORT_DIR
from frigate.models import Export, Previews, Recordings
from frigate.record.export import (
    PlaybackFactorEnum,
    PlaybackSourceEnum,
    RecordingExporter,
)
from frigate.util.time import is_current_hour

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.export])


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
):
    exports = (
        Export.select()
        .where(Export.camera << allowed_cameras)
        .order_by(Export.date.desc())
        .dicts()
        .iterator()
    )
    return JSONResponse(content=[e for e in exports])


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
    if not camera_name or not request.app.frigate_config.cameras.get(camera_name):
        return JSONResponse(
            content=(
                {"success": False, "message": f"{camera_name} is not a valid camera."}
            ),
            status_code=404,
        )

    playback_factor = body.playback
    playback_source = body.source
    friendly_name = body.name
    existing_image = sanitize_filepath(body.image_path) if body.image_path else None

    # Ensure that existing_image is a valid path
    if existing_image and not existing_image.startswith(CLIPS_DIR):
        return JSONResponse(
            content=({"success": False, "message": "Invalid image path"}),
            status_code=400,
        )

    if playback_source == "recordings":
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
            return JSONResponse(
                content=(
                    {"success": False, "message": "No recordings found for time range"}
                ),
                status_code=400,
            )
    else:
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
            return JSONResponse(
                content=(
                    {"success": False, "message": "No previews found for time range"}
                ),
                status_code=400,
            )

    export_id = f"{camera_name}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=6))}"
    exporter = RecordingExporter(
        request.app.frigate_config,
        export_id,
        camera_name,
        friendly_name,
        existing_image,
        int(start_time),
        int(end_time),
        (
            PlaybackFactorEnum[playback_factor]
            if playback_factor in PlaybackFactorEnum.__members__.values()
            else PlaybackFactorEnum.realtime
        ),
        (
            PlaybackSourceEnum[playback_source]
            if playback_source in PlaybackSourceEnum.__members__.values()
            else PlaybackSourceEnum.recordings
        ),
    )
    exporter.start()
    return JSONResponse(
        content=(
            {
                "success": True,
                "message": "Starting export of recording.",
                "export_id": export_id,
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
