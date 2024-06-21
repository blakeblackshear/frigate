"""Preview apis."""

import logging
import os
from datetime import datetime, timedelta, timezone

import pytz
from flask import (
    Blueprint,
    jsonify,
    make_response,
)

from frigate.const import CACHE_DIR, PREVIEW_FRAME_TYPE
from frigate.models import Previews

logger = logging.getLogger(__name__)

PreviewBp = Blueprint("previews", __name__)


@PreviewBp.route("/preview/<camera_name>/start/<int:start_ts>/end/<int:end_ts>")
@PreviewBp.route("/preview/<camera_name>/start/<float:start_ts>/end/<float:end_ts>")
def preview_ts(camera_name, start_ts, end_ts):
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
                "src": preview["path"].replace("/media/frigate", ""),
                "type": "video/mp4",
                "start": preview["start_time"],
                "end": preview["end_time"],
            }
        )

    if not clips:
        return make_response(
            jsonify(
                {
                    "success": False,
                    "message": "No previews found.",
                }
            ),
            404,
        )

    return make_response(jsonify(clips), 200)


@PreviewBp.route("/preview/<year_month>/<day>/<hour>/<camera_name>/<tz_name>")
def preview_hour(year_month, day, hour, camera_name, tz_name):
    parts = year_month.split("-")
    start_date = (
        datetime(int(parts[0]), int(parts[1]), int(day), int(hour), tzinfo=timezone.utc)
        - datetime.now(pytz.timezone(tz_name.replace(",", "/"))).utcoffset()
    )
    end_date = start_date + timedelta(hours=1) - timedelta(milliseconds=1)
    start_ts = start_date.timestamp()
    end_ts = end_date.timestamp()

    return preview_ts(camera_name, start_ts, end_ts)


@PreviewBp.route("/preview/<camera_name>/start/<int:start_ts>/end/<int:end_ts>/frames")
@PreviewBp.route(
    "/preview/<camera_name>/start/<float:start_ts>/end/<float:end_ts>/frames"
)
def get_preview_frames_from_cache(camera_name: str, start_ts, end_ts):
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

    return jsonify(selected_previews)
