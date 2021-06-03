import base64
from collections import OrderedDict
from datetime import datetime, timedelta
import json
import glob
import logging
import os
import re
import time
from functools import reduce
from pathlib import Path

import cv2
import gevent
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
from flask_sockets import Sockets
from peewee import SqliteDatabase, operator, fn, DoesNotExist, Value
from playhouse.shortcuts import model_to_dict

from frigate.const import CLIPS_DIR, RECORD_DIR
from frigate.models import Event
from frigate.stats import stats_snapshot
from frigate.util import calculate_region
from frigate.version import VERSION

logger = logging.getLogger(__name__)

bp = Blueprint("frigate", __name__)
ws = Blueprint("ws", __name__)


class MqttBackend:
    """Interface for registering and updating WebSocket clients."""

    def __init__(self, mqtt_client, topic_prefix):
        self.clients = list()
        self.mqtt_client = mqtt_client
        self.topic_prefix = topic_prefix

    def register(self, client):
        """Register a WebSocket connection for Mqtt updates."""
        self.clients.append(client)

    def publish(self, message):
        try:
            json_message = json.loads(message)
            json_message = {
                "topic": f"{self.topic_prefix}/{json_message['topic']}",
                "payload": json_message["payload"],
                "retain": json_message.get("retain", False),
            }
        except:
            logger.warning("Unable to parse websocket message as valid json.")
            return

        logger.debug(
            f"Publishing mqtt message from websockets at {json_message['topic']}."
        )
        self.mqtt_client.publish(
            json_message["topic"],
            json_message["payload"],
            retain=json_message["retain"],
        )

    def run(self):
        def send(client, userdata, message):
            """Sends mqtt messages to clients."""
            try:
                logger.debug(f"Received mqtt message on {message.topic}.")
                ws_message = json.dumps(
                    {
                        "topic": message.topic.replace(f"{self.topic_prefix}/", ""),
                        "payload": message.payload.decode(),
                    }
                )
            except:
                # if the payload can't be decoded don't relay to clients
                logger.debug(
                    f"MQTT payload for {message.topic} wasn't text. Skipping..."
                )
                return

            for client in self.clients:
                try:
                    client.send(ws_message)
                except:
                    logger.debug(
                        "Removing websocket client due to a closed connection."
                    )
                    self.clients.remove(client)

        self.mqtt_client.message_callback_add(f"{self.topic_prefix}/#", send)

    def start(self):
        """Maintains mqtt subscription in the background."""
        gevent.spawn(self.run)


def create_app(
    frigate_config,
    database: SqliteDatabase,
    stats_tracking,
    detected_frames_processor,
    mqtt_client,
):
    app = Flask(__name__)
    sockets = Sockets(app)

    @app.before_request
    def _db_connect():
        database.connect()

    @app.teardown_request
    def _db_close(exc):
        if not database.is_closed():
            database.close()

    app.frigate_config = frigate_config
    app.stats_tracking = stats_tracking
    app.detected_frames_processor = detected_frames_processor

    app.register_blueprint(bp)
    sockets.register_blueprint(ws)

    app.mqtt_backend = MqttBackend(mqtt_client, frigate_config.mqtt.topic_prefix)
    app.mqtt_backend.start()

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
        clauses.append((1 == 1))

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
    response.headers["Content-Type"] = "image/jpg"
    return response


@bp.route("/events/<id>/snapshot.jpg")
def event_snapshot(id):
    jpg_bytes = None
    try:
        event = Event.get(Event.id == id)
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
                        )
        except:
            return "Event not found", 404
    except:
        return "Event not found", 404

    response = make_response(jpg_bytes)
    response.headers["Content-Type"] = "image/jpg"
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
        clauses.append((1 == 1))

    events = (
        Event.select()
        .where(reduce(operator.and_, clauses))
        .order_by(Event.start_time.desc())
        .limit(limit)
    )

    return jsonify([model_to_dict(e, exclude=excluded_fields) for e in events])


@bp.route("/config")
def config():
    return jsonify(current_app.frigate_config.to_dict())


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
            box = best_object.get("box", (0, 0, 300, 300))
            region = calculate_region(
                best_frame.shape, box[0], box[1], box[2], box[3], 1.1
            )
            best_frame = best_frame[region[1] : region[3], region[0] : region[2]]

        height = int(request.args.get("h", str(best_frame.shape[0])))
        width = int(height * best_frame.shape[1] / best_frame.shape[0])

        best_frame = cv2.resize(
            best_frame, dsize=(width, height), interpolation=cv2.INTER_AREA
        )
        ret, jpg = cv2.imencode(".jpg", best_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
        response = make_response(jpg.tobytes())
        response.headers["Content-Type"] = "image/jpg"
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
    if camera_name in current_app.frigate_config.cameras:
        # max out at specified FPS
        frame = current_app.detected_frames_processor.get_current_frame(
            camera_name, draw_options
        )
        if frame is None:
            frame = np.zeros((720, 1280, 3), np.uint8)

        height = int(request.args.get("h", str(frame.shape[0])))
        width = int(height * frame.shape[1] / frame.shape[0])

        frame = cv2.resize(frame, dsize=(width, height), interpolation=cv2.INTER_AREA)

        ret, jpg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
        response = make_response(jpg.tobytes())
        response.headers["Content-Type"] = "image/jpg"
        return response
    else:
        return "Camera named {} not found".format(camera_name), 404


@bp.route("/<camera_name>/recordings")
def recordings(camera_name):
    files = glob.glob(f"{RECORD_DIR}/*/*/*/{camera_name}")

    if len(files) == 0:
        return "No recordings found.", 404

    files.sort()

    dates = OrderedDict()
    for path in files:
        first = glob.glob(f"{path}/00.*.mp4")
        delay = 0
        if len(first) > 0:
            delay = int(first[0].strip(path).split(".")[1])
        search = re.search(r".+/(\d{4}[-]\d{2})/(\d{2})/(\d{2}).+", path)
        if not search:
            continue
        date = f"{search.group(1)}-{search.group(2)}"
        if date not in dates:
            dates[date] = OrderedDict()
        dates[date][search.group(3)] = {"delay": delay, "events": []}

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

    e: Event
    for e in events:
        date = datetime.fromtimestamp(e.start_time)
        key = date.strftime("%Y-%m-%d")
        hour = date.strftime("%H")
        if key in dates and hour in dates[key]:
            dates[key][hour]["events"].append(
                model_to_dict(
                    e,
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


@bp.route("/vod/<path:path>")
def vod(path):
    if not os.path.isdir(f"{RECORD_DIR}/{path}"):
        return "Recordings not found.", 404

    files = glob.glob(f"{RECORD_DIR}/{path}/*.mp4")
    files.sort()

    clips = []
    durations = []
    for filename in files:
        clips.append({"type": "source", "path": filename})
        video = cv2.VideoCapture(filename)
        duration = int(
            video.get(cv2.CAP_PROP_FRAME_COUNT) / video.get(cv2.CAP_PROP_FPS) * 1000
        )
        durations.append(duration)

    # Should we cache?
    parts = path.split("/", 4)
    date = datetime.strptime(f"{parts[0]}-{parts[1]} {parts[2]}", "%Y-%m-%d %H")

    return jsonify(
        {
            "cache": datetime.now() - timedelta(hours=2) > date,
            "discontinuity": False,
            "durations": durations,
            "sequences": [{"clips": clips}],
        }
    )


def imagestream(detected_frames_processor, camera_name, fps, height, draw_options):
    while True:
        # max out at specified FPS
        gevent.sleep(1 / fps)
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


@ws.route("/ws")
def echo_socket(socket):
    current_app.mqtt_backend.register(socket)

    while not socket.closed:
        # Sleep to prevent *constant* context-switches.
        gevent.sleep(0.1)

        message = socket.receive()
        if message:
            current_app.mqtt_backend.publish(message)
