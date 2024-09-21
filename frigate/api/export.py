"""Export apis."""

import logging
from pathlib import Path
from typing import Optional

import psutil
from flask import (
    Blueprint,
    current_app,
    jsonify,
    make_response,
    request,
)
from peewee import DoesNotExist

from frigate.const import EXPORT_DIR
from frigate.models import Export, Recordings
from frigate.record.export import PlaybackFactorEnum, RecordingExporter

logger = logging.getLogger(__name__)

ExportBp = Blueprint("exports", __name__)


@ExportBp.route("/exports")
def get_exports():
    exports = Export.select().order_by(Export.date.desc()).dicts().iterator()
    return jsonify([e for e in exports])


@ExportBp.route(
    "/export/<camera_name>/start/<int:start_time>/end/<int:end_time>", methods=["POST"]
)
@ExportBp.route(
    "/export/<camera_name>/start/<float:start_time>/end/<float:end_time>",
    methods=["POST"],
)
def export_recording(camera_name: str, start_time, end_time):
    if not camera_name or not current_app.frigate_config.cameras.get(camera_name):
        return make_response(
            jsonify(
                {"success": False, "message": f"{camera_name} is not a valid camera."}
            ),
            404,
        )

    json: dict[str, any] = request.get_json(silent=True) or {}
    playback_factor = json.get("playback", "realtime")
    friendly_name: Optional[str] = json.get("name")

    if len(friendly_name or "") > 256:
        return make_response(
            jsonify({"success": False, "message": "File name is too long."}),
            401,
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
        return make_response(
            jsonify(
                {"success": False, "message": "No recordings found for time range"}
            ),
            400,
        )

    exporter = RecordingExporter(
        current_app.frigate_config,
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
    return make_response(
        jsonify(
            {
                "success": True,
                "message": "Starting export of recording.",
            }
        ),
        200,
    )


@ExportBp.route("/export/<id>/<new_name>", methods=["PATCH"])
def export_rename(id, new_name: str):
    try:
        export: Export = Export.get(Export.id == id)
    except DoesNotExist:
        return make_response(
            jsonify(
                {
                    "success": False,
                    "message": "Export not found.",
                }
            ),
            404,
        )

    export.name = new_name
    export.save()
    return make_response(
        jsonify(
            {
                "success": True,
                "message": "Successfully renamed export.",
            }
        ),
        200,
    )


@ExportBp.route("/export/<id>", methods=["DELETE"])
def export_delete(id: str):
    try:
        export: Export = Export.get(Export.id == id)
    except DoesNotExist:
        return make_response(
            jsonify(
                {
                    "success": False,
                    "message": "Export not found.",
                }
            ),
            404,
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
        return make_response(
            jsonify(
                {"success": False, "message": "Can not delete in progress export."}
            ),
            400,
        )

    Path(export.video_path).unlink(missing_ok=True)

    if export.thumb_path:
        Path(export.thumb_path).unlink(missing_ok=True)

    export.delete_instance()
    return make_response(
        jsonify(
            {
                "success": True,
                "message": "Successfully deleted export.",
            }
        ),
        200,
    )
