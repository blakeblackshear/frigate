import base64
from datetime import datetime, timedelta
import copy
import glob
import logging
import json
import os
import subprocess as sp
import time
from functools import reduce
from pathlib import Path
from urllib.parse import unquote

import cv2

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

from peewee import SqliteDatabase, operator, fn, DoesNotExist
from playhouse.shortcuts import model_to_dict

from frigate.const import CLIPS_DIR, RECORD_DIR
from frigate.models import Event, Recordings
from frigate.object_processing import TrackedObject
from frigate.stats import stats_snapshot
from frigate.util import clean_camera_user_pass, ffprobe_stream, vainfo_hwaccel
from frigate.storage import StorageMaintainer
from frigate.version import VERSION

logger = logging.getLogger(__name__)

bp = Blueprint("frigate", __name__)


def create_app(
    frigate_config,
    database: SqliteDatabase,
    stats_tracking,
    detected_frames_processor,
    storage_maintainer: StorageMaintainer,
    plus_api,
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
    app.storage_maintainer = storage_maintainer
    app.plus_api = plus_api
    app.camera_error_image = None

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


@bp.route("/events/<id>/retain", methods=("POST",))
def set_retain(id):
    try:
        event = Event.get(Event.id == id)
    except DoesNotExist:
        return make_response(
            jsonify({"success": False, "message": "Event " + id + " not found"}), 404
        )

    event.retain_indefinitely = True
    event.save()

    return make_response(
        jsonify({"success": True, "message": "Event " + id + " retained"}), 200
    )


@bp.route("/events/<id>/plus", methods=("POST",))
def send_to_plus(id):
    if not current_app.plus_api.is_active():
        message = "PLUS_API_KEY environment variable is not set"
        logger.error(message)
        return make_response(
            jsonify(
                {
                    "success": False,
                    "message": message,
                }
            ),
            400,
        )

    try:
        event = Event.get(Event.id == id)
    except DoesNotExist:
        message = f"Event {id} not found"
        logger.error(message)
        return make_response(jsonify({"success": False, "message": message}), 404)

    if event.plus_id:
        message = "Already submitted to plus"
        logger.error(message)
        return make_response(jsonify({"success": False, "message": message}), 400)

    # load clean.png
    try:
        filename = f"{event.camera}-{event.id}-clean.png"
        image = cv2.imread(os.path.join(CLIPS_DIR, filename))
    except Exception:
        logger.error(f"Unable to load clean png for event: {event.id}")
        return make_response(
            jsonify(
                {"success": False, "message": "Unable to load clean png for event"}
            ),
            400,
        )

    try:
        plus_id = current_app.plus_api.upload_image(image, event.camera)
    except Exception as ex:
        logger.exception(ex)
        return make_response(
            jsonify({"success": False, "message": str(ex)}),
            400,
        )

    # store image id in the database
    event.plus_id = plus_id
    event.save()

    return make_response(jsonify({"success": True, "plus_id": plus_id}), 200)


@bp.route("/events/<id>/retain", methods=("DELETE",))
def delete_retain(id):
    try:
        event = Event.get(Event.id == id)
    except DoesNotExist:
        return make_response(
            jsonify({"success": False, "message": "Event " + id + " not found"}), 404
        )

    event.retain_indefinitely = False
    event.save()

    return make_response(
        jsonify({"success": True, "message": "Event " + id + " un-retained"}), 200
    )


@bp.route("/events/<id>/sub_label", methods=("POST",))
def set_sub_label(id):
    try:
        event: Event = Event.get(Event.id == id)
    except DoesNotExist:
        return make_response(
            jsonify({"success": False, "message": "Event " + id + " not found"}), 404
        )

    if request.json:
        new_sub_label = request.json.get("subLabel")
    else:
        new_sub_label = None

    if new_sub_label and len(new_sub_label) > 20:
        return make_response(
            jsonify(
                {
                    "success": False,
                    "message": new_sub_label
                    + " exceeds the 20 character limit for sub_label",
                }
            ),
            400,
        )

    if not event.end_time:
        tracked_obj: TrackedObject = (
            current_app.detected_frames_processor.camera_states[
                event.camera
            ].tracked_objects.get(event.id)
        )

        if tracked_obj:
            tracked_obj.obj_data["sub_label"] = new_sub_label

    event.sub_label = new_sub_label
    event.save()
    return make_response(
        jsonify(
            {
                "success": True,
                "message": "Event " + id + " sub label set to " + new_sub_label,
            }
        ),
        200,
    )


@bp.route("/sub_labels")
def get_sub_labels():
    try:
        events = Event.select(Event.sub_label).distinct()
    except Exception as e:
        return jsonify(
            {"success": False, "message": f"Failed to get sub_labels: {e}"}, "404"
        )

    sub_labels = [e.sub_label for e in events]

    if None in sub_labels:
        sub_labels.remove(None)

    return jsonify(sub_labels)


@bp.route("/events/<id>", methods=("DELETE",))
def delete_event(id):
    try:
        event = Event.get(Event.id == id)
    except DoesNotExist:
        return make_response(
            jsonify({"success": False, "message": "Event " + id + " not found"}), 404
        )

    media_name = f"{event.camera}-{event.id}"
    if event.has_snapshot:
        media = Path(f"{os.path.join(CLIPS_DIR, media_name)}.jpg")
        media.unlink(missing_ok=True)
        media = Path(f"{os.path.join(CLIPS_DIR, media_name)}-clean.png")
        media.unlink(missing_ok=True)
    if event.has_clip:
        media = Path(f"{os.path.join(CLIPS_DIR, media_name)}.mp4")
        media.unlink(missing_ok=True)

    event.delete_instance()
    return make_response(
        jsonify({"success": True, "message": "Event " + id + " deleted"}), 200
    )


@bp.route("/events/<id>/thumbnail.jpg")
def event_thumbnail(id, max_cache_age=2592000):
    format = request.args.get("format", "ios")
    thumbnail_bytes = None
    event_complete = False
    try:
        event = Event.get(Event.id == id)
        if not event.end_time is None:
            event_complete = True
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
    if event_complete:
        response.headers["Cache-Control"] = f"private, max-age={max_cache_age}"
    else:
        response.headers["Cache-Control"] = "no-store"
    return response


@bp.route("/<camera_name>/<label>/best.jpg")
@bp.route("/<camera_name>/<label>/thumbnail.jpg")
def label_thumbnail(camera_name, label):
    label = unquote(label)
    if label == "any":
        event_query = (
            Event.select()
            .where(Event.camera == camera_name)
            .order_by(Event.start_time.desc())
        )
    else:
        event_query = (
            Event.select()
            .where(Event.camera == camera_name)
            .where(Event.label == label)
            .order_by(Event.start_time.desc())
        )

    try:
        event = event_query.get()

        return event_thumbnail(event.id, 60)
    except DoesNotExist:
        frame = np.zeros((175, 175, 3), np.uint8)
        ret, jpg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])

        response = make_response(jpg.tobytes())
        response.headers["Content-Type"] = "image/jpeg"
        response.headers["Cache-Control"] = "no-store"
        return response


@bp.route("/events/<id>/snapshot.jpg")
def event_snapshot(id):
    download = request.args.get("download", type=bool)
    event_complete = False
    jpg_bytes = None
    try:
        event = Event.get(Event.id == id, Event.end_time != None)
        event_complete = True
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
    if event_complete:
        response.headers["Cache-Control"] = "private, max-age=31536000"
    else:
        response.headers["Cache-Control"] = "no-store"
    if download:
        response.headers[
            "Content-Disposition"
        ] = f"attachment; filename=snapshot-{id}.jpg"
    return response


@bp.route("/<camera_name>/<label>/snapshot.jpg")
def label_snapshot(camera_name, label):
    label = unquote(label)
    if label == "any":
        event_query = (
            Event.select()
            .where(Event.camera == camera_name)
            .where(Event.has_snapshot == True)
            .order_by(Event.start_time.desc())
        )
    else:
        event_query = (
            Event.select()
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
    response.headers[
        "X-Accel-Redirect"
    ] = f"/clips/{file_name}"  # nginx: http://wiki.nginx.org/NginxXSendfile

    return response


@bp.route("/events")
def events():
    limit = request.args.get("limit", 100)
    camera = request.args.get("camera", "all")
    label = unquote(request.args.get("label", "all"))
    sub_label = request.args.get("sub_label", "all")
    zone = request.args.get("zone", "all")
    after = request.args.get("after", type=float)
    before = request.args.get("before", type=float)
    has_clip = request.args.get("has_clip", type=int)
    has_snapshot = request.args.get("has_snapshot", type=int)
    include_thumbnails = request.args.get("include_thumbnails", default=1, type=int)

    clauses = []
    excluded_fields = []

    selected_columns = [
        Event.id,
        Event.camera,
        Event.label,
        Event.zones,
        Event.start_time,
        Event.end_time,
        Event.has_clip,
        Event.has_snapshot,
        Event.plus_id,
        Event.retain_indefinitely,
        Event.sub_label,
        Event.top_score,
    ]

    if camera != "all":
        clauses.append((Event.camera == camera))

    if label != "all":
        clauses.append((Event.label == label))

    if sub_label != "all":
        clauses.append((Event.sub_label == sub_label))

    if zone != "all":
        clauses.append((Event.zones.cast("text") % f'*"{zone}"*'))

    if after:
        clauses.append((Event.start_time > after))

    if before:
        clauses.append((Event.start_time < before))

    if not has_clip is None:
        clauses.append((Event.has_clip == has_clip))

    if not has_snapshot is None:
        clauses.append((Event.has_snapshot == has_snapshot))

    if not include_thumbnails:
        excluded_fields.append(Event.thumbnail)
    else:
        selected_columns.append(Event.thumbnail)

    if len(clauses) == 0:
        clauses.append((True))

    events = (
        Event.select(*selected_columns)
        .where(reduce(operator.and_, clauses))
        .order_by(Event.start_time.desc())
        .limit(limit)
    )

    return jsonify([model_to_dict(e, exclude=excluded_fields) for e in events])


@bp.route("/config")
def config():
    config = current_app.frigate_config.dict()

    for camera_name, camera in current_app.frigate_config.cameras.items():
        camera_dict = config["cameras"][camera_name]

        # clean paths
        for input in camera_dict.get("ffmpeg", {}).get("inputs", []):
            input["path"] = clean_camera_user_pass(input["path"])

        # add clean ffmpeg_cmds
        camera_dict["ffmpeg_cmds"] = copy.deepcopy(camera.ffmpeg_cmds)
        for cmd in camera_dict["ffmpeg_cmds"]:
            cmd["cmd"] = clean_camera_user_pass(" ".join(cmd["cmd"]))

    config["plus"] = {"enabled": current_app.plus_api.is_active()}

    return jsonify(config)


@bp.route("/config/raw")
def config_raw():
    config_file = os.environ.get("CONFIG_FILE", "/config/config.yml")

    # Check if we can use .yaml instead of .yml
    config_file_yaml = config_file.replace(".yml", ".yaml")

    if os.path.isfile(config_file_yaml):
        config_file = config_file_yaml

    if not os.path.isfile(config_file):
        return "Could not find file", 410

    with open(config_file) as f:
        raw_config = f.read()
        f.close()
        return raw_config, 200


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
    stats = stats_snapshot(current_app.frigate_config, current_app.stats_tracking)
    return jsonify(stats)


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

        if frame is None or datetime.now().timestamp() > (
            current_app.detected_frames_processor.get_current_frame_time(camera_name)
            + 10
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

        frame = cv2.resize(frame, dsize=(width, height), interpolation=cv2.INTER_AREA)

        ret, jpg = cv2.imencode(
            ".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), resize_quality]
        )
        response = make_response(jpg.tobytes())
        response.headers["Content-Type"] = "image/jpeg"
        response.headers["Cache-Control"] = "no-store"
        return response
    else:
        return "Camera named {} not found".format(camera_name), 404


@bp.route("/recordings/storage", methods=["GET"])
def get_recordings_storage_usage():
    recording_stats = stats_snapshot(
        current_app.frigate_config, current_app.stats_tracking
    )["service"]["storage"][RECORD_DIR]
    total_mb = recording_stats["total"]

    camera_usages: dict[
        str, dict
    ] = current_app.storage_maintainer.calculate_camera_usages()

    for camera_name in camera_usages.keys():
        if camera_usages.get(camera_name, {}).get("usage"):
            camera_usages[camera_name]["usage_percent"] = (
                camera_usages.get(camera_name, {}).get("usage", 0) / total_mb
            ) * 100

    return jsonify(camera_usages)


# return hourly summary for recordings of camera
@bp.route("/<camera_name>/recordings/summary")
def recordings_summary(camera_name):
    recording_groups = (
        Recordings.select(
            fn.strftime(
                "%Y-%m-%d %H",
                fn.datetime(Recordings.start_time, "unixepoch", "localtime"),
            ).alias("hour"),
            fn.SUM(Recordings.duration).alias("duration"),
            fn.SUM(Recordings.motion).alias("motion"),
            fn.SUM(Recordings.objects).alias("objects"),
        )
        .where(Recordings.camera == camera_name)
        .group_by(
            fn.strftime(
                "%Y-%m-%d %H",
                fn.datetime(Recordings.start_time, "unixepoch", "localtime"),
            )
        )
        .order_by(
            fn.strftime(
                "%Y-%m-%d H",
                fn.datetime(Recordings.start_time, "unixepoch", "localtime"),
            ).desc()
        )
    )

    event_groups = (
        Event.select(
            fn.strftime(
                "%Y-%m-%d %H", fn.datetime(Event.start_time, "unixepoch", "localtime")
            ).alias("hour"),
            fn.COUNT(Event.id).alias("count"),
        )
        .where(Event.camera == camera_name, Event.has_clip)
        .group_by(
            fn.strftime(
                "%Y-%m-%d %H", fn.datetime(Event.start_time, "unixepoch", "localtime")
            ),
        )
        .objects()
    )

    event_map = {g.hour: g.count for g in event_groups}

    days = {}

    for recording_group in recording_groups.objects():
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
@bp.route("/<camera_name>/recordings")
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
        )
        .where(
            Recordings.camera == camera_name,
            Recordings.end_time >= after,
            Recordings.start_time <= before,
        )
        .order_by(Recordings.start_time)
    )

    return jsonify([e for e in recordings.dicts()])


@bp.route("/<camera_name>/start/<int:start_ts>/end/<int:end_ts>/clip.mp4")
@bp.route("/<camera_name>/start/<float:start_ts>/end/<float:end_ts>/clip.mp4")
def recording_clip(camera_name, start_ts, end_ts):
    download = request.args.get("download", type=bool)

    recordings = (
        Recordings.select()
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

    file_name = f"clip_{camera_name}_{start_ts}-{end_ts}.mp4"
    path = f"/tmp/cache/{file_name}"

    if not os.path.exists(path):
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
            return f"Could not create clip from recordings for {camera_name}.", 500
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
    response.headers[
        "X-Accel-Redirect"
    ] = f"/cache/{file_name}"  # nginx: http://wiki.nginx.org/NginxXSendfile

    return response


@bp.route("/vod/<camera_name>/start/<int:start_ts>/end/<int:end_ts>")
@bp.route("/vod/<camera_name>/start/<float:start_ts>/end/<float:end_ts>")
def vod_ts(camera_name, start_ts, end_ts):
    recordings = (
        Recordings.select()
        .where(
            Recordings.start_time.between(start_ts, end_ts)
            | Recordings.end_time.between(start_ts, end_ts)
            | ((start_ts > Recordings.start_time) & (end_ts < Recordings.end_time))
        )
        .where(Recordings.camera == camera_name)
        .order_by(Recordings.start_time.asc())
    )

    clips = []
    durations = []

    recording: Recordings
    for recording in recordings:
        clip = {"type": "source", "path": recording.path}
        duration = int(recording.duration * 1000)

        # Determine if we need to end the last clip early
        if recording.end_time > end_ts:
            duration -= int((recording.end_time - end_ts) * 1000)

        if duration > 0:
            clip["keyFrameDurations"] = [duration]
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


@bp.route("/vod/<year_month>/<day>/<hour>/<camera_name>")
def vod_hour(year_month, day, hour, camera_name):
    start_date = datetime.strptime(f"{year_month}-{day} {hour}", "%Y-%m-%d %H")
    end_date = start_date + timedelta(hours=1) - timedelta(milliseconds=1)
    start_ts = start_date.timestamp()
    end_ts = end_date.timestamp()

    return vod_ts(camera_name, start_ts, end_ts)


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
        vod_response = vod_ts(event.camera, event.start_time, end_ts)
        # If the recordings are not found, set has_clip to false
        if (
            type(vod_response) == tuple
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


@bp.route("/ffprobe", methods=["GET"])
def ffprobe():
    path_param = request.args.get("paths", "")

    if not path_param:
        return jsonify(
            {"success": False, "message": f"Path needs to be provided."}, "404"
        )

    if "," in clean_camera_user_pass(path_param):
        paths = path_param.split(",")
    else:
        paths = [path_param]

    # user has multiple streams
    output = []

    for path in paths:
        ffprobe = ffprobe_stream(path)
        output.append(
            {
                "return_code": ffprobe.returncode,
                "stderr": json.loads(ffprobe.stderr.decode("unicode_escape").strip())
                if ffprobe.stderr.decode()
                else {},
                "stdout": json.loads(ffprobe.stdout.decode("unicode_escape").strip())
                if ffprobe.stdout.decode()
                else {},
            }
        )

    return jsonify(output)


@bp.route("/vainfo", methods=["GET"])
def vainfo():
    vainfo = vainfo_hwaccel()
    return jsonify(
        {
            "return_code": vainfo.returncode,
            "stderr": vainfo.stderr.decode("unicode_escape").strip()
            if vainfo.stderr.decode()
            else "",
            "stdout": vainfo.stdout.decode("unicode_escape").strip()
            if vainfo.stdout.decode()
            else "",
        }
    )
