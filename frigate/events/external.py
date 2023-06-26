"""Handle external events created by the user."""

import base64
import datetime
import logging
import os
import random
import string
from multiprocessing.queues import Queue
from typing import Optional

import cv2
from flask import Response, current_app, jsonify, request

from frigate.config import CameraConfig, FrigateConfig
from frigate.const import CLIPS_DIR
from frigate.events.maintainer import EventTypeEnum
from frigate.util import draw_box_with_label

logger = logging.getLogger(__name__)


class ExternalEventProcessor:
    def __init__(self, config: FrigateConfig, queue: Queue) -> None:
        self.config = config
        self.queue = queue
        self.default_thumbnail = None

    def create_manual_event(
        self,
        camera: str,
        label: str,
        sub_label: Optional[str],
        duration: Optional[int],
        include_recording: bool,
        draw: dict[str, any],
        snapshot_frame: any,
    ) -> str:
        now = datetime.datetime.now().timestamp()
        camera_config = self.config.cameras.get(camera)

        # create event id and start frame time
        rand_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        event_id = f"{now}-{rand_id}"

        thumbnail = self._write_images(
            camera_config, label, event_id, draw, snapshot_frame
        )

        self.queue.put(
            (
                EventTypeEnum.api,
                "new",
                camera_config,
                {
                    "id": event_id,
                    "label": label,
                    "sub_label": sub_label,
                    "camera": camera,
                    "start_time": now,
                    "end_time": now + duration if duration is not None else None,
                    "thumbnail": thumbnail,
                    "has_clip": camera_config.record.enabled and include_recording,
                    "has_snapshot": True,
                },
            )
        )

        return event_id

    def finish_manual_event(self, event_id: str) -> None:
        """Finish external event with indeterminate duration."""
        now = datetime.datetime.now().timestamp()
        self.queue.put(
            (EventTypeEnum.api, "end", None, {"id": event_id, "end_time": now})
        )

    def _write_images(
        self,
        camera_config: CameraConfig,
        label: str,
        event_id: str,
        draw: dict[str, any],
        img_frame: any,
    ) -> str:
        # write clean snapshot if enabled
        if camera_config.snapshots.clean_copy:
            ret, png = cv2.imencode(".png", img_frame)

            if ret:
                with open(
                    os.path.join(
                        CLIPS_DIR,
                        f"{camera_config.name}-{event_id}-clean.png",
                    ),
                    "wb",
                ) as p:
                    p.write(png.tobytes())

        # write jpg snapshot with optional annotations
        if draw.get("boxes") and isinstance(draw.get("boxes"), list):
            for box in draw.get("boxes"):
                x = box["box"][0] * camera_config.detect.width
                y = box["box"][1] * camera_config.detect.height
                width = box["box"][2] * camera_config.detect.width
                height = box["box"][3] * camera_config.detect.height

                draw_box_with_label(
                    img_frame,
                    x,
                    y,
                    x + width,
                    y + height,
                    label,
                    f"{box.get('score', '-')}% {int(width * height)}",
                    thickness=2,
                    color=box.get("color", (255, 0, 0)),
                )

        ret, jpg = cv2.imencode(".jpg", img_frame)
        with open(
            os.path.join(CLIPS_DIR, f"{camera_config.name}-{event_id}.jpg"),
            "wb",
        ) as j:
            j.write(jpg.tobytes())

        # create thumbnail with max height of 175 and save
        width = int(175 * img_frame.shape[1] / img_frame.shape[0])
        thumb = cv2.resize(img_frame, dsize=(width, 175), interpolation=cv2.INTER_AREA)
        ret, jpg = cv2.imencode(".jpg", thumb)
        return base64.b64encode(jpg.tobytes()).decode("utf-8")


def create_event(camera_name: str, label: str, body: dict[str, any] = {}) -> Response:
    if not camera_name or not current_app.frigate_config.cameras.get(camera_name):
        return jsonify(
            {"success": False, "message": f"{camera_name} is not a valid camera."}, 404
        )

    if not label:
        return jsonify({"success": False, "message": f"{label} must be set."}, 404)

    try:
        frame = current_app.detected_frames_processor.get_current_frame(camera_name)

        event_id = current_app.external_processor.create_manual_event(
            camera_name,
            label,
            body.get("sub_label", None),
            body.get("duration", 30),
            body.get("include_recording", True),
            body.get("draw", {}),
            frame,
        )
    except Exception as e:
        logger.error(f"The error is {e}")
        return jsonify(
            {"success": False, "message": f"An unknown error occurred: {e}"}, 404
        )

    return jsonify(
        {
            "success": True,
            "message": "Successfully created event.",
            "event_id": event_id,
        },
        200,
    )


def end_event(event_id: str, body: dict[str, any] = {}) -> Response:
    try:
        end_time = body.get("end_time", datetime.now().timestamp())
        current_app.external_processor.finish_manual_event(event_id, end_time)
    except Exception:
        return jsonify(
            {"success": False, "message": f"{event_id} must be set and valid."}, 404
        )

    return jsonify({"success": True, "message": "Event successfully ended."}, 200)
