"""Utility for extracting high-resolution frames from recording segments."""

import logging
import math
from typing import Optional

import cv2
import numpy as np
from peewee import DoesNotExist

from frigate.models import Recordings
from frigate.util.image import get_image_from_recording

logger = logging.getLogger(__name__)


def get_recording_frame(
    ffmpeg_config,
    camera_name: str,
    frame_time: float,
) -> Optional[np.ndarray]:
    """Extract a single full-resolution frame from recording segments.

    Checks the Recordings database for a segment covering frame_time,
    then uses ffmpeg to decode one frame. CPU only, ~50-100ms.

    Args:
        ffmpeg_config: FfmpegConfig with ffmpeg_path property.
        camera_name: Name of the camera.
        frame_time: Unix timestamp of the desired frame.

    Returns:
        BGR numpy array at full recording resolution, or None
        if the segment is not available.
    """
    recording = None

    try:
        recording = (
            Recordings.select(Recordings.path, Recordings.start_time)
            .where(
                (frame_time >= Recordings.start_time)
                & (frame_time <= Recordings.end_time)
            )
            .where(Recordings.camera == camera_name)
            .order_by(Recordings.start_time.desc())
            .limit(1)
            .get()
        )
    except DoesNotExist:
        rounded = math.ceil(frame_time)
        try:
            recording = (
                Recordings.select(Recordings.path, Recordings.start_time)
                .where(
                    (rounded >= Recordings.start_time)
                    & (rounded <= Recordings.end_time)
                )
                .where(Recordings.camera == camera_name)
                .order_by(Recordings.start_time.desc())
                .limit(1)
                .get()
            )
        except DoesNotExist:
            pass

    if recording is None:
        logger.debug(f"No recording segment found for {camera_name} at {frame_time}")
        return None

    time_in_segment = frame_time - recording.start_time
    image_data = get_image_from_recording(
        ffmpeg_config, recording.path, time_in_segment, "png"
    )

    if not image_data:
        logger.debug(
            f"Failed to extract frame from recording for {camera_name} at {frame_time}"
        )
        return None

    img_array = np.frombuffer(image_data, dtype=np.uint8)
    frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

    if frame is None:
        logger.debug(f"Failed to decode recording frame for {camera_name}")
        return None

    return frame


def scale_bounding_box(
    box: tuple[int, int, int, int],
    from_res: tuple[int, int],
    to_res: tuple[int, int],
    padding: float = 0.15,
) -> tuple[int, int, int, int]:
    """Scale a bounding box from one resolution to another with padding.

    Args:
        box: (left, top, right, bottom) in source resolution.
        from_res: (width, height) of source (detect stream).
        to_res: (width, height) of target (recording stream).
        padding: Fractional padding to add around the box (default 15%).

    Returns:
        (left, top, right, bottom) in target resolution, clipped to bounds.
    """
    from_w, from_h = from_res
    to_w, to_h = to_res

    scale_x = to_w / from_w
    scale_y = to_h / from_h

    left, top, right, bottom = box
    # Scale to target resolution
    left = left * scale_x
    top = top * scale_y
    right = right * scale_x
    bottom = bottom * scale_y

    # Apply padding
    w = right - left
    h = bottom - top
    pad_x = w * padding
    pad_y = h * padding
    left -= pad_x
    top -= pad_y
    right += pad_x
    bottom += pad_y

    # Clip to frame bounds
    left = max(0, int(left))
    top = max(0, int(top))
    right = min(to_w, int(right))
    bottom = min(to_h, int(bottom))

    return (left, top, right, bottom)
