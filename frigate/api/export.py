"""Export apis."""

import logging
from pathlib import Path
from typing import Optional

import psutil
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from peewee import DoesNotExist

from frigate.api.defs.tags import Tags
from frigate.const import EXPORT_DIR
from frigate.models import Export, Recordings
from frigate.record.export import PlaybackFactorEnum, RecordingExporter

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.export])


@router.get("/exports")
def get_exports():
    exports = Export.select().order_by(Export.date.desc()).dicts().iterator()
    return JSONResponse(content=[e for e in exports])


@router.post("/export/{camera_name}/start/{start_time}/end/{end_time}")
def export_recording(
    request: Request,
    camera_name: str,
    start_time: float,
    end_time: float,
    body: dict = None,
):
    if not camera_name or not request.app.frigate_config.cameras.get(camera_name):
        return JSONResponse(
            content=(
                {"success": False, "message": f"{camera_name} is not a valid camera."}
            ),
            status_code=404,
        )

    json: dict[str, any] = body or {}
    playback_factor = json.get("playback", "realtime")
    friendly_name: Optional[str] = json.get("name")

    if len(friendly_name or "") > 256:
        return JSONResponse(
            content=({"success": False, "message": "File name is too long."}),
            status_code=401,
        )

    existing_image = json.get("image_path")

    recordings_count = (
        Recordings.select()
        .where(
            Recordings.start_time.between(start_time, end_time)
            | Recordings.end_time.between(start_time, end_time)
            | ((start_time > Recordings.start_time) & (end_time < Recordings.end_time))
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

    exporter = RecordingExporter(
        request.app.frigate_config,
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
    )
    exporter.start()
    return JSONResponse(
        content=(
            {
                "success": True,
                "message": "Starting export of recording.",
            }
        ),
        status_code=200,
    )


@router.patch("/export/{event_id}/{new_name}")
def export_rename(event_id: str, new_name: str):
    try:
        export: Export = Export.get(Export.id == event_id)
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

    export.name = new_name
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


@router.delete("/export/{event_id}")
def export_delete(event_id: str):
    try:
        export: Export = Export.get(Export.id == event_id)
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
