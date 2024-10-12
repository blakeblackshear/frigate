"""Main api runner."""

import copy
import json
import logging
import os
import traceback
from datetime import datetime, timedelta
from functools import reduce
from typing import Any, Optional

import requests
from fastapi import APIRouter, Body, Path, Request, Response
from fastapi.encoders import jsonable_encoder
from fastapi.params import Depends
from fastapi.responses import JSONResponse, PlainTextResponse
from markupsafe import escape
from peewee import operator

from frigate.api.defs.app_body import AppConfigSetBody
from frigate.api.defs.app_query_parameters import AppTimelineHourlyQueryParameters
from frigate.api.defs.tags import Tags
from frigate.config import FrigateConfig
from frigate.const import CONFIG_DIR
from frigate.models import Event, Timeline
from frigate.util.builtin import (
    clean_camera_user_pass,
    get_tz_modifiers,
    update_yaml_from_url,
)
from frigate.util.services import (
    ffprobe_stream,
    get_nvidia_driver_info,
    restart_frigate,
    vainfo_hwaccel,
)
from frigate.version import VERSION

logger = logging.getLogger(__name__)


router = APIRouter(tags=[Tags.app])


@router.get("/", response_class=PlainTextResponse)
def is_healthy():
    return "Frigate is running. Alive and healthy!"


@router.get("/config/schema.json")
def config_schema(request: Request):
    return Response(
        content=request.app.frigate_config.schema_json(), media_type="application/json"
    )


@router.get("/go2rtc/streams")
def go2rtc_streams():
    r = requests.get("http://127.0.0.1:1984/api/streams")
    if not r.ok:
        logger.error("Failed to fetch streams from go2rtc")
        return JSONResponse(
            content=({"success": False, "message": "Error fetching stream data"}),
            status_code=500,
        )
    stream_data = r.json()
    for data in stream_data.values():
        for producer in data.get("producers", []):
            producer["url"] = clean_camera_user_pass(producer.get("url", ""))
    return JSONResponse(content=stream_data)


@router.get("/go2rtc/streams/{camera_name}")
def go2rtc_camera_stream(camera_name: str):
    r = requests.get(
        f"http://127.0.0.1:1984/api/streams?src={camera_name}&video=all&audio=all&microphone"
    )
    if not r.ok:
        logger.error("Failed to fetch streams from go2rtc")
        return JSONResponse(
            content=({"success": False, "message": "Error fetching stream data"}),
            status_code=500,
        )
    stream_data = r.json()
    for producer in stream_data.get("producers", []):
        producer["url"] = clean_camera_user_pass(producer.get("url", ""))
    return JSONResponse(content=stream_data)


@router.get("/version", response_class=PlainTextResponse)
def version():
    return VERSION


@router.get("/stats")
def stats(request: Request):
    return JSONResponse(content=request.app.stats_emitter.get_latest_stats())


@router.get("/stats/history")
def stats_history(request: Request, keys: str = None):
    if keys:
        keys = keys.split(",")

    return JSONResponse(content=request.app.stats_emitter.get_stats_history(keys))


@router.get("/config")
def config(request: Request):
    config_obj: FrigateConfig = request.app.frigate_config
    config: dict[str, dict[str, any]] = config_obj.model_dump(
        mode="json", warnings="none", exclude_none=True
    )

    # remove the mqtt password
    config["mqtt"].pop("password", None)

    # remove the proxy secret
    config["proxy"].pop("auth_secret", None)

    for camera_name, camera in request.app.frigate_config.cameras.items():
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

    config["plus"] = {"enabled": request.app.frigate_config.plus_api.is_active()}
    config["model"]["colormap"] = config_obj.model.colormap

    for detector_config in config["detectors"].values():
        detector_config["model"]["labelmap"] = (
            request.app.frigate_config.model.merged_labelmap
        )

    return JSONResponse(content=config)


@router.get("/config/raw")
def config_raw():
    config_file = os.environ.get("CONFIG_FILE", "/config/config.yml")

    # Check if we can use .yaml instead of .yml
    config_file_yaml = config_file.replace(".yml", ".yaml")

    if os.path.isfile(config_file_yaml):
        config_file = config_file_yaml

    if not os.path.isfile(config_file):
        return JSONResponse(
            content=({"success": False, "message": "Could not find file"}),
            status_code=404,
        )

    with open(config_file, "r") as f:
        raw_config = f.read()
        f.close()

        return JSONResponse(
            content=raw_config, media_type="text/plain", status_code=200
        )


@router.post("/config/save")
def config_save(save_option: str, body: Any = Body(media_type="text/plain")):
    new_config = body.decode()

    if not new_config:
        return JSONResponse(
            content=(
                {"success": False, "message": "Config with body param is required"}
            ),
            status_code=400,
        )

    # Validate the config schema
    try:
        FrigateConfig.parse_yaml(new_config)
    except Exception:
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": f"\nConfig Error:\n\n{escape(str(traceback.format_exc()))}",
                }
            ),
            status_code=400,
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
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": "Could not write config file, be sure that Frigate has write permission on the config file.",
                }
            ),
            status_code=400,
        )

    if save_option == "restart":
        try:
            restart_frigate()
        except Exception as e:
            logging.error(f"Error restarting Frigate: {e}")
            return JSONResponse(
                content=(
                    {
                        "success": True,
                        "message": "Config successfully saved, unable to restart Frigate",
                    }
                ),
                status_code=200,
            )

        return JSONResponse(
            content=(
                {
                    "success": True,
                    "message": "Config successfully saved, restarting (this can take up to one minute)...",
                }
            ),
            status_code=200,
        )
    else:
        return JSONResponse(
            content=({"success": True, "message": "Config successfully saved."}),
            status_code=200,
        )


@router.put("/config/set")
def config_set(request: Request, body: AppConfigSetBody):
    config_file = os.environ.get("CONFIG_FILE", f"{CONFIG_DIR}/config.yml")

    # Check if we can use .yaml instead of .yml
    config_file_yaml = config_file.replace(".yml", ".yaml")

    if os.path.isfile(config_file_yaml):
        config_file = config_file_yaml

    with open(config_file, "r") as f:
        old_raw_config = f.read()
        f.close()

    try:
        update_yaml_from_url(config_file, str(request.url))
        with open(config_file, "r") as f:
            new_raw_config = f.read()
            f.close()
        # Validate the config schema
        try:
            config = FrigateConfig.parse(new_raw_config)
        except Exception:
            with open(config_file, "w") as f:
                f.write(old_raw_config)
                f.close()
            logger.error(f"\nConfig Error:\n\n{str(traceback.format_exc())}")
            return JSONResponse(
                content=(
                    {
                        "success": False,
                        "message": "Error parsing config. Check logs for error message.",
                    }
                ),
                status_code=400,
            )
    except Exception as e:
        logging.error(f"Error updating config: {e}")
        return JSONResponse(
            content=({"success": False, "message": "Error updating config"}),
            status_code=500,
        )

    if body.requires_restart == 0:
        request.app.frigate_config = config
    return JSONResponse(
        content=(
            {
                "success": True,
                "message": "Config successfully updated, restart to apply",
            }
        ),
        status_code=200,
    )


@router.get("/ffprobe")
def ffprobe(request: Request, paths: str = ""):
    path_param = paths

    if not path_param:
        return JSONResponse(
            content=({"success": False, "message": "Path needs to be provided."}),
            status_code=404,
        )

    if path_param.startswith("camera"):
        camera = path_param[7:]

        if camera not in request.app.frigate_config.cameras.keys():
            return JSONResponse(
                content=(
                    {"success": False, "message": f"{camera} is not a valid camera."}
                ),
                status_code=404,
            )

        if not request.app.frigate_config.cameras[camera].enabled:
            return JSONResponse(
                content=({"success": False, "message": f"{camera} is not enabled."}),
                status_code=404,
            )

        paths = map(
            lambda input: input.path,
            request.app.frigate_config.cameras[camera].ffmpeg.inputs,
        )
    elif "," in clean_camera_user_pass(path_param):
        paths = path_param.split(",")
    else:
        paths = [path_param]

    # user has multiple streams
    output = []

    for path in paths:
        ffprobe = ffprobe_stream(request.app.frigate_config.ffmpeg, path.strip())
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

    return JSONResponse(content=output)


@router.get("/vainfo")
def vainfo():
    vainfo = vainfo_hwaccel()
    return JSONResponse(
        content={
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


@router.get("/nvinfo")
def nvinfo():
    return JSONResponse(content=get_nvidia_driver_info())


@router.get("/logs/{service}", tags=[Tags.logs])
def logs(
    service: str = Path(enum=["frigate", "nginx", "go2rtc"]),
    download: Optional[str] = None,
    start: Optional[int] = 0,
    end: Optional[int] = None,
):
    """Get logs for the requested service (frigate/nginx/go2rtc)"""

    def download_logs(service_location: str):
        try:
            file = open(service_location, "r")
            contents = file.read()
            file.close()
            return JSONResponse(jsonable_encoder(contents))
        except FileNotFoundError as e:
            logger.error(e)
            return JSONResponse(
                content={"success": False, "message": "Could not find log file"},
                status_code=500,
            )

    log_locations = {
        "frigate": "/dev/shm/logs/frigate/current",
        "go2rtc": "/dev/shm/logs/go2rtc/current",
        "nginx": "/dev/shm/logs/nginx/current",
    }
    service_location = log_locations.get(service)

    if not service_location:
        return JSONResponse(
            content={"success": False, "message": "Not a valid service"},
            status_code=404,
        )

    if download:
        return download_logs(service_location)

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

        return JSONResponse(
            content={"totalLines": len(logLines), "lines": logLines[start:end]},
            status_code=200,
        )
    except FileNotFoundError as e:
        logger.error(e)
        return JSONResponse(
            content={"success": False, "message": "Could not find log file"},
            status_code=500,
        )


@router.post("/restart")
def restart():
    try:
        restart_frigate()
    except Exception as e:
        logging.error(f"Error restarting Frigate: {e}")
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": "Unable to restart Frigate.",
                }
            ),
            status_code=500,
        )

    return JSONResponse(
        content=(
            {
                "success": True,
                "message": "Restarting (this can take up to one minute)...",
            }
        ),
        status_code=200,
    )


@router.get("/labels")
def get_labels(camera: str = ""):
    try:
        if camera:
            events = Event.select(Event.label).where(Event.camera == camera).distinct()
        else:
            events = Event.select(Event.label).distinct()
    except Exception as e:
        logger.error(e)
        return JSONResponse(
            content=({"success": False, "message": "Failed to get labels"}),
            status_code=404,
        )

    labels = sorted([e.label for e in events])
    return JSONResponse(content=labels)


@router.get("/sub_labels")
def get_sub_labels(split_joined: Optional[int] = None):
    try:
        events = Event.select(Event.sub_label).distinct()
    except Exception:
        return JSONResponse(
            content=({"success": False, "message": "Failed to get sub_labels"}),
            status_code=404,
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
    return JSONResponse(content=sub_labels)


@router.get("/timeline")
def timeline(camera: str = "all", limit: int = 100, source_id: Optional[str] = None):
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

    return JSONResponse(content=[t for t in timeline])


@router.get("/timeline/hourly")
def hourly_timeline(params: AppTimelineHourlyQueryParameters = Depends()):
    """Get hourly summary for timeline."""
    cameras = params.cameras
    labels = params.labels
    before = params.before
    after = params.after
    limit = params.limit
    tz_name = params.timezone

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

    return JSONResponse(
        content={
            "start": start,
            "end": end,
            "count": count,
            "hours": hours,
        }
    )
