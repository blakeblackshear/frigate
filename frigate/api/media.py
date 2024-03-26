"""Image and video apis."""

import base64
import glob
import logging
import os
import re
import subprocess as sp
import time
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import unquote

import cv2
import numpy as np
import pytz
from flask import (
    Blueprint,
    Response,
    current_app,
    jsonify,
    make_response,
    request,
)
from peewee import DoesNotExist, fn
from tzlocal import get_localzone_name
from werkzeug.utils import secure_filename

from frigate.const import (
    CACHE_DIR,
    CLIPS_DIR,
    EXPORT_DIR,
    MAX_SEGMENT_DURATION,
    PREVIEW_FRAME_TYPE,
    RECORD_DIR,
)
from frigate.models import Event, Previews, Recordings, Regions, ReviewSegment
from frigate.record.export import PlaybackFactorEnum, RecordingExporter
from frigate.util.builtin import (
    get_tz_modifiers,
)

logger = logging.getLogger(__name__)

MediaBp = Blueprint("media", __name__)


@MediaBp.route("/<camera_name>")
def mjpeg_feed(camera_name):
    fps = int(request.args.get("fps", "3"))
    height = int(request.args.get("h", "360"))
    draw_options = {
        "bounding_boxes": request.args.get("bbox", type=int),
        "timestamp": request.args.get("timestamp", type=int),
        "zones": request.args.get("zones", type=int),
        "mask": request.args.get("mask", type=int),
        "motion_boxes": request.args.get("motion", type=int),
        "regions": request.args.get("regions", type=int),
    }
    if camera_name in current_app.frigate_config.cameras:
        # return a multipart response
        return Response(
            imagestream(
                current_app.detected_frames_processor,
                camera_name,
                fps,
                height,
                draw_options,
            ),
            mimetype="multipart/x-mixed-replace; boundary=frame",
        )
    else:
        return make_response(
            jsonify({"success": False, "message": "Camera not found"}),
            404,
        )


def imagestream(detected_frames_processor, camera_name, fps, height, draw_options):
    while True:
        # max out at specified FPS
        time.sleep(1 / fps)
        frame = detected_frames_processor.get_current_frame(camera_name, draw_options)
        if frame is None:
            frame = np.zeros((height, int(height * 16 / 9), 3), np.uint8)

        width = int(height * frame.shape[1] / frame.shape[0])
        frame = cv2.resize(frame, dsize=(width, height), interpolation=cv2.INTER_LINEAR)

        ret, jpg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + jpg.tobytes() + b"\r\n\r\n"
        )


@MediaBp.route("/<camera_name>/ptz/info")
def camera_ptz_info(camera_name):
    if camera_name in current_app.frigate_config.cameras:
        return jsonify(current_app.onvif.get_camera_info(camera_name))
    else:
        return make_response(
            jsonify({"success": False, "message": "Camera not found"}),
            404,
        )


@MediaBp.route("/<camera_name>/latest.jpg")
@MediaBp.route("/<camera_name>/latest.webp")
def latest_frame(camera_name):
    draw_options = {
        "bounding_boxes": request.args.get("bbox", type=int),
        "timestamp": request.args.get("timestamp", type=int),
        "zones": request.args.get("zones", type=int),
        "mask": request.args.get("mask", type=int),
        "motion_boxes": request.args.get("motion", type=int),
        "regions": request.args.get("regions", type=int),
    }
    resize_quality = request.args.get("quality", default=70, type=int)

    if camera_name in current_app.frigate_config.cameras:
        frame = current_app.detected_frames_processor.get_current_frame(
            camera_name, draw_options
        )
        retry_interval = float(
            current_app.frigate_config.cameras.get(camera_name).ffmpeg.retry_interval
            or 10
        )

        if frame is None or datetime.now().timestamp() > (
            current_app.detected_frames_processor.get_current_frame_time(camera_name)
            + retry_interval
        ):
            if current_app.camera_error_image is None:
                error_image = glob.glob("/opt/frigate/frigate/images/camera-error.jpg")

                if len(error_image) > 0:
                    current_app.camera_error_image = cv2.imread(
                        error_image[0], cv2.IMREAD_UNCHANGED
                    )

            frame = current_app.camera_error_image

        height = int(request.args.get("h", str(frame.shape[0])))
        width = int(height * frame.shape[1] / frame.shape[0])

        if frame is None:
            return make_response(
                jsonify({"success": False, "message": "Unable to get valid frame"}),
                500,
            )

        if height < 1 or width < 1:
            return (
                "Invalid height / width requested :: {} / {}".format(height, width),
                400,
            )

        frame = cv2.resize(frame, dsize=(width, height), interpolation=cv2.INTER_AREA)

        ret, img = cv2.imencode(
            ".webp", frame, [int(cv2.IMWRITE_WEBP_QUALITY), resize_quality]
        )
        response = make_response(img.tobytes())
        response.headers["Content-Type"] = "image/webp"
        response.headers["Cache-Control"] = "no-store"
        return response
    elif camera_name == "birdseye" and current_app.frigate_config.birdseye.restream:
        frame = cv2.cvtColor(
            current_app.detected_frames_processor.get_current_frame(camera_name),
            cv2.COLOR_YUV2BGR_I420,
        )

        height = int(request.args.get("h", str(frame.shape[0])))
        width = int(height * frame.shape[1] / frame.shape[0])

        frame = cv2.resize(frame, dsize=(width, height), interpolation=cv2.INTER_AREA)

        ret, img = cv2.imencode(
            ".webp", frame, [int(cv2.IMWRITE_WEBP_QUALITY), resize_quality]
        )
        response = make_response(img.tobytes())
        response.headers["Content-Type"] = "image/webp"
        response.headers["Cache-Control"] = "no-store"
        return response
    else:
        return make_response(
            jsonify({"success": False, "message": "Camera not found"}),
            404,
        )


@MediaBp.route("/<camera_name>/recordings/<frame_time>/snapshot.png")
def get_snapshot_from_recording(camera_name: str, frame_time: str):
    if camera_name not in current_app.frigate_config.cameras:
        return make_response(
            jsonify({"success": False, "message": "Camera not found"}),
            404,
        )

    frame_time = float(frame_time)
    recording_query = (
        Recordings.select(
            Recordings.path,
            Recordings.start_time,
        )
        .where(
            (
                (frame_time >= Recordings.start_time)
                & (frame_time <= Recordings.end_time)
            )
        )
        .where(Recordings.camera == camera_name)
        .order_by(Recordings.start_time.desc())
        .limit(1)
    )

    try:
        recording: Recordings = recording_query.get()
        time_in_segment = frame_time - recording.start_time

        ffmpeg_cmd = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "warning",
            "-ss",
            f"00:00:{time_in_segment}",
            "-i",
            recording.path,
            "-frames:v",
            "1",
            "-c:v",
            "png",
            "-f",
            "image2pipe",
            "-",
        ]

        process = sp.run(
            ffmpeg_cmd,
            capture_output=True,
        )
        response = make_response(process.stdout)
        response.headers["Content-Type"] = "image/png"
        return response
    except DoesNotExist:
        return make_response(
            jsonify(
                {
                    "success": False,
                    "message": "Recording not found at {}".format(frame_time),
                }
            ),
            404,
        )


@MediaBp.route("/recordings/storage", methods=["GET"])
def get_recordings_storage_usage():
    recording_stats = current_app.stats_emitter.get_latest_stats()["service"][
        "storage"
    ][RECORD_DIR]

    if not recording_stats:
        return jsonify({})

    total_mb = recording_stats["total"]

    camera_usages: dict[str, dict] = (
        current_app.storage_maintainer.calculate_camera_usages()
    )

    for camera_name in camera_usages.keys():
        if camera_usages.get(camera_name, {}).get("usage"):
            camera_usages[camera_name]["usage_percent"] = (
                camera_usages.get(camera_name, {}).get("usage", 0) / total_mb
            ) * 100

    return jsonify(camera_usages)


# return hourly summary for recordings of camera
@MediaBp.route("/<camera_name>/recordings/summary")
def recordings_summary(camera_name):
    tz_name = request.args.get("timezone", default="utc", type=str)
    hour_modifier, minute_modifier, seconds_offset = get_tz_modifiers(tz_name)
    recording_groups = (
        Recordings.select(
            fn.strftime(
                "%Y-%m-%d %H",
                fn.datetime(
                    Recordings.start_time, "unixepoch", hour_modifier, minute_modifier
                ),
            ).alias("hour"),
            fn.SUM(Recordings.duration).alias("duration"),
            fn.SUM(Recordings.motion).alias("motion"),
            fn.SUM(Recordings.objects).alias("objects"),
        )
        .where(Recordings.camera == camera_name)
        .group_by((Recordings.start_time + seconds_offset).cast("int") / 3600)
        .order_by(Recordings.start_time.desc())
        .namedtuples()
    )

    event_groups = (
        Event.select(
            fn.strftime(
                "%Y-%m-%d %H",
                fn.datetime(
                    Event.start_time, "unixepoch", hour_modifier, minute_modifier
                ),
            ).alias("hour"),
            fn.COUNT(Event.id).alias("count"),
        )
        .where(Event.camera == camera_name, Event.has_clip)
        .group_by((Event.start_time + seconds_offset).cast("int") / 3600)
        .namedtuples()
    )

    event_map = {g.hour: g.count for g in event_groups}

    days = {}

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
        if day not in days:
            days[day] = {"events": events_count, "hours": [hour_data], "day": day}
        else:
            days[day]["events"] += events_count
            days[day]["hours"].append(hour_data)

    return jsonify(list(days.values()))


# return hour of recordings data for camera
@MediaBp.route("/<camera_name>/recordings")
def recordings(camera_name):
    after = request.args.get(
        "after", type=float, default=(datetime.now() - timedelta(hours=1)).timestamp()
    )
    before = request.args.get("before", type=float, default=datetime.now().timestamp())

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

    return jsonify(list(recordings))


@MediaBp.route("/<camera_name>/start/<int:start_ts>/end/<int:end_ts>/clip.mp4")
@MediaBp.route("/<camera_name>/start/<float:start_ts>/end/<float:end_ts>/clip.mp4")
def recording_clip(camera_name, start_ts, end_ts):
    download = request.args.get("download", type=bool)

    recordings = (
        Recordings.select(
            Recordings.path,
            Recordings.start_time,
            Recordings.end_time,
        )
        .where(
            (Recordings.start_time.between(start_ts, end_ts))
            | (Recordings.end_time.between(start_ts, end_ts))
            | ((start_ts > Recordings.start_time) & (end_ts < Recordings.end_time))
        )
        .where(Recordings.camera == camera_name)
        .order_by(Recordings.start_time.asc())
    )

    playlist_lines = []
    clip: Recordings
    for clip in recordings:
        playlist_lines.append(f"file '{clip.path}'")
        # if this is the starting clip, add an inpoint
        if clip.start_time < start_ts:
            playlist_lines.append(f"inpoint {int(start_ts - clip.start_time)}")
        # if this is the ending clip, add an outpoint
        if clip.end_time > end_ts:
            playlist_lines.append(f"outpoint {int(end_ts - clip.start_time)}")

    file_name = secure_filename(f"clip_{camera_name}_{start_ts}-{end_ts}.mp4")
    path = os.path.join(CACHE_DIR, file_name)

    if not os.path.exists(path):
        ffmpeg_cmd = [
            "ffmpeg",
            "-hide_banner",
            "-y",
            "-protocol_whitelist",
            "pipe,file",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            "/dev/stdin",
            "-c",
            "copy",
            "-movflags",
            "+faststart",
            path,
        ]
        p = sp.run(
            ffmpeg_cmd,
            input="\n".join(playlist_lines),
            encoding="ascii",
            capture_output=True,
        )

        if p.returncode != 0:
            logger.error(p.stderr)
            return make_response(
                jsonify(
                    {
                        "success": False,
                        "message": "Could not create clip from recordings",
                    }
                ),
                500,
            )
    else:
        logger.debug(
            f"Ignoring subsequent request for {path} as it already exists in the cache."
        )

    response = make_response()
    response.headers["Content-Description"] = "File Transfer"
    response.headers["Cache-Control"] = "no-cache"
    response.headers["Content-Type"] = "video/mp4"
    if download:
        response.headers["Content-Disposition"] = "attachment; filename=%s" % file_name
    response.headers["Content-Length"] = os.path.getsize(path)
    response.headers["X-Accel-Redirect"] = (
        f"/cache/{file_name}"  # nginx: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_ignore_headers
    )

    return response


@MediaBp.route("/vod/<camera_name>/start/<int:start_ts>/end/<int:end_ts>")
@MediaBp.route("/vod/<camera_name>/start/<float:start_ts>/end/<float:end_ts>")
def vod_ts(camera_name, start_ts, end_ts):
    recordings = (
        Recordings.select(Recordings.path, Recordings.duration, Recordings.end_time)
        .where(
            Recordings.start_time.between(start_ts, end_ts)
            | Recordings.end_time.between(start_ts, end_ts)
            | ((start_ts > Recordings.start_time) & (end_ts < Recordings.end_time))
        )
        .where(Recordings.camera == camera_name)
        .order_by(Recordings.start_time.asc())
        .iterator()
    )

    clips = []
    durations = []
    max_duration_ms = MAX_SEGMENT_DURATION * 1000

    recording: Recordings
    for recording in recordings:
        clip = {"type": "source", "path": recording.path}
        duration = int(recording.duration * 1000)

        # Determine if we need to end the last clip early
        if recording.end_time > end_ts:
            duration -= int((recording.end_time - end_ts) * 1000)

        if 0 < duration < max_duration_ms:
            clip["keyFrameDurations"] = [duration]
            clips.append(clip)
            durations.append(duration)
        else:
            logger.warning(f"Recording clip is missing or empty: {recording.path}")

    if not clips:
        logger.error("No recordings found for the requested time range")
        return make_response(
            jsonify(
                {
                    "success": False,
                    "message": "No recordings found.",
                }
            ),
            404,
        )

    hour_ago = datetime.now() - timedelta(hours=1)
    return jsonify(
        {
            "cache": hour_ago.timestamp() > start_ts,
            "discontinuity": False,
            "consistentSequenceMediaInfo": True,
            "durations": durations,
            "segment_duration": max(durations),
            "sequences": [{"clips": clips}],
        }
    )


@MediaBp.route("/vod/<year_month>/<day>/<hour>/<camera_name>")
def vod_hour_no_timezone(year_month, day, hour, camera_name):
    return vod_hour(
        year_month, day, hour, camera_name, get_localzone_name().replace("/", ",")
    )


@MediaBp.route("/vod/<year_month>/<day>/<hour>/<camera_name>/<tz_name>")
def vod_hour(year_month, day, hour, camera_name, tz_name):
    parts = year_month.split("-")
    start_date = (
        datetime(int(parts[0]), int(parts[1]), int(day), int(hour), tzinfo=timezone.utc)
        - datetime.now(pytz.timezone(tz_name.replace(",", "/"))).utcoffset()
    )
    end_date = start_date + timedelta(hours=1) - timedelta(milliseconds=1)
    start_ts = start_date.timestamp()
    end_ts = end_date.timestamp()

    return vod_ts(camera_name, start_ts, end_ts)


@MediaBp.route("/vod/event/<id>")
def vod_event(id):
    try:
        event: Event = Event.get(Event.id == id)
    except DoesNotExist:
        logger.error(f"Event not found: {id}")
        return make_response(
            jsonify(
                {
                    "success": False,
                    "message": "Event not found.",
                }
            ),
            404,
        )

    if not event.has_clip:
        logger.error(f"Event does not have recordings: {id}")
        return make_response(
            jsonify(
                {
                    "success": False,
                    "message": "Recordings not available.",
                }
            ),
            404,
        )

    clip_path = os.path.join(CLIPS_DIR, f"{event.camera}-{event.id}.mp4")

    if not os.path.isfile(clip_path):
        end_ts = (
            datetime.now().timestamp() if event.end_time is None else event.end_time
        )
        vod_response = vod_ts(event.camera, event.start_time, end_ts)
        # If the recordings are not found and the event started more than 5 minutes ago, set has_clip to false
        if (
            event.start_time < datetime.now().timestamp() - 300
            and type(vod_response) == tuple
            and len(vod_response) == 2
            and vod_response[1] == 404
        ):
            Event.update(has_clip=False).where(Event.id == id).execute()
        return vod_response

    duration = int((event.end_time - event.start_time) * 1000)
    return jsonify(
        {
            "cache": True,
            "discontinuity": False,
            "durations": [duration],
            "sequences": [{"clips": [{"type": "source", "path": clip_path}]}],
        }
    )


@MediaBp.route(
    "/export/<camera_name>/start/<int:start_time>/end/<int:end_time>", methods=["POST"]
)
@MediaBp.route(
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
    name: Optional[str] = json.get("name")

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
        secure_filename(name.replace(" ", "_")) if name else None,
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


def export_filename_check_extension(filename: str):
    if filename.endswith(".mp4"):
        return filename
    else:
        return filename + ".mp4"


def export_filename_is_valid(filename: str):
    if re.search(r"[^:_A-Za-z0-9]", filename) or filename.startswith("in_progress."):
        return False
    else:
        return True


@MediaBp.route("/export/<file_name_current>/<file_name_new>", methods=["PATCH"])
def export_rename(file_name_current, file_name_new: str):
    safe_file_name_current = secure_filename(
        export_filename_check_extension(file_name_current)
    )
    file_current = os.path.join(EXPORT_DIR, safe_file_name_current)

    if not os.path.exists(file_current):
        return make_response(
            jsonify({"success": False, "message": f"{file_name_current} not found."}),
            404,
        )

    if not export_filename_is_valid(file_name_new):
        return make_response(
            jsonify(
                {
                    "success": False,
                    "message": f"{file_name_new} contains illegal characters.",
                }
            ),
            400,
        )

    safe_file_name_new = secure_filename(export_filename_check_extension(file_name_new))
    file_new = os.path.join(EXPORT_DIR, safe_file_name_new)

    if os.path.exists(file_new):
        return make_response(
            jsonify({"success": False, "message": f"{file_name_new} already exists."}),
            400,
        )

    os.rename(file_current, file_new)
    return make_response(
        jsonify(
            {
                "success": True,
                "message": "Successfully renamed file.",
            }
        ),
        200,
    )


@MediaBp.route("/export/<file_name>", methods=["DELETE"])
def export_delete(file_name: str):
    safe_file_name = secure_filename(export_filename_check_extension(file_name))
    file = os.path.join(EXPORT_DIR, safe_file_name)

    if not os.path.exists(file):
        return make_response(
            jsonify({"success": False, "message": f"{file_name} not found."}),
            404,
        )

    os.unlink(file)
    return make_response(
        jsonify(
            {
                "success": True,
                "message": "Successfully deleted file.",
            }
        ),
        200,
    )


@MediaBp.route("/<camera_name>/<label>/snapshot.jpg")
def label_snapshot(camera_name, label):
    label = unquote(label)
    if label == "any":
        event_query = (
            Event.select(Event.id)
            .where(Event.camera == camera_name)
            .where(Event.has_snapshot == True)
            .order_by(Event.start_time.desc())
        )
    else:
        event_query = (
            Event.select(Event.id)
            .where(Event.camera == camera_name)
            .where(Event.label == label)
            .where(Event.has_snapshot == True)
            .order_by(Event.start_time.desc())
        )

    try:
        event = event_query.get()
        return event_snapshot(event.id)
    except DoesNotExist:
        frame = np.zeros((720, 1280, 3), np.uint8)
        ret, jpg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])

        response = make_response(jpg.tobytes())
        response.headers["Content-Type"] = "image/jpeg"
        return response


@MediaBp.route("/<camera_name>/<label>/best.jpg")
@MediaBp.route("/<camera_name>/<label>/thumbnail.jpg")
def label_thumbnail(camera_name, label):
    label = unquote(label)
    event_query = Event.select(fn.MAX(Event.id)).where(Event.camera == camera_name)
    if label != "any":
        event_query = event_query.where(Event.label == label)

    try:
        event = event_query.scalar()

        return event_thumbnail(event, 60)
    except DoesNotExist:
        frame = np.zeros((175, 175, 3), np.uint8)
        ret, jpg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])

        response = make_response(jpg.tobytes())
        response.headers["Content-Type"] = "image/jpeg"
        response.headers["Cache-Control"] = "no-store"
        return response


@MediaBp.route("/<camera_name>/<label>/clip.mp4")
def label_clip(camera_name, label):
    label = unquote(label)
    event_query = Event.select(fn.MAX(Event.id)).where(
        Event.camera == camera_name, Event.has_clip == True
    )
    if label != "any":
        event_query = event_query.where(Event.label == label)

    try:
        event = event_query.get()

        return event_clip(event)
    except DoesNotExist:
        return make_response(
            jsonify({"success": False, "message": "Event not found"}), 404
        )


@MediaBp.route("/<camera_name>/grid.jpg")
def grid_snapshot(camera_name):
    request.args.get("type", default="region")

    if camera_name in current_app.frigate_config.cameras:
        detect = current_app.frigate_config.cameras[camera_name].detect
        frame = current_app.detected_frames_processor.get_current_frame(camera_name, {})
        retry_interval = float(
            current_app.frigate_config.cameras.get(camera_name).ffmpeg.retry_interval
            or 10
        )

        if frame is None or datetime.now().timestamp() > (
            current_app.detected_frames_processor.get_current_frame_time(camera_name)
            + retry_interval
        ):
            return make_response(
                jsonify({"success": False, "message": "Unable to get valid frame"}),
                500,
            )

        try:
            grid = (
                Regions.select(Regions.grid)
                .where(Regions.camera == camera_name)
                .get()
                .grid
            )
        except DoesNotExist:
            return make_response(
                jsonify({"success": False, "message": "Unable to get region grid"}),
                500,
            )

        color_arg = request.args.get("color", default="", type=str).lower()
        draw_font_scale = request.args.get("font_scale", default=0.5, type=float)

        if color_arg == "red":
            draw_color = (0, 0, 255)
        elif color_arg == "blue":
            draw_color = (255, 0, 0)
        elif color_arg == "black":
            draw_color = (0, 0, 0)
        elif color_arg == "white":
            draw_color = (255, 255, 255)
        else:
            draw_color = (0, 255, 0)

        grid_size = len(grid)
        grid_coef = 1.0 / grid_size
        width = detect.width
        height = detect.height
        for x in range(grid_size):
            for y in range(grid_size):
                cell = grid[x][y]

                if len(cell["sizes"]) == 0:
                    continue

                std_dev = round(cell["std_dev"] * width, 2)
                mean = round(cell["mean"] * width, 2)
                cv2.rectangle(
                    frame,
                    (int(x * grid_coef * width), int(y * grid_coef * height)),
                    (
                        int((x + 1) * grid_coef * width),
                        int((y + 1) * grid_coef * height),
                    ),
                    draw_color,
                    2,
                )
                cv2.putText(
                    frame,
                    f"#: {len(cell['sizes'])}",
                    (
                        int(x * grid_coef * width + 10),
                        int((y * grid_coef + 0.02) * height),
                    ),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    fontScale=draw_font_scale,
                    color=draw_color,
                    thickness=2,
                )
                cv2.putText(
                    frame,
                    f"std: {std_dev}",
                    (
                        int(x * grid_coef * width + 10),
                        int((y * grid_coef + 0.05) * height),
                    ),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    fontScale=draw_font_scale,
                    color=draw_color,
                    thickness=2,
                )
                cv2.putText(
                    frame,
                    f"avg: {mean}",
                    (
                        int(x * grid_coef * width + 10),
                        int((y * grid_coef + 0.08) * height),
                    ),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    fontScale=draw_font_scale,
                    color=draw_color,
                    thickness=2,
                )

        ret, jpg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
        response = make_response(jpg.tobytes())
        response.headers["Content-Type"] = "image/jpeg"
        response.headers["Cache-Control"] = "no-store"
        return response
    else:
        return make_response(
            jsonify({"success": False, "message": "Camera not found"}),
            404,
        )


@MediaBp.route("/events/<id>/snapshot-clean.png")
def event_snapshot_clean(id):
    download = request.args.get("download", type=bool)
    png_bytes = None
    try:
        event = Event.get(Event.id == id)
        snapshot_config = current_app.frigate_config.cameras[event.camera].snapshots
        if not (snapshot_config.enabled and event.has_snapshot):
            return make_response(
                jsonify(
                    {
                        "success": False,
                        "message": "Snapshots and clean_copy must be enabled in the config",
                    }
                ),
                404,
            )
        if event.end_time is None:
            # see if the object is currently being tracked
            try:
                camera_states = (
                    current_app.detected_frames_processor.camera_states.values()
                )
                for camera_state in camera_states:
                    if id in camera_state.tracked_objects:
                        tracked_obj = camera_state.tracked_objects.get(id)
                        if tracked_obj is not None:
                            png_bytes = tracked_obj.get_clean_png()
                            break
            except Exception:
                return make_response(
                    jsonify({"success": False, "message": "Event not found"}), 404
                )
        elif not event.has_snapshot:
            return make_response(
                jsonify({"success": False, "message": "Snapshot not available"}), 404
            )
    except DoesNotExist:
        return make_response(
            jsonify({"success": False, "message": "Event not found"}), 404
        )
    if png_bytes is None:
        try:
            clean_snapshot_path = os.path.join(
                CLIPS_DIR, f"{event.camera}-{event.id}-clean.png"
            )
            if not os.path.exists(clean_snapshot_path):
                return make_response(
                    jsonify(
                        {"success": False, "message": "Clean snapshot not available"}
                    ),
                    404,
                )
            with open(
                os.path.join(CLIPS_DIR, f"{event.camera}-{event.id}-clean.png"), "rb"
            ) as image_file:
                png_bytes = image_file.read()
        except Exception:
            logger.error(f"Unable to load clean png for event: {event.id}")
            return make_response(
                jsonify(
                    {"success": False, "message": "Unable to load clean png for event"}
                ),
                400,
            )
    response = make_response(png_bytes)
    response.headers["Content-Type"] = "image/png"
    response.headers["Cache-Control"] = "private, max-age=31536000"
    if download:
        response.headers["Content-Disposition"] = (
            f"attachment; filename=snapshot-{id}-clean.png"
        )
    return response


@MediaBp.route("/events/<id>/snapshot.jpg")
def event_snapshot(id):
    download = request.args.get("download", type=bool)
    event_complete = False
    jpg_bytes = None
    try:
        event = Event.get(Event.id == id, Event.end_time != None)
        event_complete = True
        if not event.has_snapshot:
            return make_response(
                jsonify({"success": False, "message": "Snapshot not available"}), 404
            )
        # read snapshot from disk
        with open(
            os.path.join(CLIPS_DIR, f"{event.camera}-{event.id}.jpg"), "rb"
        ) as image_file:
            jpg_bytes = image_file.read()
    except DoesNotExist:
        # see if the object is currently being tracked
        try:
            camera_states = current_app.detected_frames_processor.camera_states.values()
            for camera_state in camera_states:
                if id in camera_state.tracked_objects:
                    tracked_obj = camera_state.tracked_objects.get(id)
                    if tracked_obj is not None:
                        jpg_bytes = tracked_obj.get_jpg_bytes(
                            timestamp=request.args.get("timestamp", type=int),
                            bounding_box=request.args.get("bbox", type=int),
                            crop=request.args.get("crop", type=int),
                            height=request.args.get("h", type=int),
                            quality=request.args.get("quality", default=70, type=int),
                        )
        except Exception:
            return make_response(
                jsonify({"success": False, "message": "Event not found"}), 404
            )
    except Exception:
        return make_response(
            jsonify({"success": False, "message": "Event not found"}), 404
        )

    if jpg_bytes is None:
        return make_response(
            jsonify({"success": False, "message": "Event not found"}), 404
        )

    response = make_response(jpg_bytes)
    response.headers["Content-Type"] = "image/jpeg"
    if event_complete:
        response.headers["Cache-Control"] = "private, max-age=31536000"
    else:
        response.headers["Cache-Control"] = "no-store"
    if download:
        response.headers["Content-Disposition"] = (
            f"attachment; filename=snapshot-{id}.jpg"
        )
    return response


@MediaBp.route("/events/<id>/clip.mp4")
def event_clip(id):
    download = request.args.get("download", type=bool)

    try:
        event: Event = Event.get(Event.id == id)
    except DoesNotExist:
        return make_response(
            jsonify({"success": False, "message": "Event not found"}), 404
        )

    if not event.has_clip:
        return make_response(
            jsonify({"success": False, "message": "Clip not available"}), 404
        )

    file_name = f"{event.camera}-{event.id}.mp4"
    clip_path = os.path.join(CLIPS_DIR, file_name)

    if not os.path.isfile(clip_path):
        end_ts = (
            datetime.now().timestamp() if event.end_time is None else event.end_time
        )
        return recording_clip(event.camera, event.start_time, end_ts)

    response = make_response()
    response.headers["Content-Description"] = "File Transfer"
    response.headers["Cache-Control"] = "no-cache"
    response.headers["Content-Type"] = "video/mp4"
    if download:
        response.headers["Content-Disposition"] = "attachment; filename=%s" % file_name
    response.headers["Content-Length"] = os.path.getsize(clip_path)
    response.headers["X-Accel-Redirect"] = (
        f"/clips/{file_name}"  # nginx: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_ignore_headers
    )

    return response


@MediaBp.route("/events/<id>/thumbnail.jpg")
def event_thumbnail(id, max_cache_age=2592000):
    format = request.args.get("format", "ios")
    thumbnail_bytes = None
    event_complete = False
    try:
        event = Event.get(Event.id == id)
        if event.end_time is not None:
            event_complete = True
        thumbnail_bytes = base64.b64decode(event.thumbnail)
    except DoesNotExist:
        # see if the object is currently being tracked
        try:
            camera_states = current_app.detected_frames_processor.camera_states.values()
            for camera_state in camera_states:
                if id in camera_state.tracked_objects:
                    tracked_obj = camera_state.tracked_objects.get(id)
                    if tracked_obj is not None:
                        thumbnail_bytes = tracked_obj.get_thumbnail()
        except Exception:
            return make_response(
                jsonify({"success": False, "message": "Event not found"}), 404
            )

    if thumbnail_bytes is None:
        return make_response(
            jsonify({"success": False, "message": "Event not found"}), 404
        )

    # android notifications prefer a 2:1 ratio
    if format == "android":
        jpg_as_np = np.frombuffer(thumbnail_bytes, dtype=np.uint8)
        img = cv2.imdecode(jpg_as_np, flags=1)
        thumbnail = cv2.copyMakeBorder(
            img,
            0,
            0,
            int(img.shape[1] * 0.5),
            int(img.shape[1] * 0.5),
            cv2.BORDER_CONSTANT,
            (0, 0, 0),
        )
        ret, jpg = cv2.imencode(".jpg", thumbnail, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
        thumbnail_bytes = jpg.tobytes()

    response = make_response(thumbnail_bytes)
    response.headers["Content-Type"] = "image/jpeg"
    if event_complete:
        response.headers["Cache-Control"] = f"private, max-age={max_cache_age}"
    else:
        response.headers["Cache-Control"] = "no-store"
    return response


@MediaBp.route("/events/<id>/preview.gif")
def event_preview(id: str):
    try:
        event: Event = Event.get(Event.id == id)
    except DoesNotExist:
        return make_response(
            jsonify({"success": False, "message": "Event not found"}), 404
        )

    start_ts = event.start_time
    end_ts = start_ts + (
        min(event.end_time - event.start_time, 20) if event.end_time else 20
    )
    return preview_gif(event.camera, start_ts, end_ts)


@MediaBp.route("/<camera_name>/start/<int:start_ts>/end/<int:end_ts>/preview.gif")
@MediaBp.route("/<camera_name>/start/<float:start_ts>/end/<float:end_ts>/preview.gif")
def preview_gif(camera_name: str, start_ts, end_ts, max_cache_age=2592000):
    if datetime.fromtimestamp(start_ts) < datetime.now().replace(minute=0, second=0):
        # has preview mp4
        preview: Previews = (
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
            .where(Previews.camera == camera_name)
            .limit(1)
            .get()
        )

        if not preview:
            return make_response(
                jsonify({"success": False, "message": "Preview not found"}), 404
            )

        diff = start_ts - preview.start_time
        minutes = int(diff / 60)
        seconds = int(diff % 60)
        ffmpeg_cmd = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "warning",
            "-ss",
            f"00:{minutes}:{seconds}",
            "-t",
            f"{end_ts - start_ts}",
            "-i",
            preview.path,
            "-r",
            "8",
            "-vf",
            "setpts=0.12*PTS",
            "-loop",
            "0",
            "-c:v",
            "gif",
            "-f",
            "gif",
            "-",
        ]

        process = sp.run(
            ffmpeg_cmd,
            capture_output=True,
        )

        if process.returncode != 0:
            logger.error(process.stderr)
            return make_response(
                jsonify({"success": False, "message": "Unable to create preview gif"}),
                500,
            )

        gif_bytes = process.stdout
    else:
        # need to generate from existing images
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

            selected_previews.append(f"file '{os.path.join(preview_dir, file)}'")
            selected_previews.append("duration 0.12")

        if not selected_previews:
            return make_response(
                jsonify({"success": False, "message": "Preview not found"}), 404
            )

        last_file = selected_previews[-2]
        selected_previews.append(last_file)

        ffmpeg_cmd = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "warning",
            "-f",
            "concat",
            "-y",
            "-protocol_whitelist",
            "pipe,file",
            "-safe",
            "0",
            "-i",
            "/dev/stdin",
            "-loop",
            "0",
            "-c:v",
            "gif",
            "-f",
            "gif",
            "-",
        ]

        process = sp.run(
            ffmpeg_cmd,
            input=str.encode("\n".join(selected_previews)),
            capture_output=True,
        )

        if process.returncode != 0:
            logger.error(process.stderr)
            return make_response(
                jsonify({"success": False, "message": "Unable to create preview gif"}),
                500,
            )

        gif_bytes = process.stdout

    response = make_response(gif_bytes)
    response.headers["Content-Type"] = "image/gif"
    response.headers["Cache-Control"] = f"private, max-age={max_cache_age}"
    return response


@MediaBp.route("/review/<id>/preview.gif")
def review_preview(id: str):
    try:
        review: ReviewSegment = ReviewSegment.get(ReviewSegment.id == id)
    except DoesNotExist:
        return make_response(
            jsonify({"success": False, "message": "Review segment not found"}), 404
        )

    padding = 8
    start_ts = review.start_time - padding
    end_ts = review.end_time + padding
    return preview_gif(review.camera, start_ts, end_ts)


@MediaBp.route("/preview/<file_name>/thumbnail.jpg")
@MediaBp.route("/preview/<file_name>/thumbnail.webp")
def preview_thumbnail(file_name: str):
    """Get a thumbnail from the cached preview frames."""
    safe_file_name_current = secure_filename(file_name)
    preview_dir = os.path.join(CACHE_DIR, "preview_frames")

    with open(os.path.join(preview_dir, safe_file_name_current), "rb") as image_file:
        jpg_bytes = image_file.read()

    response = make_response(jpg_bytes)
    response.headers["Content-Type"] = "image/jpeg"
    response.headers["Cache-Control"] = "private, max-age=31536000"
    return response
