"""configuration utils."""

import asyncio
import logging
import os
import shutil
from typing import Any, Optional, Union

from ruamel.yaml import YAML

from frigate.const import CONFIG_DIR, EXPORT_DIR
from frigate.util.services import get_video_properties

logger = logging.getLogger(__name__)

CURRENT_CONFIG_VERSION = "0.18-0"
DEFAULT_CONFIG_FILE = os.path.join(CONFIG_DIR, "config.yml")


def find_config_file() -> str:
    config_path = os.environ.get("CONFIG_FILE", DEFAULT_CONFIG_FILE)

    if not os.path.isfile(config_path):
        config_path = config_path.replace("yml", "yaml")

    return config_path


def migrate_frigate_config(config_file: str):
    """handle migrating the frigate config."""
    logger.info("Checking if frigate config needs migration...")

    if not os.access(config_file, mode=os.W_OK):
        logger.error("Config file is read-only, unable to migrate config file.")
        return

    yaml = YAML()
    yaml.indent(mapping=2, sequence=4, offset=2)
    with open(config_file, "r") as f:
        config: dict[str, dict[str, Any]] = yaml.load(f)

    if config is None:
        logger.error(f"Failed to load config at {config_file}")
        return

    previous_version = str(config.get("version", "0.13"))

    if previous_version == CURRENT_CONFIG_VERSION:
        logger.info("frigate config does not need migration...")
        return

    logger.info("copying config as backup...")
    shutil.copy(config_file, os.path.join(CONFIG_DIR, "backup_config.yaml"))

    if previous_version < "0.14":
        logger.info(f"Migrating frigate config from {previous_version} to 0.14...")
        new_config = migrate_014(config)
        with open(config_file, "w") as f:
            yaml.dump(new_config, f)
        previous_version = "0.14"

        logger.info("Migrating export file names...")
        if os.path.isdir(EXPORT_DIR):
            for file in os.listdir(EXPORT_DIR):
                if "@" not in file:
                    continue

                new_name = file.replace("@", "_")
                os.rename(
                    os.path.join(EXPORT_DIR, file), os.path.join(EXPORT_DIR, new_name)
                )

    if previous_version < "0.15-0":
        logger.info(f"Migrating frigate config from {previous_version} to 0.15-0...")
        new_config = migrate_015_0(config)
        with open(config_file, "w") as f:
            yaml.dump(new_config, f)
        previous_version = "0.15-0"

    if previous_version < "0.15-1":
        logger.info(f"Migrating frigate config from {previous_version} to 0.15-1...")
        new_config = migrate_015_1(config)
        with open(config_file, "w") as f:
            yaml.dump(new_config, f)
        previous_version = "0.15-1"

    if previous_version < "0.16-0":
        logger.info(f"Migrating frigate config from {previous_version} to 0.16-0...")
        new_config = migrate_016_0(config)
        with open(config_file, "w") as f:
            yaml.dump(new_config, f)
        previous_version = "0.16-0"

    if previous_version < "0.17-0":
        logger.info(f"Migrating frigate config from {previous_version} to 0.17-0...")
        new_config = migrate_017_0(config)
        with open(config_file, "w") as f:
            yaml.dump(new_config, f)
        previous_version = "0.17-0"

    if previous_version < "0.18-0":
        logger.info(f"Migrating frigate config from {previous_version} to 0.18-0...")
        new_config = migrate_018_0(config)
        with open(config_file, "w") as f:
            yaml.dump(new_config, f)
        previous_version = "0.18-0"

    logger.info("Finished frigate config migration...")


def migrate_014(config: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Handle migrating frigate config to 0.14"""
    # migrate record.events.required_zones to review.alerts.required_zones
    new_config = config.copy()
    global_required_zones = (
        config.get("record", {}).get("events", {}).get("required_zones", [])
    )

    if global_required_zones:
        # migrate to new review config
        if not new_config.get("review"):
            new_config["review"] = {}

        if not new_config["review"].get("alerts"):
            new_config["review"]["alerts"] = {}

        if not new_config["review"]["alerts"].get("required_zones"):
            new_config["review"]["alerts"]["required_zones"] = global_required_zones

        # remove record required zones config
        del new_config["record"]["events"]["required_zones"]

        # remove record altogether if there is not other config
        if not new_config["record"]["events"]:
            del new_config["record"]["events"]

        if not new_config["record"]:
            del new_config["record"]

    # Remove UI fields
    if new_config.get("ui"):
        if new_config["ui"].get("use_experimental"):
            del new_config["ui"]["use_experimental"]

        if new_config["ui"].get("live_mode"):
            del new_config["ui"]["live_mode"]

        if not new_config["ui"]:
            del new_config["ui"]

    # remove rtmp
    if new_config.get("ffmpeg", {}).get("output_args", {}).get("rtmp"):
        del new_config["ffmpeg"]["output_args"]["rtmp"]

    if new_config.get("rtmp"):
        del new_config["rtmp"]

    for name, camera in config.get("cameras", {}).items():
        camera_config: dict[str, dict[str, Any]] = camera.copy()
        required_zones = (
            camera_config.get("record", {}).get("events", {}).get("required_zones", [])
        )

        if required_zones:
            # migrate to new review config
            if not camera_config.get("review"):
                camera_config["review"] = {}

            if not camera_config["review"].get("alerts"):
                camera_config["review"]["alerts"] = {}

            if not camera_config["review"]["alerts"].get("required_zones"):
                camera_config["review"]["alerts"]["required_zones"] = required_zones

            # remove record required zones config
            del camera_config["record"]["events"]["required_zones"]

            # remove record altogether if there is not other config
            if not camera_config["record"]["events"]:
                del camera_config["record"]["events"]

            if not camera_config["record"]:
                del camera_config["record"]

        # remove rtmp
        if camera_config.get("ffmpeg", {}).get("output_args", {}).get("rtmp"):
            del camera_config["ffmpeg"]["output_args"]["rtmp"]

        if camera_config.get("rtmp"):
            del camera_config["rtmp"]

        new_config["cameras"][name] = camera_config

    new_config["version"] = "0.14"
    return new_config


def migrate_015_0(config: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Handle migrating frigate config to 0.15-0"""
    new_config = config.copy()

    # migrate record.events to record.alerts and record.detections
    global_record_events = config.get("record", {}).get("events")
    if global_record_events:
        alerts_retention = {"retain": {}}
        detections_retention = {"retain": {}}

        if global_record_events.get("pre_capture"):
            alerts_retention["pre_capture"] = global_record_events["pre_capture"]

        if global_record_events.get("post_capture"):
            alerts_retention["post_capture"] = global_record_events["post_capture"]

        if global_record_events.get("retain", {}).get("default"):
            alerts_retention["retain"]["days"] = global_record_events["retain"][
                "default"
            ]

        # decide logical detections retention based on current detections config
        if not config.get("review", {}).get("alerts", {}).get(
            "required_zones"
        ) or config.get("review", {}).get("detections"):
            if global_record_events.get("pre_capture"):
                detections_retention["pre_capture"] = global_record_events[
                    "pre_capture"
                ]

            if global_record_events.get("post_capture"):
                detections_retention["post_capture"] = global_record_events[
                    "post_capture"
                ]

            if global_record_events.get("retain", {}).get("default"):
                detections_retention["retain"]["days"] = global_record_events["retain"][
                    "default"
                ]
        else:
            continuous_days = config.get("record", {}).get("retain", {}).get("days")
            detections_retention["retain"]["days"] = (
                continuous_days if continuous_days else 1
            )

        new_config["record"]["alerts"] = alerts_retention
        new_config["record"]["detections"] = detections_retention

        del new_config["record"]["events"]

    for name, camera in config.get("cameras", {}).items():
        camera_config: dict[str, dict[str, Any]] = camera.copy()

        record_events: dict[str, Any] = camera_config.get("record", {}).get("events")

        if record_events:
            alerts_retention = {"retain": {}}
            detections_retention = {"retain": {}}

            if record_events.get("pre_capture"):
                alerts_retention["pre_capture"] = record_events["pre_capture"]

            if record_events.get("post_capture"):
                alerts_retention["post_capture"] = record_events["post_capture"]

            if record_events.get("retain", {}).get("default"):
                alerts_retention["retain"]["days"] = record_events["retain"]["default"]

            # decide logical detections retention based on current detections config
            if not camera_config.get("review", {}).get("alerts", {}).get(
                "required_zones"
            ) or camera_config.get("review", {}).get("detections"):
                if record_events.get("pre_capture"):
                    detections_retention["pre_capture"] = record_events["pre_capture"]

                if record_events.get("post_capture"):
                    detections_retention["post_capture"] = record_events["post_capture"]

                if record_events.get("retain", {}).get("default"):
                    detections_retention["retain"]["days"] = record_events["retain"][
                        "default"
                    ]
            else:
                continuous_days = (
                    camera_config.get("record", {}).get("retain", {}).get("days")
                )
                detections_retention["retain"]["days"] = (
                    continuous_days if continuous_days else 1
                )

            camera_config["record"]["alerts"] = alerts_retention
            camera_config["record"]["detections"] = detections_retention
            del camera_config["record"]["events"]

        new_config["cameras"][name] = camera_config

    new_config["version"] = "0.15-0"
    return new_config


def migrate_015_1(config: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Handle migrating frigate config to 0.15-1"""
    new_config = config.copy()

    for detector, detector_config in config.get("detectors", {}).items():
        path = detector_config.get("model", {}).get("path")

        if path:
            new_config["detectors"][detector]["model_path"] = path
            del new_config["detectors"][detector]["model"]

    new_config["version"] = "0.15-1"
    return new_config


def migrate_016_0(config: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Handle migrating frigate config to 0.16-0"""
    new_config = config.copy()

    # migrate config that does not have detect -> enabled explicitly set to have it enabled
    if new_config.get("detect", {}).get("enabled") is None:
        detect_config = new_config.get("detect", {})
        detect_config["enabled"] = True
        new_config["detect"] = detect_config

    for name, camera in config.get("cameras", {}).items():
        camera_config: dict[str, dict[str, Any]] = camera.copy()

        live_config = camera_config.get("live", {})
        if "stream_name" in live_config:
            # Migrate from live -> stream_name to live -> streams -> dict
            stream_name = live_config["stream_name"]
            live_config["streams"] = {stream_name: stream_name}

            del live_config["stream_name"]

            camera_config["live"] = live_config

        # add another value to movement_weights for autotracking cams
        onvif_config = camera_config.get("onvif", {})
        if "autotracking" in onvif_config:
            movement_weights = (
                camera_config.get("onvif", {})
                .get("autotracking")
                .get("movement_weights", {})
            )

            if movement_weights and len(movement_weights.split(",")) == 5:
                onvif_config["autotracking"]["movement_weights"] = (
                    movement_weights + ", 0"
                )
            camera_config["onvif"] = onvif_config

        new_config["cameras"][name] = camera_config

    new_config["version"] = "0.16-0"
    return new_config


def migrate_017_0(config: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Handle migrating frigate config to 0.17-0"""
    new_config = config.copy()

    # migrate global to new recording configuration
    global_record_retain = config.get("record", {}).get("retain")

    if global_record_retain:
        continuous = {"days": 0}
        motion = {"days": 0}
        days = global_record_retain.get("days")
        mode = global_record_retain.get("mode", "all")

        if days:
            if mode == "all":
                continuous["days"] = days

                # if a user was keeping all for number of days
                # we need to keep motion and all for that number of days
                motion["days"] = days
            else:
                motion["days"] = days

            new_config["record"]["continuous"] = continuous
            new_config["record"]["motion"] = motion

        del new_config["record"]["retain"]

    # migrate global genai to new objects config
    global_genai = config.get("genai", {})

    if global_genai:
        new_genai_config = {}
        new_object_config = new_config.get("objects", {})
        new_object_config["genai"] = {}

        for key in global_genai.keys():
            if key in ["model", "provider", "base_url", "api_key"]:
                new_genai_config[key] = global_genai[key]
            else:
                new_object_config["genai"][key] = global_genai[key]

        new_config["genai"] = new_genai_config
        new_config["objects"] = new_object_config

    for name, camera in config.get("cameras", {}).items():
        camera_config: dict[str, dict[str, Any]] = camera.copy()
        camera_record_retain = camera_config.get("record", {}).get("retain")

        if camera_record_retain:
            continuous = {"days": 0}
            motion = {"days": 0}
            days = camera_record_retain.get("days")
            mode = camera_record_retain.get("mode", "all")

            if days:
                if mode == "all":
                    continuous["days"] = days
                else:
                    motion["days"] = days

                camera_config["record"]["continuous"] = continuous
                camera_config["record"]["motion"] = motion

            del camera_config["record"]["retain"]

        camera_genai = camera_config.get("genai", {})

        if camera_genai:
            camera_object_config = camera_config.get("objects", {})
            camera_object_config["genai"] = camera_genai
            camera_config["objects"] = camera_object_config
            del camera_config["genai"]

        new_config["cameras"][name] = camera_config

    new_config["version"] = "0.17-0"
    return new_config


def _convert_legacy_mask_to_dict(
    mask: Optional[Union[str, list]], mask_type: str = "motion_mask", label: str = ""
) -> dict[str, dict[str, Any]]:
    """Convert legacy mask format (str or list[str]) to new dict format.

    Args:
        mask: Legacy mask format (string or list of strings)
        mask_type: Type of mask for naming ("motion_mask" or "object_mask")
        label: Optional label for object masks (e.g., "person")

    Returns:
        Dictionary with mask_id as key and mask config as value
    """
    if not mask:
        return {}

    result = {}

    if isinstance(mask, str):
        if mask:
            mask_id = f"{mask_type}_1"
            friendly_name = (
                f"Object Mask 1 ({label})"
                if label
                else f"{mask_type.replace('_', ' ').title()} 1"
            )
            result[mask_id] = {
                "friendly_name": friendly_name,
                "enabled": True,
                "coordinates": mask,
            }
    elif isinstance(mask, list):
        for i, coords in enumerate(mask):
            if coords:
                mask_id = f"{mask_type}_{i + 1}"
                friendly_name = (
                    f"Object Mask {i + 1} ({label})"
                    if label
                    else f"{mask_type.replace('_', ' ').title()} {i + 1}"
                )
                result[mask_id] = {
                    "friendly_name": friendly_name,
                    "enabled": True,
                    "coordinates": coords,
                }

    return result


def migrate_018_0(config: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Handle migrating frigate config to 0.18-0"""
    new_config = config.copy()

    # Migrate GenAI to new format
    genai = new_config.get("genai")

    if genai and genai.get("provider"):
        genai["roles"] = ["embeddings", "vision", "tools"]
        new_config["genai"] = {"default": genai}

    # Remove deprecated sync_recordings from global record config
    if new_config.get("record", {}).get("sync_recordings") is not None:
        del new_config["record"]["sync_recordings"]

    # Remove deprecated timelapse_args from global record export config
    if new_config.get("record", {}).get("export", {}).get("timelapse_args") is not None:
        del new_config["record"]["export"]["timelapse_args"]
        # Remove export section if empty
        if not new_config.get("record", {}).get("export"):
            del new_config["record"]["export"]
        # Remove record section if empty
        if not new_config.get("record"):
            del new_config["record"]

    # Migrate global motion masks
    global_motion = new_config.get("motion", {})
    if global_motion and "mask" in global_motion:
        mask = global_motion.get("mask")
        if mask is not None and not isinstance(mask, dict):
            new_config["motion"]["mask"] = _convert_legacy_mask_to_dict(
                mask, "motion_mask"
            )

    # Migrate global object masks
    global_objects = new_config.get("objects", {})
    if global_objects and "mask" in global_objects:
        mask = global_objects.get("mask")
        if mask is not None and not isinstance(mask, dict):
            new_config["objects"]["mask"] = _convert_legacy_mask_to_dict(
                mask, "object_mask"
            )

    # Migrate global object filters masks
    if global_objects and "filters" in global_objects:
        for obj_name, filter_config in global_objects.get("filters", {}).items():
            if isinstance(filter_config, dict) and "mask" in filter_config:
                mask = filter_config.get("mask")
                if mask is not None and not isinstance(mask, dict):
                    new_config["objects"]["filters"][obj_name]["mask"] = (
                        _convert_legacy_mask_to_dict(mask, "object_mask", obj_name)
                    )

    # Remove deprecated sync_recordings and migrate masks for camera-specific configs
    for name, camera in config.get("cameras", {}).items():
        camera_config: dict[str, dict[str, Any]] = camera.copy()

        if camera_config.get("record", {}).get("sync_recordings") is not None:
            del camera_config["record"]["sync_recordings"]

        if (
            camera_config.get("record", {}).get("export", {}).get("timelapse_args")
            is not None
        ):
            del camera_config["record"]["export"]["timelapse_args"]
            # Remove export section if empty
            if not camera_config.get("record", {}).get("export"):
                del camera_config["record"]["export"]
            # Remove record section if empty
            if not camera_config.get("record"):
                del camera_config["record"]

        # Migrate camera motion masks
        camera_motion = camera_config.get("motion", {})
        if camera_motion and "mask" in camera_motion:
            mask = camera_motion.get("mask")
            if mask is not None and not isinstance(mask, dict):
                camera_config["motion"]["mask"] = _convert_legacy_mask_to_dict(
                    mask, "motion_mask"
                )

        # Migrate camera global object masks
        camera_objects = camera_config.get("objects", {})
        if camera_objects and "mask" in camera_objects:
            mask = camera_objects.get("mask")
            if mask is not None and not isinstance(mask, dict):
                camera_config["objects"]["mask"] = _convert_legacy_mask_to_dict(
                    mask, "object_mask"
                )

        # Migrate camera object filter masks
        if camera_objects and "filters" in camera_objects:
            for obj_name, filter_config in camera_objects.get("filters", {}).items():
                if isinstance(filter_config, dict) and "mask" in filter_config:
                    mask = filter_config.get("mask")
                    if mask is not None and not isinstance(mask, dict):
                        camera_config["objects"]["filters"][obj_name]["mask"] = (
                            _convert_legacy_mask_to_dict(mask, "object_mask", obj_name)
                        )

        new_config["cameras"][name] = camera_config

    new_config["version"] = "0.18-0"
    return new_config


def get_relative_coordinates(
    mask: Optional[Union[str, list]], frame_shape: tuple[int, int]
) -> Union[str, list]:
    # masks and zones are saved as relative coordinates
    # we know if any points are > 1 then it is using the
    # old native resolution coordinates
    if mask:
        if isinstance(mask, list) and any(x > "1.0" for x in mask[0].split(",")):
            relative_masks = []
            for m in mask:
                points = m.split(",")

                if any(x > "1.0" for x in points):
                    rel_points = []
                    for i in range(0, len(points), 2):
                        x = int(points[i])
                        y = int(points[i + 1])

                        if x > frame_shape[1] or y > frame_shape[0]:
                            logger.error(
                                f"Not applying mask due to invalid coordinates. {x},{y} is outside of the detection resolution {frame_shape[1]}x{frame_shape[0]}. Use the editor in the UI to correct the mask."
                            )
                            continue

                        rel_points.append(
                            f"{round(x / frame_shape[1], 3)},{round(y / frame_shape[0], 3)}"
                        )

                    relative_masks.append(",".join(rel_points))
                else:
                    relative_masks.append(m)

            mask = relative_masks
        elif isinstance(mask, str) and any(x > "1.0" for x in mask.split(",")):
            points = mask.split(",")
            rel_points = []

            for i in range(0, len(points), 2):
                x = int(points[i])
                y = int(points[i + 1])

                if x > frame_shape[1] or y > frame_shape[0]:
                    logger.error(
                        f"Not applying mask due to invalid coordinates. {x},{y} is outside of the detection resolution {frame_shape[1]}x{frame_shape[0]}. Use the editor in the UI to correct the mask."
                    )
                    return []

                rel_points.append(
                    f"{round(x / frame_shape[1], 3)},{round(y / frame_shape[0], 3)}"
                )

            mask = ",".join(rel_points)

        return mask

    return mask


def convert_area_to_pixels(
    area_value: Union[int, float], frame_shape: tuple[int, int]
) -> int:
    """
    Convert area specification to pixels.

    Args:
        area_value: Area value (pixels or percentage)
        frame_shape: Tuple of (height, width) for the frame

    Returns:
        Area in pixels
    """
    # If already an integer, assume it's in pixels
    if isinstance(area_value, int):
        return area_value

    # Check if it's a percentage
    if isinstance(area_value, float):
        if 0.000001 <= area_value <= 0.99:
            frame_area = frame_shape[0] * frame_shape[1]
            return max(1, int(frame_area * area_value))
        else:
            raise ValueError(
                f"Percentage must be between 0.000001 and 0.99, got {area_value}"
            )

    raise TypeError(f"Unexpected type for area: {type(area_value)}")


class StreamInfoRetriever:
    def __init__(self) -> None:
        self.stream_cache: dict[str, tuple[int, int]] = {}

    def get_stream_info(self, ffmpeg, path: str) -> str:
        if path in self.stream_cache:
            return self.stream_cache[path]

        info = asyncio.run(get_video_properties(ffmpeg, path))
        self.stream_cache[path] = info
        return info
