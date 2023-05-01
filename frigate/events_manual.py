import base64
import logging
import os
import random
import string

import cv2
from frigate.config import CameraConfig

from frigate.const import CLIPS_DIR
from frigate.models import Event
from frigate.object_processing import TrackedObjectProcessor

logger = logging.getLogger(__name__)


def create_manual_event(
    tracked_object_processor: TrackedObjectProcessor,
    camera_config: CameraConfig,
    camera_name: str,
    label: str,
) -> str:
    # get a valid frame time for camera
    frame_time = tracked_object_processor.get_current_frame_time(camera_name)

    # create event id and start frame time
    rand_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    event_id = f"{frame_time}-{rand_id}"

    # fabricate obj_data
    obj_data = {
        "id": event_id,
        "camera": camera_name,
        "frame_time": frame_time,
        "snapshot_time": 0.0,
        "label": label,
        "top_score": 1,
        "false_positive": False,
        "start_time": frame_time,
        "end_time": None,
        "score": 1,
        "box": [],
        "area": 0,
        "ratio": 0,
        "region": [],
        "stationary": False,
        "motionless_count": 0,
        "position_changes": [],
        "current_zones": "",
        "entered_zones": "",
        "has_clip": False,
        "has_snapshot": False,
        "thumbnail": None,
    }

    # insert object into the queue
    current_obj_data = obj_data.copy()
    tracked_object_processor.event_queue.put(("start", camera_name, current_obj_data))

    # update object data an send another event
    obj_data["has_clip"] = camera_config.record.enabled
    obj_data["has_snapshot"] = True

    # Get current frame for thumb & snapshot
    (
        current_frame,
        updated_frame_time,
    ) = tracked_object_processor.get_current_frame_and_time(camera_name)

    # write jpg snapshot
    height = int(current_frame.shape[0])
    width = int(height * current_frame.shape[1] / current_frame.shape[0])

    current_frame = cv2.resize(
        current_frame, dsize=(width, height), interpolation=cv2.INTER_AREA
    )

    ret, jpg = cv2.imencode(".jpg", current_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])

    with open(
        os.path.join(CLIPS_DIR, f"{camera_name}-{event_id}.jpg"),
        "wb",
    ) as j:
        j.write(jpg.tobytes())

    # write clean snapshot if enabled
    if camera_config.snapshots.clean_copy:
        ret, png = cv2.imencode(".png", current_frame)
        png_bytes = png.tobytes()

        if png_bytes is None:
            logger.warning(f"Unable to save clean snapshot for {event_id}.")
        else:
            with open(
                os.path.join(
                    CLIPS_DIR,
                    f"{camera_name}-{event_id}-clean.png",
                ),
                "wb",
            ) as p:
                p.write(png_bytes)

    # get thumbnail
    height = 175
    width = int(height * current_frame.shape[1] / current_frame.shape[0])

    current_frame = cv2.resize(
        current_frame, dsize=(width, height), interpolation=cv2.INTER_AREA
    )

    ret, thumb = cv2.imencode(
        ".jpg", current_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 30]
    )

    obj_data["thumbnail"] = base64.b64encode(thumb).decode("utf-8")
    obj_data["snapshot_time"] = updated_frame_time

    # update event in queue
    tracked_object_processor.event_queue.put(("update", camera_name, obj_data))

    return event_id


def finish_manual_event(
    tracked_object_processor: TrackedObjectProcessor,
    event_id: str,
):
    # get associated event and data
    manual_event: Event = Event.get(Event.id == event_id)
    camera_name = manual_event.camera

    # get frame time
    frame_time = tracked_object_processor.get_current_frame_time(camera_name)

    # create obj_data
    obj_data = {
        "id": event_id,
        "end_time": frame_time,
        "has_snapshot": False,
        "has_clip": False,
    }

    # end event in queue
    tracked_object_processor.event_queue.put(("end", camera_name, obj_data))
