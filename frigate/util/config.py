"""configuration utils."""

import logging
import os
import shutil

from ruamel.yaml import YAML

from frigate.const import CONFIG_DIR, EXPORT_DIR

logger = logging.getLogger(__name__)

CURRENT_CONFIG_VERSION = 0.14


def migrate_frigate_config(config_file: str):
    """handle migrating the frigate config."""
    logger.info("Checking if frigate config needs migration...")
    version_file = os.path.join(CONFIG_DIR, ".version")

    if not os.path.isfile(version_file):
        previous_version = 0.13
    else:
        with open(version_file) as f:
            try:
                previous_version = float(f.readline())
            except Exception:
                previous_version = 0.13

    if previous_version == CURRENT_CONFIG_VERSION:
        logger.info("frigate config does not need migration...")
        return

    logger.info("copying config as backup...")
    shutil.copy(config_file, os.path.join(CONFIG_DIR, "backup_config.yaml"))

    yaml = YAML()
    yaml.indent(mapping=2, sequence=4, offset=2)
    with open(config_file, "r") as f:
        config: dict[str, dict[str, any]] = yaml.load(f)

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

    with open(version_file, "w") as f:
        f.write(str(CURRENT_CONFIG_VERSION))

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

        if new_config.get("ui", {}).get("use_experimental"):
            del new_config["ui"]["experimental"]

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

    return new_config
