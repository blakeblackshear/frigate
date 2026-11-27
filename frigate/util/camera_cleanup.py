"""Utilities for cleaning up camera data from database and filesystem."""

import glob
import logging
import os
import re
import shutil

from frigate.const import CLIPS_DIR, RECORD_DIR, SUB_CACHE_TAG, THUMB_DIR
from frigate.models import (
    Event,
    Export,
    Previews,
    Recordings,
    Regions,
    ReviewSegment,
    Timeline,
    Trigger,
)

logger = logging.getLogger(__name__)


def cleanup_camera_db(
    camera_name: str, delete_exports: bool = False
) -> tuple[dict[str, int], list[str]]:
    """Remove all database rows for a camera.

    Args:
        camera_name: The camera name to clean up
        delete_exports: Whether to also delete export records

    Returns:
        Tuple of (deletion counts dict, list of export file paths to remove)
    """
    counts: dict[str, int] = {}
    export_paths: list[str] = []

    try:
        counts["events"] = Event.delete().where(Event.camera == camera_name).execute()
    except Exception as e:
        logger.error("Failed to delete events for camera %s: %s", camera_name, e)

    try:
        counts["timeline"] = (
            Timeline.delete().where(Timeline.camera == camera_name).execute()
        )
    except Exception as e:
        logger.error("Failed to delete timeline for camera %s: %s", camera_name, e)

    try:
        counts["recordings"] = (
            Recordings.delete().where(Recordings.camera == camera_name).execute()
        )
    except Exception as e:
        logger.error("Failed to delete recordings for camera %s: %s", camera_name, e)

    try:
        counts["review_segments"] = (
            ReviewSegment.delete().where(ReviewSegment.camera == camera_name).execute()
        )
    except Exception as e:
        logger.error(
            "Failed to delete review segments for camera %s: %s", camera_name, e
        )

    try:
        counts["previews"] = (
            Previews.delete().where(Previews.camera == camera_name).execute()
        )
    except Exception as e:
        logger.error("Failed to delete previews for camera %s: %s", camera_name, e)

    try:
        counts["regions"] = (
            Regions.delete().where(Regions.camera == camera_name).execute()
        )
    except Exception as e:
        logger.error("Failed to delete regions for camera %s: %s", camera_name, e)

    try:
        counts["triggers"] = (
            Trigger.delete().where(Trigger.camera == camera_name).execute()
        )
    except Exception as e:
        logger.error("Failed to delete triggers for camera %s: %s", camera_name, e)

    if delete_exports:
        try:
            exports = Export.select(Export.video_path, Export.thumb_path).where(
                Export.camera == camera_name
            )
            for export in exports:
                export_paths.append(export.video_path)
                export_paths.append(export.thumb_path)

            counts["exports"] = (
                Export.delete().where(Export.camera == camera_name).execute()
            )
        except Exception as e:
            logger.error("Failed to delete exports for camera %s: %s", camera_name, e)

    return counts, export_paths


def cleanup_camera_files(
    camera_name: str, export_paths: list[str] | None = None
) -> None:
    """Remove filesystem artifacts for a camera.

    Args:
        camera_name: The camera name to clean up
        export_paths: Optional list of export file paths to remove
    """
    dirs_to_clean = [
        os.path.join(THUMB_DIR, camera_name),
        os.path.join(CLIPS_DIR, "previews", camera_name),
        os.path.join(CLIPS_DIR, "lpr", camera_name),
        os.path.join(CLIPS_DIR, "triggers", camera_name),
    ]

    # recordings live at RECORD_DIR/<date>/<hour>/<camera>
    for name in (camera_name, f"{camera_name}{SUB_CACHE_TAG}"):
        dirs_to_clean.extend(
            glob.glob(os.path.join(glob.escape(RECORD_DIR), "*", "*", name))
        )

    for dir_path in dirs_to_clean:
        if os.path.exists(dir_path):
            try:
                shutil.rmtree(dir_path)
                logger.debug("Removed directory: %s", dir_path)
            except Exception as e:
                logger.error("Failed to remove %s: %s", dir_path, e)

    # Match the whole file name so deleting "front" keeps the files of "front-door"
    media_id = r"[\d.]+-[a-z0-9]{6}"
    camera = re.escape(camera_name)
    media_patterns = [
        (
            CLIPS_DIR,
            re.compile(rf"{camera}-{media_id}(\.jpg|-clean\.webp|-clean\.png)"),
        ),
        (
            os.path.join(CLIPS_DIR, "review"),
            re.compile(rf"thumb-{camera}-{media_id}\.webp"),
        ),
    ]

    for directory, pattern in media_patterns:
        if not os.path.isdir(directory):
            continue

        try:
            files = os.listdir(directory)
        except OSError as e:
            logger.error("Failed to list %s: %s", directory, e)
            continue

        for file in files:
            if not pattern.fullmatch(file):
                continue

            path = os.path.join(directory, file)
            try:
                os.remove(path)
            except Exception as e:
                logger.error("Failed to remove media file %s: %s", path, e)

    # Remove export files if requested
    if export_paths:
        for path in export_paths:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                    logger.debug("Removed export file: %s", path)
                except Exception as e:
                    logger.error("Failed to remove export file %s: %s", path, e)
