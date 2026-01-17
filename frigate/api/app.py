"""Main api runner."""

import asyncio
import copy
import json
import logging
import os
import traceback
import urllib
from datetime import datetime, timedelta
from functools import reduce
from io import StringIO
from pathlib import Path as FilePath
from typing import Any, Dict, List, Optional

import aiofiles
import ruamel.yaml
from fastapi import APIRouter, Body, Path, Request, Response
from fastapi.encoders import jsonable_encoder
from fastapi.params import Depends
from fastapi.responses import JSONResponse, PlainTextResponse, StreamingResponse
from markupsafe import escape
from peewee import SQL, fn, operator
from pydantic import ValidationError

from frigate.api.auth import (
    allow_any_authenticated,
    allow_public,
    get_allowed_cameras_for_filter,
    require_role,
)
from frigate.api.defs.query.app_query_parameters import AppTimelineHourlyQueryParameters
from frigate.api.defs.request.app_body import AppConfigSetBody
from frigate.api.defs.tags import Tags
from frigate.config import FrigateConfig
from frigate.config.camera.updater import (
    CameraConfigUpdateEnum,
    CameraConfigUpdateTopic,
)
from frigate.models import Event, Timeline
from frigate.stats.prometheus import get_metrics, update_metrics
from frigate.util.builtin import (
    clean_camera_user_pass,
    flatten_config_data,
    process_config_query_string,
    update_yaml_file_bulk,
)
from frigate.util.config import find_config_file
from frigate.util.services import (
    get_nvidia_driver_info,
    process_logs,
    restart_frigate,
    vainfo_hwaccel,
)
from frigate.util.time import get_tz_modifiers
from frigate.version import VERSION

logger = logging.getLogger(__name__)


router = APIRouter(tags=[Tags.app])


@router.get(
    "/", response_class=PlainTextResponse, dependencies=[Depends(allow_public())]
)
def is_healthy():
    return "Frigate is running. Alive and healthy!"


@router.get("/config/schema.json", dependencies=[Depends(allow_public())])
def config_schema(request: Request):
    return Response(
        content=request.app.frigate_config.schema_json(), media_type="application/json"
    )


@router.get(
    "/version", response_class=PlainTextResponse, dependencies=[Depends(allow_public())]
)
def version():
    return VERSION


@router.get("/stats", dependencies=[Depends(allow_any_authenticated())])
def stats(request: Request):
    return JSONResponse(content=request.app.stats_emitter.get_latest_stats())


@router.get("/stats/history", dependencies=[Depends(allow_any_authenticated())])
def stats_history(request: Request, keys: str = None):
    if keys:
        keys = keys.split(",")

    return JSONResponse(content=request.app.stats_emitter.get_stats_history(keys))


@router.get("/metrics", dependencies=[Depends(allow_any_authenticated())])
def metrics(request: Request):
    """Expose Prometheus metrics endpoint and update metrics with latest stats"""
    # Retrieve the latest statistics and update the Prometheus metrics
    stats = request.app.stats_emitter.get_latest_stats()
    # query DB for count of events by camera, label
    event_counts: List[Dict[str, Any]] = (
        Event.select(Event.camera, Event.label, fn.Count())
        .group_by(Event.camera, Event.label)
        .dicts()
    )

    update_metrics(stats=stats, event_counts=event_counts)
    content, content_type = get_metrics()
    return Response(content=content, media_type=content_type)


@router.get("/config", dependencies=[Depends(allow_any_authenticated())])
def config(request: Request):
    config_obj: FrigateConfig = request.app.frigate_config
    config: dict[str, dict[str, Any]] = config_obj.model_dump(
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

    # remove go2rtc stream passwords
    go2rtc: dict[str, Any] = config_obj.go2rtc.model_dump(
        mode="json", warnings="none", exclude_none=True
    )
    for stream_name, stream in go2rtc.get("streams", {}).items():
        if stream is None:
            continue
        if isinstance(stream, str):
            cleaned = clean_camera_user_pass(stream)
        else:
            cleaned = []

            for item in stream:
                cleaned.append(clean_camera_user_pass(item))

        config["go2rtc"]["streams"][stream_name] = cleaned

    config["plus"] = {"enabled": request.app.frigate_config.plus_api.is_active()}
    config["model"]["colormap"] = config_obj.model.colormap
    config["model"]["all_attributes"] = config_obj.model.all_attributes
    config["model"]["non_logo_attributes"] = config_obj.model.non_logo_attributes

    # Add model plus data if plus is enabled
    if config["plus"]["enabled"]:
        model_path = config.get("model", {}).get("path")
        if model_path:
            model_json_path = FilePath(model_path).with_suffix(".json")
            try:
                with open(model_json_path, "r") as f:
                    model_plus_data = json.load(f)
                config["model"]["plus"] = model_plus_data
            except FileNotFoundError:
                config["model"]["plus"] = None
            except json.JSONDecodeError:
                config["model"]["plus"] = None
        else:
            config["model"]["plus"] = None

    # use merged labelamp
    for detector_config in config["detectors"].values():
        detector_config["model"]["labelmap"] = (
            request.app.frigate_config.model.merged_labelmap
        )

    return JSONResponse(content=config)


@router.get("/config/raw_paths", dependencies=[Depends(require_role(["admin"]))])
def config_raw_paths(request: Request):
    """Admin-only endpoint that returns camera paths and go2rtc streams without credential masking."""
    config_obj: FrigateConfig = request.app.frigate_config

    raw_paths = {"cameras": {}, "go2rtc": {"streams": {}}}

    # Extract raw camera ffmpeg input paths
    for camera_name, camera in config_obj.cameras.items():
        raw_paths["cameras"][camera_name] = {
            "ffmpeg": {
                "inputs": [
                    {"path": input.path, "roles": input.roles}
                    for input in camera.ffmpeg.inputs
                ]
            }
        }

    # Extract raw go2rtc stream URLs
    go2rtc_config = config_obj.go2rtc.model_dump(
        mode="json", warnings="none", exclude_none=True
    )
    for stream_name, stream in go2rtc_config.get("streams", {}).items():
        if stream is None:
            continue
        raw_paths["go2rtc"]["streams"][stream_name] = stream

    return JSONResponse(content=raw_paths)


@router.get("/config/raw", dependencies=[Depends(allow_any_authenticated())])
def config_raw():
    config_file = find_config_file()

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


@router.post("/config/save", dependencies=[Depends(require_role(["admin"]))])
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
        # Use ruamel to parse and preserve line numbers
        yaml_config = ruamel.yaml.YAML()
        yaml_config.preserve_quotes = True
        full_config = yaml_config.load(StringIO(new_config))

        FrigateConfig.parse_yaml(new_config)

    except ValidationError as e:
        error_message = []

        for error in e.errors():
            error_path = error["loc"]
            current = full_config
            line_number = "Unknown"
            last_line_number = "Unknown"

            try:
                for i, part in enumerate(error_path):
                    key = int(part) if part.isdigit() else part

                    if isinstance(current, ruamel.yaml.comments.CommentedMap):
                        current = current[key]
                    elif isinstance(current, list):
                        current = current[key]

                    if hasattr(current, "lc"):
                        last_line_number = current.lc.line

                    if i == len(error_path) - 1:
                        if hasattr(current, "lc"):
                            line_number = current.lc.line
                        else:
                            line_number = last_line_number

            except Exception:
                line_number = "Unable to determine"

            error_message.append(
                f"Line {line_number}: {' -> '.join(map(str, error_path))} - {error.get('msg', error.get('type', 'Unknown'))}"
            )

        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": "Your configuration is invalid.\nSee the official documentation at docs.frigate.video.\n\n"
                    + "\n".join(error_message),
                }
            ),
            status_code=400,
        )

    except Exception:
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": f"\nYour configuration is invalid.\nSee the official documentation at docs.frigate.video.\n\n{escape(str(traceback.format_exc()))}",
                }
            ),
            status_code=400,
        )

    # Save the config to file
    try:
        config_file = find_config_file()

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


@router.put("/config/set", dependencies=[Depends(require_role(["admin"]))])
def config_set(request: Request, body: AppConfigSetBody):
    config_file = find_config_file()

    with open(config_file, "r") as f:
        old_raw_config = f.read()

    try:
        updates = {}

        # process query string parameters (takes precedence over body.config_data)
        parsed_url = urllib.parse.urlparse(str(request.url))
        query_string = urllib.parse.parse_qs(parsed_url.query, keep_blank_values=True)

        # Filter out empty keys but keep blank values for non-empty keys
        query_string = {k: v for k, v in query_string.items() if k}

        if query_string:
            updates = process_config_query_string(query_string)
        elif body.config_data:
            updates = flatten_config_data(body.config_data)

        if not updates:
            return JSONResponse(
                content=(
                    {"success": False, "message": "No configuration data provided"}
                ),
                status_code=400,
            )

        # apply all updates in a single operation
        update_yaml_file_bulk(config_file, updates)

        # validate the updated config
        with open(config_file, "r") as f:
            new_raw_config = f.read()

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

    if body.requires_restart == 0 or body.update_topic:
        old_config: FrigateConfig = request.app.frigate_config
        request.app.frigate_config = config

        if body.update_topic:
            if body.update_topic.startswith("config/cameras/"):
                _, _, camera, field = body.update_topic.split("/")

                if field == "add":
                    settings = config.cameras[camera]
                elif field == "remove":
                    settings = old_config.cameras[camera]
                else:
                    settings = config.get_nested_object(body.update_topic)

                request.app.config_publisher.publish_update(
                    CameraConfigUpdateTopic(CameraConfigUpdateEnum[field], camera),
                    settings,
                )
            else:
                # Generic handling for global config updates
                settings = config.get_nested_object(body.update_topic)

                # Publish None for removal, actual config for add/update
                request.app.config_publisher.publisher.publish(
                    body.update_topic, settings
                )

    return JSONResponse(
        content=(
            {
                "success": True,
                "message": "Config successfully updated, restart to apply",
            }
        ),
        status_code=200,
    )


@router.get("/vainfo", dependencies=[Depends(allow_any_authenticated())])
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


@router.get("/nvinfo", dependencies=[Depends(allow_any_authenticated())])
def nvinfo():
    return JSONResponse(content=get_nvidia_driver_info())


@router.get(
    "/logs/{service}",
    tags=[Tags.logs],
    dependencies=[Depends(allow_any_authenticated())],
)
async def logs(
    service: str = Path(enum=["frigate", "nginx", "go2rtc"]),
    download: Optional[str] = None,
    stream: Optional[bool] = False,
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

    async def stream_logs(file_path: str):
        """Asynchronously stream log lines."""
        buffer = ""
        try:
            async with aiofiles.open(file_path, "r") as file:
                await file.seek(0, 2)
                while True:
                    line = await file.readline()
                    if line:
                        buffer += line
                        # Process logs only when there are enough lines in the buffer
                        if "\n" in buffer:
                            _, processed_lines = process_logs(buffer, service)
                            buffer = ""
                            for processed_line in processed_lines:
                                yield f"{processed_line}\n"
                    else:
                        await asyncio.sleep(0.1)
        except FileNotFoundError:
            yield "Log file not found.\n"

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

    if stream:
        return StreamingResponse(stream_logs(service_location), media_type="text/plain")

    # For full logs initially
    try:
        async with aiofiles.open(service_location, "r") as file:
            contents = await file.read()

        total_lines, log_lines = process_logs(contents, service, start, end)
        return JSONResponse(
            content={"totalLines": total_lines, "lines": log_lines},
            status_code=200,
        )
    except FileNotFoundError as e:
        logger.error(e)
        return JSONResponse(
            content={"success": False, "message": "Could not find log file"},
            status_code=500,
        )


@router.post("/restart", dependencies=[Depends(require_role(["admin"]))])
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


@router.get("/labels", dependencies=[Depends(allow_any_authenticated())])
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


@router.get("/sub_labels", dependencies=[Depends(allow_any_authenticated())])
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


@router.get("/plus/models", dependencies=[Depends(allow_any_authenticated())])
def plusModels(request: Request, filterByCurrentModelDetector: bool = False):
    if not request.app.frigate_config.plus_api.is_active():
        return JSONResponse(
            content=({"success": False, "message": "Frigate+ is not enabled"}),
            status_code=400,
        )

    models: dict[Any, Any] = request.app.frigate_config.plus_api.get_models()

    if not models["list"]:
        return JSONResponse(
            content=({"success": False, "message": "No models found"}),
            status_code=400,
        )

    modelList = models["list"]

    # current model type
    modelType = request.app.frigate_config.model.model_type

    # current detectorType for comparing to supportedDetectors
    detectorType = list(request.app.frigate_config.detectors.values())[0].type

    validModels = []

    for model in sorted(
        filter(
            lambda m: (
                not filterByCurrentModelDetector
                or (detectorType in m["supportedDetectors"] and modelType in m["type"])
            ),
            modelList,
        ),
        key=(lambda m: m["trainDate"]),
        reverse=True,
    ):
        validModels.append(model)

    return JSONResponse(content=validModels)


@router.get(
    "/recognized_license_plates", dependencies=[Depends(allow_any_authenticated())]
)
def get_recognized_license_plates(
    split_joined: Optional[int] = None,
    allowed_cameras: List[str] = Depends(get_allowed_cameras_for_filter),
):
    try:
        query = (
            Event.select(
                SQL("json_extract(data, '$.recognized_license_plate') AS plate")
            )
            .where(
                (SQL("json_extract(data, '$.recognized_license_plate') IS NOT NULL"))
                & (Event.camera << allowed_cameras)
            )
            .distinct()
        )
        recognized_license_plates = [row[0] for row in query.tuples()]
    except Exception:
        return JSONResponse(
            content=(
                {"success": False, "message": "Failed to get recognized license plates"}
            ),
            status_code=404,
        )

    if split_joined:
        original_recognized_license_plates = recognized_license_plates.copy()
        for recognized_license_plate in original_recognized_license_plates:
            if recognized_license_plate and "," in recognized_license_plate:
                recognized_license_plates.remove(recognized_license_plate)
                parts = recognized_license_plate.split(",")
                for part in parts:
                    if part.strip() not in recognized_license_plates:
                        recognized_license_plates.append(part.strip())

    recognized_license_plates = list(set(recognized_license_plates))
    recognized_license_plates.sort()
    return JSONResponse(content=recognized_license_plates)


@router.get("/timeline", dependencies=[Depends(allow_any_authenticated())])
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
        source_ids = [sid.strip() for sid in source_id.split(",")]
        if len(source_ids) == 1:
            clauses.append((Timeline.source_id == source_ids[0]))
        else:
            clauses.append((Timeline.source_id.in_(source_ids)))

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


@router.get("/timeline/hourly", dependencies=[Depends(allow_any_authenticated())])
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
    hours: dict[str, list[dict[str, Any]]] = {}

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
