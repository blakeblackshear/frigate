import base64
from collections import OrderedDict
from datetime import datetime, timedelta
import copy
import json
import glob
import logging
import os
import re
import subprocess as sp
import time
from functools import reduce
from pathlib import Path

import cv2
from flask.helpers import send_file

import numpy as np
from flask import (
    Blueprint,
    Flask,
    Response,
    current_app,
    jsonify,
    make_response,
    request,
)

from peewee import SqliteDatabase, operator, fn, DoesNotExist, Value
from playhouse.shortcuts import model_to_dict

from frigate.const import CLIPS_DIR, RECORD_DIR
from frigate.models import Event, Recordings
from frigate.stats import stats_snapshot
from frigate.util import calculate_region
from frigate.version import VERSION

logger = logging.getLogger(__name__)

bp = Blueprint("frigate", __name__)


def create_app(
    frigate_config,
    database: SqliteDatabase,
    stats_tracking,
    detected_frames_processor,
):
    app = Flask(__name__)

    @app.before_request
    def _db_connect():
        if database.is_closed():
            database.connect()

    @app.teardown_request
    def _db_close(exc):
        if not database.is_closed():
            database.close()

    app.frigate_config = frigate_config
    app.stats_tracking = stats_tracking
    app.detected_frames_processor = detected_frames_processor

    app.register_blueprint(bp)

    return app


@bp.route("/")
def is_healthy():
    return "Frigate is running. Alive and healthy!"


@bp.route("/events/summary")
def events_summary():
    has_clip = request.args.get("has_clip", type=int)
    has_snapshot = request.args.get("has_snapshot", type=int)

    clauses = []

    if not has_clip is None:
        clauses.append((Event.has_clip == has_clip))

    if not has_snapshot is None:
        clauses.append((Event.has_snapshot == has_snapshot))

    if len(clauses) == 0:
        clauses.append((True))

    groups = (
        Event.select(
            Event.camera,
            Event.label,
            fn.strftime(
                "%Y-%m-%d", fn.datetime(Event.start_time, "unixepoch", "localtime")
            ).alias("day"),
            Event.zones,
            fn.COUNT(Event.id).alias("count"),
        )
        .where(reduce(operator.and_, clauses))
        .group_by(
            Event.camera,
            Event.label,
            fn.strftime(
                "%Y-%m-%d", fn.datetime(Event.start_time, "unixepoch", "localtime")
            ),
            Event.zones,
        )
    )

    return jsonify([e for e in groups.dicts()])


@bp.route("/events/<id>", methods=("GET",))
def event(id):
    try:
        return model_to_dict(Event.get(Event.id == id))
    except DoesNotExist:
        return "Event not found", 404


@bp.route("/events/<id>", methods=("DELETE",))
def delete_event(id):
    try:
        event = Event.get(Event.id == id)
    except DoesNotExist:
        return make_response(
            jsonify({"success": False, "message": "Event" + id + " not found"}), 404
        )

    media_name = f"{event.camera}-{event.id}"
    if event.has_snapshot:
        media = Path(f"{os.path.join(CLIPS_DIR, media_name)}.jpg")
        media.unlink(missing_ok=True)
    if event.has_clip:
        media = Path(f"{os.path.join(CLIPS_DIR, media_name)}.mp4")
        media.unlink(missing_ok=True)

    event.delete_instance()
    return make_response(
        jsonify({"success": True, "message": "Event" + id + " deleted"}), 200
    )


@bp.route("/events/<id>/thumbnail.jpg")
def event_thumbnail(id):
    format = request.args.get("format", "ios")
    thumbnail_bytes = None
    try:
        event = Event.get(Event.id == id)
        thumbnail_bytes = base64.b64decode(event.thumbnail)
    except DoesNotExist:
        # see if the object is currently being tracked
        try:
            camera_states = current_app.detected_frames_processor.camera_states.values()
            for camera_state in camera_states:
                if id in camera_state.tracked_objects:
                    tracked_obj = camera_state.tracked_objects.get(id)
                    if not tracked_obj is None:
                        thumbnail_bytes = tracked_obj.get_thumbnail()
        except:
            return "Event not found", 404

    if thumbnail_bytes is None:
        return "Event not found", 404

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
    return response


@bp.route("/events/<id>/snapshot.jpg")
def event_snapshot(id):
    download = request.args.get("download", type=bool)
    jpg_bytes = None
    try:
        event = Event.get(Event.id == id, Event.end_time != None)
        if not event.has_snapshot:
            return "Snapshot not available", 404
        # read snapshot from disk
        with open(
            os.path.join(CLIPS_DIR, f"{event.camera}-{id}.jpg"), "rb"
        ) as image_file:
            jpg_bytes = image_file.read()
    except DoesNotExist:
        # see if the object is currently being tracked
        try:
            camera_states = current_app.detected_frames_processor.camera_states.values()
            for camera_state in camera_states:
                if id in camera_state.tracked_objects:
                    tracked_obj = camera_state.tracked_objects.get(id)
                    if not tracked_obj is None:
                        jpg_bytes = tracked_obj.get_jpg_bytes(
                            timestamp=request.args.get("timestamp", type=int),
                            bounding_box=request.args.get("bbox", type=int),
                            crop=request.args.get("crop", type=int),
                            height=request.args.get("h", type=int),
                            quality=request.args.get("quality", default=70, type=int),
                        )
        except:
            return "Event not found", 404
    except:
        return "Event not found", 404

    if jpg_bytes is None:
        return "Event not found", 404

    response = make_response(jpg_bytes)
    response.headers["Content-Type"] = "image/jpeg"
    if download:
        response.headers[
            "Content-Disposition"
        ] = f"attachment; filename=snapshot-{id}.jpg"
    return response


@bp.route("/events/<id>/clip.mp4")
def event_clip(id):
    download = request.args.get("download", type=bool)

    try:
        event: Event = Event.get(Event.id == id)
    except DoesNotExist:
        return "Event not found.", 404

    if not event.has_clip:
        return "Clip not available", 404

    file_name = f"{event.camera}-{id}.mp4"
    clip_path = os.path.join(CLIPS_DIR, file_name)

    if not os.path.isfile(clip_path):
        return recording_clip(event.camera, event.start_time, event.end_time)

    response = make_response()
    response.headers["Content-Description"] = "File Transfer"
    response.headers["Cache-Control"] = "no-cache"
    response.headers["Content-Type"] = "video/mp4"
    if download:
        response.headers["Content-Disposition"] = "attachment; filename=%s" % file_name
    response.headers["Content-Length"] = os.path.getsize(clip_path)
    response.headers[
        "X-Accel-Redirect"
    ] = f"/clips/{file_name}"  # nginx: http://wiki.nginx.org/NginxXSendfile

    return response


@bp.route("/events")
def events():
    limit = request.args.get("limit", 100)
    camera = request.args.get("camera")
    label = request.args.get("label")
    zone = request.args.get("zone")
    after = request.args.get("after", type=float)
    before = request.args.get("before", type=float)
    has_clip = request.args.get("has_clip", type=int)
    has_snapshot = request.args.get("has_snapshot", type=int)
    include_thumbnails = request.args.get("include_thumbnails", default=1, type=int)

    clauses = []
    excluded_fields = []

    if camera:
        clauses.append((Event.camera == camera))

    if label:
        clauses.append((Event.label == label))

    if zone:
        clauses.append((Event.zones.cast("text") % f'*"{zone}"*'))

    if after:
        clauses.append((Event.start_time >= after))

    if before:
        clauses.append((Event.start_time <= before))

    if not has_clip is None:
        clauses.append((Event.has_clip == has_clip))

    if not has_snapshot is None:
        clauses.append((Event.has_snapshot == has_snapshot))

    if not include_thumbnails:
        excluded_fields.append(Event.thumbnail)

    if len(clauses) == 0:
        clauses.append((True))

    events = (
        Event.select()
        .where(reduce(operator.and_, clauses))
        .order_by(Event.start_time.desc())
        .limit(limit)
    )

    return jsonify([model_to_dict(e, exclude=excluded_fields) for e in events])


@bp.route("/config")
def config():
    config = current_app.frigate_config.dict()

    # add in the decoder_cmds
    for camera_name, camera in current_app.frigate_config.cameras.items():
        camera_dict = config["cameras"][camera_name]
        camera_dict["decoder_cmds"] = copy.deepcopy(camera.decoder_cmds)
        for cmd in camera_dict["decoder_cmds"]:
            cmd["cmd"] = " ".join(cmd["cmd"])

    return jsonify(config)


@bp.route("/config/schema")
def config_schema():
    return current_app.response_class(
        current_app.frigate_config.schema_json(), mimetype="application/json"
    )


@bp.route("/version")
def version():
    return VERSION


@bp.route("/stats")
def stats():
    stats = stats_snapshot(current_app.stats_tracking)
    return jsonify(stats)


@bp.route("/<camera_name>/<label>/best.jpg")
def best(camera_name, label):
    if camera_name in current_app.frigate_config.cameras:
        best_object = current_app.detected_frames_processor.get_best(camera_name, label)
        best_frame = best_object.get("frame")
        if best_frame is None:
            best_frame = np.zeros((720, 1280, 3), np.uint8)
        else:
            best_frame = cv2.cvtColor(best_frame, cv2.COLOR_YUV2BGR_I420)

        crop = bool(request.args.get("crop", 0, type=int))
        if crop:
            box_size = 300
            box = best_object.get("box", (0, 0, box_size, box_size))
            region = calculate_region(
                best_frame.shape, box[0], box[1], box[2], box[3], box_size, multiplier=1.1
            )
            best_frame = best_frame[region[1] : region[3], region[0] : region[2]]

        height = int(request.args.get("h", str(best_frame.shape[0])))
        width = int(height * best_frame.shape[1] / best_frame.shape[0])
        resize_quality = request.args.get("quality", default=70, type=int)

        best_frame = cv2.resize(
            best_frame, dsize=(width, height), interpolation=cv2.INTER_AREA
        )
        ret, jpg = cv2.imencode(
            ".jpg", best_frame, [int(cv2.IMWRITE_JPEG_QUALITY), resize_quality]
        )
        response = make_response(jpg.tobytes())
        response.headers["Content-Type"] = "image/jpeg"
        return response
    else:
        return "Camera named {} not found".format(camera_name), 404


@bp.route("/<camera_name>")
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
        return "Camera named {} not found".format(camera_name), 404


@bp.route("/<camera_name>/latest.jpg")
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
        if frame is None:
            frame = np.zeros((720, 1280, 3), np.uint8)

        height = int(request.args.get("h", str(frame.shape[0])))
        width = int(height * frame.shape[1] / frame.shape[0])

        frame = cv2.resize(frame, dsize=(width, height), interpolation=cv2.INTER_AREA)

        ret, jpg = cv2.imencode(
            ".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), resize_quality]
        )
        response = make_response(jpg.tobytes())
        response.headers["Content-Type"] = "image/jpeg"
        return response
    else:
        return "Camera named {} not found".format(camera_name), 404


@bp.route("/<camera_name>/recordings")
def recordings(camera_name):
    dates = OrderedDict()

    # Retrieve all recordings for this camera
    recordings = (
        Recordings.select()
        .where(Recordings.camera == camera_name)
        .order_by(Recordings.start_time.asc())
    )

    last_end = 0
    recording: Recordings
    for recording in recordings:
        date = datetime.fromtimestamp(recording.start_time)
        key = date.strftime("%Y-%m-%d")
        hour = date.strftime("%H")

        # Create Day Record
        if key not in dates:
            dates[key] = OrderedDict()

        # Create Hour Record
        if hour not in dates[key]:
            dates[key][hour] = {"delay": {}, "events": []}

        # Check for delay
        the_hour = datetime.strptime(f"{key} {hour}", "%Y-%m-%d %H").timestamp()
        # diff current recording start time and the greater of the previous end time or top of the hour
        diff = recording.start_time - max(last_end, the_hour)
        # Determine seconds into recording
        seconds = 0
        if datetime.fromtimestamp(last_end).strftime("%H") == hour:
            seconds = int(last_end - the_hour)
        # Determine the delay
        delay = min(int(diff), 3600 - seconds)
        if delay > 1:
            # Add an offset for any delay greater than a second
            dates[key][hour]["delay"][seconds] = delay

        last_end = recording.end_time

    # Packing intervals to return all events with same label and overlapping times as one row.
    # See: https://blogs.solidq.com/en/sqlserver/packing-intervals/
    events = Event.raw(
        """WITH C1 AS
        (
        SELECT id, label, camera, top_score, start_time AS ts, +1 AS type, 1 AS sub
        FROM event
        WHERE camera = ?
        UNION ALL
        SELECT id, label, camera, top_score, end_time + 15 AS ts, -1 AS type, 0 AS sub
        FROM event
        WHERE camera = ?
        ),
        C2 AS
        (
        SELECT C1.*,
        SUM(type) OVER(PARTITION BY label ORDER BY ts, type DESC
        ROWS BETWEEN UNBOUNDED PRECEDING
        AND CURRENT ROW) - sub AS cnt
        FROM C1
        ),
        C3 AS
        (
        SELECT id, label, camera, top_score, ts,
        (ROW_NUMBER() OVER(PARTITION BY label ORDER BY ts) - 1) / 2 + 1
        AS grpnum
        FROM C2
        WHERE cnt = 0
        )
        SELECT MIN(id) as id, label, camera, MAX(top_score) as top_score, MIN(ts) AS start_time, max(ts) AS end_time
        FROM C3
        GROUP BY label, grpnum
        ORDER BY start_time;""",
        camera_name,
        camera_name,
    )

    event: Event
    for event in events:
        date = datetime.fromtimestamp(event.start_time)
        key = date.strftime("%Y-%m-%d")
        hour = date.strftime("%H")
        if key in dates and hour in dates[key]:
            dates[key][hour]["events"].append(
                model_to_dict(
                    event,
                    exclude=[
                        Event.false_positive,
                        Event.zones,
                        Event.thumbnail,
                        Event.has_clip,
                        Event.has_snapshot,
                    ],
                )
            )

    return jsonify(
        [
            {
                "date": date,
                "events": sum([len(value["events"]) for value in hours.values()]),
                "recordings": [
                    {"hour": hour, "delay": value["delay"], "events": value["events"]}
                    for hour, value in hours.items()
                ],
            }
            for date, hours in dates.items()
        ]
    )


@bp.route("/<camera>/start/<int:start_ts>/end/<int:end_ts>/clip.mp4")
@bp.route("/<camera>/start/<float:start_ts>/end/<float:end_ts>/clip.mp4")
def recording_clip(camera, start_ts, end_ts):
    download = request.args.get("download", type=bool)

    recordings = (
        Recordings.select()
        .where(
            (Recordings.start_time.between(start_ts, end_ts))
            | (Recordings.end_time.between(start_ts, end_ts))
            | ((start_ts > Recordings.start_time) & (end_ts < Recordings.end_time))
        )
        .where(Recordings.camera == camera)
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

    file_name = f"clip_{camera}_{start_ts}-{end_ts}.mp4"
    path = f"/tmp/cache/{file_name}"

    ffmpeg_cmd = [
        "ffmpeg",
        "-y",
        "-protocol_whitelist",
        "pipe,file",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        "-",
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
        return f"Could not create clip from recordings for {camera}.", 500

    response = make_response()
    response.headers["Content-Description"] = "File Transfer"
    response.headers["Cache-Control"] = "no-cache"
    response.headers["Content-Type"] = "video/mp4"
    if download:
        response.headers["Content-Disposition"] = "attachment; filename=%s" % file_name
    response.headers["Content-Length"] = os.path.getsize(path)
    response.headers[
        "X-Accel-Redirect"
    ] = f"/cache/{file_name}"  # nginx: http://wiki.nginx.org/NginxXSendfile

    return response


@bp.route("/vod/<camera>/start/<int:start_ts>/end/<int:end_ts>")
@bp.route("/vod/<camera>/start/<float:start_ts>/end/<float:end_ts>")
def vod_ts(camera, start_ts, end_ts):
    recordings = (
        Recordings.select()
        .where(
            Recordings.start_time.between(start_ts, end_ts)
            | Recordings.end_time.between(start_ts, end_ts)
            | ((start_ts > Recordings.start_time) & (end_ts < Recordings.end_time))
        )
        .where(Recordings.camera == camera)
        .order_by(Recordings.start_time.asc())
    )

    clips = []
    durations = []

    recording: Recordings
    for recording in recordings:
        clip = {"type": "source", "path": recording.path}
        duration = int(recording.duration * 1000)
        # Determine if offset is needed for first clip
        if recording.start_time < start_ts:
            offset = int((start_ts - recording.start_time) * 1000)
            clip["clipFrom"] = offset
            duration -= offset
        # Determine if we need to end the last clip early
        if recording.end_time > end_ts:
            duration -= int((recording.end_time - end_ts) * 1000)

        if duration > 0:
            clips.append(clip)
            durations.append(duration)
        else:
            logger.warning(f"Recording clip is missing or empty: {recording.path}")

    if not clips:
        logger.error("No recordings found for the requested time range")
        return "No recordings found.", 404

    hour_ago = datetime.now() - timedelta(hours=1)
    return jsonify(
        {
            "cache": hour_ago.timestamp() > start_ts,
            "discontinuity": False,
            "durations": durations,
            "sequences": [{"clips": clips}],
        }
    )


@bp.route("/vod/<year_month>/<day>/<hour>/<camera>")
def vod_hour(year_month, day, hour, camera):
    start_date = datetime.strptime(f"{year_month}-{day} {hour}", "%Y-%m-%d %H")
    end_date = start_date + timedelta(hours=1) - timedelta(milliseconds=1)
    start_ts = start_date.timestamp()
    end_ts = end_date.timestamp()

    return vod_ts(camera, start_ts, end_ts)


@bp.route("/vod/event/<id>")
def vod_event(id):
    try:
        event: Event = Event.get(Event.id == id)
    except DoesNotExist:
        logger.error(f"Event not found: {id}")
        return "Event not found.", 404

    if not event.has_clip:
        logger.error(f"Event does not have recordings: {id}")
        return "Recordings not available", 404

    clip_path = os.path.join(CLIPS_DIR, f"{event.camera}-{id}.mp4")

    if not os.path.isfile(clip_path):
        end_ts = (
            datetime.now().timestamp() if event.end_time is None else event.end_time
        )
        return vod_ts(event.camera, event.start_time, end_ts)

    duration = int((event.end_time - event.start_time) * 1000)
    return jsonify(
        {
            "cache": True,
            "discontinuity": False,
            "durations": [duration],
            "sequences": [{"clips": [{"type": "source", "path": clip_path}]}],
        }
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
