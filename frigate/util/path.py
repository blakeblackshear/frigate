"""Path utilities."""

import base64
import os
from pathlib import Path

import cv2
from numpy import ndarray

from frigate.const import CLIPS_DIR, THUMB_DIR
from frigate.models import Event


def get_event_thumbnail_bytes(event: Event) -> bytes | None:
    if event.thumbnail:
        return base64.b64decode(event.thumbnail)
    else:
        try:
            with open(
                os.path.join(THUMB_DIR, event.camera, f"{event.id}.webp"), "rb"
            ) as f:
                return f.read()
        except Exception:
            return None


def get_event_snapshot(event: Event) -> ndarray:
    media_name = f"{event.camera}-{event.id}"
    return cv2.imread(f"{os.path.join(CLIPS_DIR, media_name)}.jpg")


### Deletion


def delete_event_images(event: Event) -> bool:
    return delete_event_snapshot(event) and delete_event_thumbnail(event)


def delete_event_snapshot(event: Event) -> bool:
    media_name = f"{event.camera}-{event.id}"
    media_path = Path(f"{os.path.join(CLIPS_DIR, media_name)}.jpg")

    try:
        media_path.unlink(missing_ok=True)
        media_path = Path(f"{os.path.join(CLIPS_DIR, media_name)}-clean.png")
        media_path.unlink(missing_ok=True)
        return True
    except OSError:
        return False


def delete_event_thumbnail(event: Event) -> bool:
    if event.thumbnail:
        return True
    else:
        Path(os.path.join(THUMB_DIR, event.camera, f"{event.id}.webp")).unlink(
            missing_ok=True
        )
        return True
