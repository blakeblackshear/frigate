"""configuration utils."""

import asyncio
import logging
import os
import shutil
from typing import Optional, Union

from ruamel.yaml import YAML

from frigate.const import CONFIG_DIR, EXPORT_DIR
from frigate.util.services import get_video_properties

logger = logging.getLogger(__name__)

CURRENT_CONFIG_VERSION = 0.14


def migrate_frigate_config(config_file: str):
    """handle migrating the frigate config."""
    logger.info("Checking if frigate config needs migration...")

    if not os.access(config_file, mode=os.W_OK):
        logger.error("Config file is read-only, unable to migrate config file.")
        return

    yaml = YAML()
    yaml.indent(mapping=2, sequence=4, offset=2)
    with open(config_file, "r") as f:
        config: dict[str, dict[str, any]] = yaml.load(f)

    previous_version = config.get("version", 0.13)

    if previous_version == CURRENT_CONFIG_VERSION:
        logger.info("frigate config does not need migration...")
        return

    logger.info("copying config as backup...")
    shutil.copy(config_file, os.path.join(CONFIG_DIR, "backup_config.yaml"))

    if previous_version < 0.14:
        logger.info(f"Migrating frigate config from {previous_version} to 0.14...")
        new_config = migrate_014(config)
        with open(config_file, "w") as f:
            yaml.dump(new_config, f)
        previous_version = 0.14

        logger.info("Migrating export file names...")
        for file in os.listdir(EXPORT_DIR):
            if "@" not in file:
                continue

            new_name = file.replace("@", "_")
            os.rename(
                os.path.join(EXPORT_DIR, file), os.path.join(EXPORT_DIR, new_name)
            )

    logger.info("Finished frigate config migration...")


def migrate_014(config: dict[str, dict[str, any]]) -> dict[str, dict[str, any]]:
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
        camera_config: dict[str, dict[str, any]] = camera.copy()
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

    new_config["version"] = 0.14
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
                            f"{round(x / frame_shape[1], 3)},{round(y  / frame_shape[0], 3)}"
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
                    f"{round(x / frame_shape[1], 3)},{round(y  / frame_shape[0], 3)}"
                )

            mask = ",".join(rel_points)

        return mask

    return mask


class StreamInfoRetriever:
    def __init__(self) -> None:
        self.stream_cache: dict[str, tuple[int, int]] = {}

    def get_stream_info(self, path: str) -> str:
        if path in self.stream_cache:
            return self.stream_cache[path]

        info = asyncio.run(get_video_properties(path))
        self.stream_cache[path] = info
        return info
