"""Maintains state of camera."""

import datetime
import logging
import os
import threading
from collections import defaultdict
from typing import Callable

import cv2
import numpy as np

from frigate.config import (
    FrigateConfig,
    ZoomingModeEnum,
)
from frigate.const import CLIPS_DIR, THUMB_DIR
from frigate.ptz.autotrack import PtzAutoTrackerThread
from frigate.track.tracked_object import TrackedObject
from frigate.util.image import (
    SharedMemoryFrameManager,
    draw_box_with_label,
    draw_timestamp,
    is_better_thumbnail,
    is_label_printable,
)

logger = logging.getLogger(__name__)


class CameraState:
    def __init__(
        self,
        name,
        config: FrigateConfig,
        frame_manager: SharedMemoryFrameManager,
        ptz_autotracker_thread: PtzAutoTrackerThread,
    ):
        self.name = name
        self.config = config
        self.camera_config = config.cameras[name]
        self.frame_manager = frame_manager
        self.best_objects: dict[str, TrackedObject] = {}
        self.tracked_objects: dict[str, TrackedObject] = {}
        self.frame_cache = {}
        self.zone_objects = defaultdict(list)
        self._current_frame = np.zeros(self.camera_config.frame_shape_yuv, np.uint8)
        self.current_frame_lock = threading.Lock()
        self.current_frame_time = 0.0
        self.motion_boxes = []
        self.regions = []
        self.previous_frame_id = None
        self.callbacks = defaultdict(list)
        self.ptz_autotracker_thread = ptz_autotracker_thread
        self.prev_enabled = self.camera_config.enabled

    def get_current_frame(self, draw_options={}):
        with self.current_frame_lock:
            frame_copy = np.copy(self._current_frame)
            frame_time = self.current_frame_time
            tracked_objects = {k: v.to_dict() for k, v in self.tracked_objects.items()}
            motion_boxes = self.motion_boxes.copy()
            regions = self.regions.copy()

        frame_copy = cv2.cvtColor(frame_copy, cv2.COLOR_YUV2BGR_I420)
        # draw on the frame
        if draw_options.get("mask"):
            mask_overlay = np.where(self.camera_config.motion.mask == [0])
            frame_copy[mask_overlay] = [0, 0, 0]

        if draw_options.get("bounding_boxes"):
            # draw the bounding boxes on the frame
            for obj in tracked_objects.values():
                if obj["frame_time"] == frame_time:
                    if obj["stationary"]:
                        color = (220, 220, 220)
                        thickness = 1
                    else:
                        thickness = 2
                        color = self.config.model.colormap[obj["label"]]
                else:
                    thickness = 1
                    color = (255, 0, 0)

                # draw thicker box around ptz autotracked object
                if (
                    self.camera_config.onvif.autotracking.enabled
                    and self.ptz_autotracker_thread.ptz_autotracker.autotracker_init[
                        self.name
                    ]
                    and self.ptz_autotracker_thread.ptz_autotracker.tracked_object[
                        self.name
                    ]
                    is not None
                    and obj["id"]
                    == self.ptz_autotracker_thread.ptz_autotracker.tracked_object[
                        self.name
                    ].obj_data["id"]
                    and obj["frame_time"] == frame_time
                ):
                    thickness = 5
                    color = self.config.model.colormap[obj["label"]]

                    # debug autotracking zooming - show the zoom factor box
                    if (
                        self.camera_config.onvif.autotracking.zooming
                        != ZoomingModeEnum.disabled
                    ):
                        max_target_box = self.ptz_autotracker_thread.ptz_autotracker.tracked_object_metrics[
                            self.name
                        ]["max_target_box"]
                        side_length = max_target_box * (
                            max(
                                self.camera_config.detect.width,
                                self.camera_config.detect.height,
                            )
                        )

                        centroid_x = (obj["box"][0] + obj["box"][2]) // 2
                        centroid_y = (obj["box"][1] + obj["box"][3]) // 2
                        top_left = (
                            int(centroid_x - side_length // 2),
                            int(centroid_y - side_length // 2),
                        )
                        bottom_right = (
                            int(centroid_x + side_length // 2),
                            int(centroid_y + side_length // 2),
                        )
                        cv2.rectangle(
                            frame_copy,
                            top_left,
                            bottom_right,
                            (255, 255, 0),
                            2,
                        )

                # draw the bounding boxes on the frame
                box = obj["box"]
                text = (
                    obj["sub_label"][0]
                    if (
                        obj.get("sub_label") and is_label_printable(obj["sub_label"][0])
                    )
                    else obj.get("recognized_license_plate", [None])[0]
                    if (
                        obj.get("recognized_license_plate")
                        and obj["recognized_license_plate"][0]
                    )
                    else obj["label"]
                )
                draw_box_with_label(
                    frame_copy,
                    box[0],
                    box[1],
                    box[2],
                    box[3],
                    text,
                    f"{obj['score']:.0%} {int(obj['area'])}"
                    + (
                        f" {float(obj['current_estimated_speed']):.1f}"
                        if obj["current_estimated_speed"] != 0
                        else ""
                    ),
                    thickness=thickness,
                    color=color,
                )

                # draw any attributes
                for attribute in obj["current_attributes"]:
                    box = attribute["box"]
                    draw_box_with_label(
                        frame_copy,
                        box[0],
                        box[1],
                        box[2],
                        box[3],
                        attribute["label"],
                        f"{attribute['score']:.0%}",
                        thickness=thickness,
                        color=color,
                    )

        if draw_options.get("regions"):
            for region in regions:
                cv2.rectangle(
                    frame_copy,
                    (region[0], region[1]),
                    (region[2], region[3]),
                    (0, 255, 0),
                    2,
                )

        if draw_options.get("zones"):
            for name, zone in self.camera_config.zones.items():
                thickness = (
                    8
                    if any(
                        name in obj["current_zones"] for obj in tracked_objects.values()
                    )
                    else 2
                )
                cv2.drawContours(frame_copy, [zone.contour], -1, zone.color, thickness)

        if draw_options.get("motion_boxes"):
            for m_box in motion_boxes:
                cv2.rectangle(
                    frame_copy,
                    (m_box[0], m_box[1]),
                    (m_box[2], m_box[3]),
                    (0, 0, 255),
                    2,
                )

        if draw_options.get("timestamp"):
            color = self.camera_config.timestamp_style.color
            draw_timestamp(
                frame_copy,
                frame_time,
                self.camera_config.timestamp_style.format,
                font_effect=self.camera_config.timestamp_style.effect,
                font_thickness=self.camera_config.timestamp_style.thickness,
                font_color=(color.blue, color.green, color.red),
                position=self.camera_config.timestamp_style.position,
            )

        return frame_copy

    def finished(self, obj_id):
        del self.tracked_objects[obj_id]

    def on(self, event_type: str, callback: Callable[[dict], None]):
        self.callbacks[event_type].append(callback)

    def update(
        self,
        frame_name: str,
        frame_time: float,
        current_detections: dict[str, dict[str, any]],
        motion_boxes: list[tuple[int, int, int, int]],
        regions: list[tuple[int, int, int, int]],
    ):
        current_frame = self.frame_manager.get(
            frame_name, self.camera_config.frame_shape_yuv
        )

        tracked_objects = self.tracked_objects.copy()
        current_ids = set(current_detections.keys())
        previous_ids = set(tracked_objects.keys())
        removed_ids = previous_ids.difference(current_ids)
        new_ids = current_ids.difference(previous_ids)
        updated_ids = current_ids.intersection(previous_ids)

        for id in new_ids:
            new_obj = tracked_objects[id] = TrackedObject(
                self.config.model,
                self.camera_config,
                self.config.ui,
                self.frame_cache,
                current_detections[id],
            )

            # call event handlers
            for c in self.callbacks["start"]:
                c(self.name, new_obj, frame_name)

        for id in updated_ids:
            updated_obj = tracked_objects[id]
            thumb_update, significant_update, autotracker_update = updated_obj.update(
                frame_time, current_detections[id], current_frame is not None
            )

            if autotracker_update or significant_update:
                for c in self.callbacks["autotrack"]:
                    c(self.name, updated_obj, frame_name)

            if thumb_update and current_frame is not None:
                # ensure this frame is stored in the cache
                if (
                    updated_obj.thumbnail_data["frame_time"] == frame_time
                    and frame_time not in self.frame_cache
                ):
                    self.frame_cache[frame_time] = np.copy(current_frame)

                updated_obj.last_updated = frame_time

            # if it has been more than 5 seconds since the last thumb update
            # and the last update is greater than the last publish or
            # the object has changed significantly
            if (
                frame_time - updated_obj.last_published > 5
                and updated_obj.last_updated > updated_obj.last_published
            ) or significant_update:
                # call event handlers
                for c in self.callbacks["update"]:
                    c(self.name, updated_obj, frame_name)
                updated_obj.last_published = frame_time

        for id in removed_ids:
            # publish events to mqtt
            removed_obj = tracked_objects[id]
            if "end_time" not in removed_obj.obj_data:
                removed_obj.obj_data["end_time"] = frame_time
                for c in self.callbacks["end"]:
                    c(self.name, removed_obj, frame_name)

        # TODO: can i switch to looking this up and only changing when an event ends?
        # maintain best objects
        camera_activity: dict[str, list[any]] = {
            "enabled": True,
            "motion": len(motion_boxes) > 0,
            "objects": [],
        }

        for obj in tracked_objects.values():
            object_type = obj.obj_data["label"]
            active = obj.is_active()

            if not obj.false_positive:
                label = object_type
                sub_label = None

                if obj.obj_data.get("sub_label"):
                    if (
                        obj.obj_data.get("sub_label")[0]
                        in self.config.model.all_attributes
                    ):
                        label = obj.obj_data["sub_label"][0]
                    else:
                        label = f"{object_type}-verified"
                        sub_label = obj.obj_data["sub_label"][0]

                camera_activity["objects"].append(
                    {
                        "id": obj.obj_data["id"],
                        "label": label,
                        "stationary": not active,
                        "area": obj.obj_data["area"],
                        "ratio": obj.obj_data["ratio"],
                        "score": obj.obj_data["score"],
                        "sub_label": sub_label,
                        "current_zones": obj.current_zones,
                    }
                )

            # if we don't have access to the current frame or
            # if the object's thumbnail is not from the current frame, skip
            if (
                current_frame is None
                or obj.thumbnail_data is None
                or obj.false_positive
                or obj.thumbnail_data["frame_time"] != frame_time
            ):
                continue

            if object_type in self.best_objects:
                current_best = self.best_objects[object_type]
                now = datetime.datetime.now().timestamp()
                # if the object is a higher score than the current best score
                # or the current object is older than desired, use the new object
                if (
                    is_better_thumbnail(
                        object_type,
                        current_best.thumbnail_data,
                        obj.thumbnail_data,
                        self.camera_config.frame_shape,
                    )
                    or (now - current_best.thumbnail_data["frame_time"])
                    > self.camera_config.best_image_timeout
                ):
                    self.best_objects[object_type] = obj
                    for c in self.callbacks["snapshot"]:
                        c(self.name, self.best_objects[object_type], frame_name)
            else:
                self.best_objects[object_type] = obj
                for c in self.callbacks["snapshot"]:
                    c(self.name, self.best_objects[object_type], frame_name)

        for c in self.callbacks["camera_activity"]:
            c(self.name, camera_activity)

        # cleanup thumbnail frame cache
        current_thumb_frames = {
            obj.thumbnail_data["frame_time"]
            for obj in tracked_objects.values()
            if not obj.false_positive and obj.thumbnail_data is not None
        }
        current_best_frames = {
            obj.thumbnail_data["frame_time"] for obj in self.best_objects.values()
        }
        thumb_frames_to_delete = [
            t
            for t in self.frame_cache.keys()
            if t not in current_thumb_frames and t not in current_best_frames
        ]
        for t in thumb_frames_to_delete:
            del self.frame_cache[t]

        with self.current_frame_lock:
            self.tracked_objects = tracked_objects
            self.motion_boxes = motion_boxes
            self.regions = regions

            if current_frame is not None:
                self.current_frame_time = frame_time
                self._current_frame = np.copy(current_frame)

                if self.previous_frame_id is not None:
                    self.frame_manager.close(self.previous_frame_id)

            self.previous_frame_id = frame_name

    def save_manual_event_image(
        self, event_id: str, label: str, draw: dict[str, list[dict]]
    ) -> None:
        img_frame = self.get_current_frame()

        # write clean snapshot if enabled
        if self.camera_config.snapshots.clean_copy:
            ret, png = cv2.imencode(".png", img_frame)

            if ret:
                with open(
                    os.path.join(
                        CLIPS_DIR,
                        f"{self.camera_config.name}-{event_id}-clean.png",
                    ),
                    "wb",
                ) as p:
                    p.write(png.tobytes())

        # write jpg snapshot with optional annotations
        if draw.get("boxes") and isinstance(draw.get("boxes"), list):
            for box in draw.get("boxes"):
                x = int(box["box"][0] * self.camera_config.detect.width)
                y = int(box["box"][1] * self.camera_config.detect.height)
                width = int(box["box"][2] * self.camera_config.detect.width)
                height = int(box["box"][3] * self.camera_config.detect.height)

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
            os.path.join(CLIPS_DIR, f"{self.camera_config.name}-{event_id}.jpg"),
            "wb",
        ) as j:
            j.write(jpg.tobytes())

        # create thumbnail with max height of 175 and save
        width = int(175 * img_frame.shape[1] / img_frame.shape[0])
        thumb = cv2.resize(img_frame, dsize=(width, 175), interpolation=cv2.INTER_AREA)
        cv2.imwrite(
            os.path.join(THUMB_DIR, self.camera_config.name, f"{event_id}.webp"), thumb
        )

    def shutdown(self) -> None:
        for obj in self.tracked_objects.values():
            if not obj.obj_data.get("end_time"):
                obj.write_thumbnail_to_disk()
