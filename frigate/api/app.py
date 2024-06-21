"""Main api runner."""

import copy
import json
import logging
import os
import traceback
from datetime import datetime, timedelta
from functools import reduce

import requests
from flask import Blueprint, Flask, current_app, jsonify, make_response, request
from markupsafe import escape
from peewee import operator
from playhouse.sqliteq import SqliteQueueDatabase
from werkzeug.middleware.proxy_fix import ProxyFix

from frigate.api.auth import AuthBp, get_jwt_secret, limiter
from frigate.api.event import EventBp
from frigate.api.export import ExportBp
from frigate.api.media import MediaBp
from frigate.api.preview import PreviewBp
from frigate.api.review import ReviewBp
from frigate.config import FrigateConfig
from frigate.const import CONFIG_DIR
from frigate.events.external import ExternalEventProcessor
from frigate.models import Event, Timeline
from frigate.plus import PlusApi
from frigate.ptz.onvif import OnvifController
from frigate.stats.emitter import StatsEmitter
from frigate.storage import StorageMaintainer
from frigate.util.builtin import (
    clean_camera_user_pass,
    get_tz_modifiers,
    update_yaml_from_url,
)
from frigate.util.services import ffprobe_stream, restart_frigate, vainfo_hwaccel
from frigate.version import VERSION

logger = logging.getLogger(__name__)


bp = Blueprint("frigate", __name__)
bp.register_blueprint(EventBp)
bp.register_blueprint(ExportBp)
bp.register_blueprint(MediaBp)
bp.register_blueprint(PreviewBp)
bp.register_blueprint(ReviewBp)
bp.register_blueprint(AuthBp)


def create_app(
    frigate_config,
    database: SqliteQueueDatabase,
    detected_frames_processor,
    storage_maintainer: StorageMaintainer,
    onvif: OnvifController,
    external_processor: ExternalEventProcessor,
    plus_api: PlusApi,
    stats_emitter: StatsEmitter,
):
    app = Flask(__name__)

    @app.before_request
    def check_csrf():
        if request.method in ["GET", "HEAD", "OPTIONS", "TRACE"]:
            pass
        if "origin" in request.headers and "x-csrf-token" not in request.headers:
            return jsonify({"success": False, "message": "Missing CSRF header"}), 401

    @app.before_request
    def _db_connect():
        if database.is_closed():
            database.connect()

    @app.teardown_request
    def _db_close(exc):
        if not database.is_closed():
            database.close()

    app.frigate_config = frigate_config
    app.detected_frames_processor = detected_frames_processor
    app.storage_maintainer = storage_maintainer
    app.onvif = onvif
    app.external_processor = external_processor
    app.plus_api = plus_api
    app.camera_error_image = None
    app.stats_emitter = stats_emitter
    app.jwt_token = get_jwt_secret() if frigate_config.auth.enabled else None
    # update the request_address with the x-forwarded-for header from nginx
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)
    # initialize the rate limiter for the login endpoint
    limiter.init_app(app)
    if frigate_config.auth.failed_login_rate_limit is None:
        limiter.enabled = False

    app.register_blueprint(bp)

    return app


@bp.route("/")
def is_healthy():
    return "Frigate is running. Alive and healthy!"


@bp.route("/config/schema.json")
def config_schema():
    return current_app.response_class(
        current_app.frigate_config.schema_json(), mimetype="application/json"
    )


@bp.route("/go2rtc/streams")
def go2rtc_streams():
    r = requests.get("http://127.0.0.1:1984/api/streams")
    if not r.ok:
        logger.error("Failed to fetch streams from go2rtc")
        return make_response(
            jsonify({"success": False, "message": "Error fetching stream data"}),
            500,
        )
    stream_data = r.json()
    for data in stream_data.values():
        for producer in data.get("producers", []):
            producer["url"] = clean_camera_user_pass(producer.get("url", ""))
    return jsonify(stream_data)


@bp.route("/go2rtc/streams/<camera_name>")
def go2rtc_camera_stream(camera_name: str):
    r = requests.get(
        f"http://127.0.0.1:1984/api/streams?src={camera_name}&video=all&audio=all&microphone"
    )
    if not r.ok:
        logger.error("Failed to fetch streams from go2rtc")
        return make_response(
            jsonify({"success": False, "message": "Error fetching stream data"}),
            500,
        )
    stream_data = r.json()
    for producer in stream_data.get("producers", []):
        producer["url"] = clean_camera_user_pass(producer.get("url", ""))
    return jsonify(stream_data)


@bp.route("/version")
def version():
    return VERSION


@bp.route("/stats")
def stats():
    return jsonify(current_app.stats_emitter.get_latest_stats())


@bp.route("/stats/history")
def stats_history():
    keys = request.args.get("keys", default=None)

    if keys:
        keys = keys.split(",")

    return jsonify(current_app.stats_emitter.get_stats_history(keys))


@bp.route("/config")
def config():
    config_obj: FrigateConfig = current_app.frigate_config
    config: dict[str, dict[str, any]] = config_obj.model_dump(
        mode="json", warnings="none", exclude_none=True
    )

    # remove the mqtt password
    config["mqtt"].pop("password", None)

    # remove the proxy secret
    config["proxy"].pop("auth_secret", None)

    for camera_name, camera in current_app.frigate_config.cameras.items():
        camera_dict = config["cameras"][camera_name]

        # clean paths
        for input in camera_dict.get("ffmpeg", {}).get("inputs", []):
            input["path"] = clean_camera_user_pass(input["path"])

        # add clean ffmpeg_cmds
        camera_dict["ffmpeg_cmds"] = copy.deepcopy(camera.ffmpeg_cmds)
        for cmd in camera_dict["ffmpeg_cmds"]:
            cmd["cmd"] = clean_camera_user_pass(" ".join(cmd["cmd"]))

        # ensure that zones are relative
        for zone_name, zone in config_obj.cameras[camera_name].zones.items():
            camera_dict["zones"][zone_name]["color"] = zone.color

    config["plus"] = {"enabled": current_app.plus_api.is_active()}
    config["model"]["colormap"] = config_obj.model.colormap

    for detector_config in config["detectors"].values():
        detector_config["model"]["labelmap"] = (
            current_app.frigate_config.model.merged_labelmap
        )

    return jsonify(config)


@bp.route("/config/raw")
def config_raw():
    config_file = os.environ.get("CONFIG_FILE", "/config/config.yml")

    # Check if we can use .yaml instead of .yml
    config_file_yaml = config_file.replace(".yml", ".yaml")

    if os.path.isfile(config_file_yaml):
        config_file = config_file_yaml

    if not os.path.isfile(config_file):
        return make_response(
            jsonify({"success": False, "message": "Could not find file"}), 404
        )

    with open(config_file, "r") as f:
        raw_config = f.read()
        f.close()

        return raw_config, 200


@bp.route("/config/save", methods=["POST"])
def config_save():
    save_option = request.args.get("save_option")

    new_config = request.get_data().decode()

    if not new_config:
        return make_response(
            jsonify(
                {"success": False, "message": "Config with body param is required"}
            ),
            400,
        )

    # Validate the config schema
    try:
        FrigateConfig.parse_raw(new_config)
    except Exception:
        return make_response(
            jsonify(
                {
                    "success": False,
                    "message": f"\nConfig Error:\n\n{escape(str(traceback.format_exc()))}",
                }
            ),
            400,
        )

    # Save the config to file
    try:
        config_file = os.environ.get("CONFIG_FILE", "/config/config.yml")

        # Check if we can use .yaml instead of .yml
        config_file_yaml = config_file.replace(".yml", ".yaml")

        if os.path.isfile(config_file_yaml):
            config_file = config_file_yaml

        with open(config_file, "w") as f:
            f.write(new_config)
            f.close()
    except Exception:
        return make_response(
            jsonify(
                {
                    "success": False,
                    "message": "Could not write config file, be sure that Frigate has write permission on the config file.",
                }
            ),
            400,
        )

    if save_option == "restart":
        try:
            restart_frigate()
        except Exception as e:
            logging.error(f"Error restarting Frigate: {e}")
            return make_response(
                jsonify(
                    {
                        "success": True,
                        "message": "Config successfully saved, unable to restart Frigate",
                    }
                ),
                200,
            )

        return make_response(
            jsonify(
                {
                    "success": True,
                    "message": "Config successfully saved, restarting (this can take up to one minute)...",
                }
            ),
            200,
        )
    else:
        return make_response(
            jsonify({"success": True, "message": "Config successfully saved."}),
            200,
        )


@bp.route("/config/set", methods=["PUT"])
def config_set():
    config_file = os.environ.get("CONFIG_FILE", f"{CONFIG_DIR}/config.yml")

    # Check if we can use .yaml instead of .yml
    config_file_yaml = config_file.replace(".yml", ".yaml")

    if os.path.isfile(config_file_yaml):
        config_file = config_file_yaml

    with open(config_file, "r") as f:
        old_raw_config = f.read()
        f.close()

    try:
        update_yaml_from_url(config_file, request.url)
        with open(config_file, "r") as f:
            new_raw_config = f.read()
            f.close()
        # Validate the config schema
        try:
            config_obj = FrigateConfig.parse_raw(new_raw_config)
        except Exception:
            with open(config_file, "w") as f:
                f.write(old_raw_config)
                f.close()
            logger.error(f"\nConfig Error:\n\n{str(traceback.format_exc())}")
            return make_response(
                jsonify(
                    {
                        "success": False,
                        "message": "Error parsing config. Check logs for error message.",
                    }
                ),
                400,
            )
    except Exception as e:
        logging.error(f"Error updating config: {e}")
        return make_response(
            jsonify({"success": False, "message": "Error updating config"}),
            500,
        )

    json = request.get_json(silent=True) or {}

    if json.get("requires_restart", 1) == 0:
        current_app.frigate_config = FrigateConfig.runtime_config(
            config_obj, current_app.plus_api
        )

    return make_response(
        jsonify(
            {
                "success": True,
                "message": "Config successfully updated, restart to apply",
            }
        ),
        200,
    )


@bp.route("/ffprobe", methods=["GET"])
def ffprobe():
    path_param = request.args.get("paths", "")

    if not path_param:
        return make_response(
            jsonify({"success": False, "message": "Path needs to be provided."}), 404
        )

    if path_param.startswith("camera"):
        camera = path_param[7:]

        if camera not in current_app.frigate_config.cameras.keys():
            return make_response(
                jsonify(
                    {"success": False, "message": f"{camera} is not a valid camera."}
                ),
                404,
            )

        if not current_app.frigate_config.cameras[camera].enabled:
            return make_response(
                jsonify({"success": False, "message": f"{camera} is not enabled."}), 404
            )

        paths = map(
            lambda input: input.path,
            current_app.frigate_config.cameras[camera].ffmpeg.inputs,
        )
    elif "," in clean_camera_user_pass(path_param):
        paths = path_param.split(",")
    else:
        paths = [path_param]

    # user has multiple streams
    output = []

    for path in paths:
        ffprobe = ffprobe_stream(path.strip())
        output.append(
            {
                "return_code": ffprobe.returncode,
                "stderr": (
                    ffprobe.stderr.decode("unicode_escape").strip()
                    if ffprobe.returncode != 0
                    else ""
                ),
                "stdout": (
                    json.loads(ffprobe.stdout.decode("unicode_escape").strip())
                    if ffprobe.returncode == 0
                    else ""
                ),
            }
        )

    return jsonify(output)


@bp.route("/vainfo", methods=["GET"])
def vainfo():
    vainfo = vainfo_hwaccel()
    return jsonify(
        {
            "return_code": vainfo.returncode,
            "stderr": (
                vainfo.stderr.decode("unicode_escape").strip()
                if vainfo.returncode != 0
                else ""
            ),
            "stdout": (
                vainfo.stdout.decode("unicode_escape").strip()
                if vainfo.returncode == 0
                else ""
            ),
        }
    )


@bp.route("/logs/<service>", methods=["GET"])
def logs(service: str):
    log_locations = {
        "frigate": "/dev/shm/logs/frigate/current",
        "go2rtc": "/dev/shm/logs/go2rtc/current",
        "nginx": "/dev/shm/logs/nginx/current",
        "chroma": "/dev/shm/logs/chroma/current",
    }
    service_location = log_locations.get(service)

    if not service_location:
        return make_response(
            jsonify({"success": False, "message": "Not a valid service"}),
            404,
        )

    start = request.args.get("start", type=int, default=0)
    end = request.args.get("end", type=int)

    try:
        file = open(service_location, "r")
        contents = file.read()
        file.close()

        # use the start timestamp to group logs together``
        logLines = []
        keyLength = 0
        dateEnd = 0
        currentKey = ""
        currentLine = ""

        for rawLine in contents.splitlines():
            cleanLine = rawLine.strip()

            if len(cleanLine) < 10:
                continue

            # handle cases where S6 does not include date in log line
            if "  " not in cleanLine:
                cleanLine = f"{datetime.now()}  {cleanLine}"

            if dateEnd == 0:
                dateEnd = cleanLine.index("  ")
                keyLength = dateEnd - (6 if service_location == "frigate" else 0)

            newKey = cleanLine[0:keyLength]

            if newKey == currentKey:
                currentLine += f"\n{cleanLine[dateEnd:].strip()}"
                continue
            else:
                if len(currentLine) > 0:
                    logLines.append(currentLine)

                currentKey = newKey
                currentLine = cleanLine

        logLines.append(currentLine)

        return make_response(
            jsonify({"totalLines": len(logLines), "lines": logLines[start:end]}),
            200,
        )
    except FileNotFoundError as e:
        logger.error(e)
        return make_response(
            jsonify({"success": False, "message": "Could not find log file"}),
            500,
        )


@bp.route("/restart", methods=["POST"])
def restart():
    try:
        restart_frigate()
    except Exception as e:
        logging.error(f"Error restarting Frigate: {e}")
        return make_response(
            jsonify(
                {
                    "success": False,
                    "message": "Unable to restart Frigate.",
                }
            ),
            500,
        )

    return make_response(
        jsonify(
            {
                "success": True,
                "message": "Restarting (this can take up to one minute)...",
            }
        ),
        200,
    )


@bp.route("/labels")
def get_labels():
    camera = request.args.get("camera", type=str, default="")

    try:
        if camera:
            events = Event.select(Event.label).where(Event.camera == camera).distinct()
        else:
            events = Event.select(Event.label).distinct()
    except Exception as e:
        logger.error(e)
        return make_response(
            jsonify({"success": False, "message": "Failed to get labels"}), 404
        )

    labels = sorted([e.label for e in events])
    return jsonify(labels)


@bp.route("/sub_labels")
def get_sub_labels():
    split_joined = request.args.get("split_joined", type=int)

    try:
        events = Event.select(Event.sub_label).distinct()
    except Exception:
        return make_response(
            jsonify({"success": False, "message": "Failed to get sub_labels"}),
            404,
        )

    sub_labels = [e.sub_label for e in events]

    if None in sub_labels:
        sub_labels.remove(None)

    if split_joined:
        original_labels = sub_labels.copy()

        for label in original_labels:
            if "," in label:
                sub_labels.remove(label)
                parts = label.split(",")

                for part in parts:
                    if part.strip() not in sub_labels:
                        sub_labels.append(part.strip())

    sub_labels.sort()
    return jsonify(sub_labels)


@bp.route("/timeline")
def timeline():
    camera = request.args.get("camera", "all")
    source_id = request.args.get("source_id", type=str)
    limit = request.args.get("limit", 100)

    clauses = []

    selected_columns = [
        Timeline.timestamp,
        Timeline.camera,
        Timeline.source,
        Timeline.source_id,
        Timeline.class_type,
        Timeline.data,
    ]

    if camera != "all":
        clauses.append((Timeline.camera == camera))

    if source_id:
        clauses.append((Timeline.source_id == source_id))

    if len(clauses) == 0:
        clauses.append((True))

    timeline = (
        Timeline.select(*selected_columns)
        .where(reduce(operator.and_, clauses))
        .order_by(Timeline.timestamp.asc())
        .limit(limit)
        .dicts()
    )

    return jsonify([t for t in timeline])


@bp.route("/timeline/hourly")
def hourly_timeline():
    """Get hourly summary for timeline."""
    cameras = request.args.get("cameras", "all")
    labels = request.args.get("labels", "all")
    before = request.args.get("before", type=float)
    after = request.args.get("after", type=float)
    limit = request.args.get("limit", 200)
    tz_name = request.args.get("timezone", default="utc", type=str)

    _, minute_modifier, _ = get_tz_modifiers(tz_name)
    minute_offset = int(minute_modifier.split(" ")[0])

    clauses = []

    if cameras != "all":
        camera_list = cameras.split(",")
        clauses.append((Timeline.camera << camera_list))

    if labels != "all":
        label_list = labels.split(",")
        clauses.append((Timeline.data["label"] << label_list))

    if before:
        clauses.append((Timeline.timestamp < before))

    if after:
        clauses.append((Timeline.timestamp > after))

    if len(clauses) == 0:
        clauses.append((True))

    timeline = (
        Timeline.select(
            Timeline.camera,
            Timeline.timestamp,
            Timeline.data,
            Timeline.class_type,
            Timeline.source_id,
            Timeline.source,
        )
        .where(reduce(operator.and_, clauses))
        .order_by(Timeline.timestamp.desc())
        .limit(limit)
        .dicts()
        .iterator()
    )

    count = 0
    start = 0
    end = 0
    hours: dict[str, list[dict[str, any]]] = {}

    for t in timeline:
        if count == 0:
            start = t["timestamp"]
        else:
            end = t["timestamp"]

        count += 1

        hour = (
            datetime.fromtimestamp(t["timestamp"]).replace(
                minute=0, second=0, microsecond=0
            )
            + timedelta(
                minutes=minute_offset,
            )
        ).timestamp()
        if hour not in hours:
            hours[hour] = [t]
        else:
            hours[hour].insert(0, t)

    return jsonify(
        {
            "start": start,
            "end": end,
            "count": count,
            "hours": hours,
        }
    )
