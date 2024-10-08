import base64
import datetime
import json
import logging
import os
import queue
import threading
from collections import Counter, defaultdict
from multiprocessing.synchronize import Event as MpEvent
from statistics import median
from typing import Callable

import cv2
import numpy as np

from frigate.comms.detections_updater import DetectionPublisher, DetectionTypeEnum
from frigate.comms.dispatcher import Dispatcher
from frigate.comms.events_updater import EventEndSubscriber, EventUpdatePublisher
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import (
    CameraConfig,
    FrigateConfig,
    MqttConfig,
    RecordConfig,
    SnapshotsConfig,
    ZoomingModeEnum,
)
from frigate.const import CLIPS_DIR, UPDATE_CAMERA_ACTIVITY
from frigate.events.types import EventStateEnum, EventTypeEnum
from frigate.ptz.autotrack import PtzAutoTrackerThread
from frigate.util.image import (
    SharedMemoryFrameManager,
    area,
    calculate_region,
    draw_box_with_label,
    draw_timestamp,
    is_label_printable,
)

logger = logging.getLogger(__name__)


def on_edge(box, frame_shape):
    if (
        box[0] == 0
        or box[1] == 0
        or box[2] == frame_shape[1] - 1
        or box[3] == frame_shape[0] - 1
    ):
        return True


def has_better_attr(current_thumb, new_obj, attr_label) -> bool:
    max_new_attr = max(
        [0]
        + [area(a["box"]) for a in new_obj["attributes"] if a["label"] == attr_label]
    )
    max_current_attr = max(
        [0]
        + [
            area(a["box"])
            for a in current_thumb["attributes"]
            if a["label"] == attr_label
        ]
    )

    # if the thumb has a higher scoring attr
    return max_new_attr > max_current_attr


def is_better_thumbnail(label, current_thumb, new_obj, frame_shape) -> bool:
    # larger is better
    # cutoff images are less ideal, but they should also be smaller?
    # better scores are obviously better too

    # check face on person
    if label == "person":
        if has_better_attr(current_thumb, new_obj, "face"):
            return True
        # if the current thumb has a face attr, dont update unless it gets better
        if any([a["label"] == "face" for a in current_thumb["attributes"]]):
            return False

    # check license_plate on car
    if label == "car":
        if has_better_attr(current_thumb, new_obj, "license_plate"):
            return True
        # if the current thumb has a license_plate attr, dont update unless it gets better
        if any([a["label"] == "license_plate" for a in current_thumb["attributes"]]):
            return False

    # if the new_thumb is on an edge, and the current thumb is not
    if on_edge(new_obj["box"], frame_shape) and not on_edge(
        current_thumb["box"], frame_shape
    ):
        return False

    # if the score is better by more than 5%
    if new_obj["score"] > current_thumb["score"] + 0.05:
        return True

    # if the area is 10% larger
    if new_obj["area"] > current_thumb["area"] * 1.1:
        return True

    return False


class TrackedObject:
    def __init__(
        self,
        camera,
        colormap,
        camera_config: CameraConfig,
        frame_cache,
        obj_data: dict[str, any],
    ):
        # set the score history then remove as it is not part of object state
        self.score_history = obj_data["score_history"]
        del obj_data["score_history"]

        self.obj_data = obj_data
        self.camera = camera
        self.colormap = colormap
        self.camera_config = camera_config
        self.frame_cache = frame_cache
        self.zone_presence: dict[str, int] = {}
        self.zone_loitering: dict[str, int] = {}
        self.current_zones = []
        self.entered_zones = []
        self.attributes = defaultdict(float)
        self.false_positive = True
        self.has_clip = False
        self.has_snapshot = False
        self.top_score = self.computed_score = 0.0
        self.thumbnail_data = None
        self.last_updated = 0
        self.last_published = 0
        self.frame = None
        self.active = True
        self.pending_loitering = False
        self.previous = self.to_dict()

    def _is_false_positive(self):
        # once a true positive, always a true positive
        if not self.false_positive:
            return False

        threshold = self.camera_config.objects.filters[self.obj_data["label"]].threshold
        return self.computed_score < threshold

    def compute_score(self):
        """get median of scores for object."""
        return median(self.score_history)

    def update(self, current_frame_time: float, obj_data, has_valid_frame: bool):
        thumb_update = False
        significant_change = False
        autotracker_update = False
        # if the object is not in the current frame, add a 0.0 to the score history
        if obj_data["frame_time"] != current_frame_time:
            self.score_history.append(0.0)
        else:
            self.score_history.append(obj_data["score"])

        # only keep the last 10 scores
        if len(self.score_history) > 10:
            self.score_history = self.score_history[-10:]

        # calculate if this is a false positive
        self.computed_score = self.compute_score()
        if self.computed_score > self.top_score:
            self.top_score = self.computed_score
        self.false_positive = self._is_false_positive()
        self.active = self.is_active()

        if not self.false_positive and has_valid_frame:
            # determine if this frame is a better thumbnail
            if self.thumbnail_data is None or is_better_thumbnail(
                self.obj_data["label"],
                self.thumbnail_data,
                obj_data,
                self.camera_config.frame_shape,
            ):
                self.thumbnail_data = {
                    "frame_time": current_frame_time,
                    "box": obj_data["box"],
                    "area": obj_data["area"],
                    "region": obj_data["region"],
                    "score": obj_data["score"],
                    "attributes": obj_data["attributes"],
                }
                thumb_update = True

        # check zones
        current_zones = []
        bottom_center = (obj_data["centroid"][0], obj_data["box"][3])
        in_loitering_zone = False

        # check each zone
        for name, zone in self.camera_config.zones.items():
            # if the zone is not for this object type, skip
            if len(zone.objects) > 0 and obj_data["label"] not in zone.objects:
                continue
            contour = zone.contour
            zone_score = self.zone_presence.get(name, 0) + 1
            # check if the object is in the zone
            if cv2.pointPolygonTest(contour, bottom_center, False) >= 0:
                # if the object passed the filters once, dont apply again
                if name in self.current_zones or not zone_filtered(self, zone.filters):
                    # an object is only considered present in a zone if it has a zone inertia of 3+
                    if zone_score >= zone.inertia:
                        # if the zone has loitering time, update loitering status
                        if zone.loitering_time > 0:
                            in_loitering_zone = True

                        loitering_score = self.zone_loitering.get(name, 0) + 1

                        # loitering time is configured as seconds, convert to count of frames
                        if loitering_score >= (
                            self.camera_config.zones[name].loitering_time
                            * self.camera_config.detect.fps
                        ):
                            current_zones.append(name)

                            if name not in self.entered_zones:
                                self.entered_zones.append(name)
                        else:
                            self.zone_loitering[name] = loitering_score
                    else:
                        self.zone_presence[name] = zone_score
            else:
                # once an object has a zone inertia of 3+ it is not checked anymore
                if 0 < zone_score < zone.inertia:
                    self.zone_presence[name] = zone_score - 1

        # update loitering status
        self.pending_loitering = in_loitering_zone

        # maintain attributes
        for attr in obj_data["attributes"]:
            if self.attributes[attr["label"]] < attr["score"]:
                self.attributes[attr["label"]] = attr["score"]

        # populate the sub_label for object with highest scoring logo
        if self.obj_data["label"] in ["car", "package", "person"]:
            recognized_logos = {
                k: self.attributes[k]
                for k in ["ups", "fedex", "amazon"]
                if k in self.attributes
            }
            if len(recognized_logos) > 0:
                max_logo = max(recognized_logos, key=recognized_logos.get)

                # don't overwrite sub label if it is already set
                if (
                    self.obj_data.get("sub_label") is None
                    or self.obj_data["sub_label"][0] == max_logo
                ):
                    self.obj_data["sub_label"] = (max_logo, recognized_logos[max_logo])

        # check for significant change
        if not self.false_positive:
            # if the zones changed, signal an update
            if set(self.current_zones) != set(current_zones):
                significant_change = True

            # if the position changed, signal an update
            if self.obj_data["position_changes"] != obj_data["position_changes"]:
                significant_change = True

            if self.obj_data["attributes"] != obj_data["attributes"]:
                significant_change = True

            # if the state changed between stationary and active
            if self.previous["active"] != self.active:
                significant_change = True

            # update at least once per minute
            if self.obj_data["frame_time"] - self.previous["frame_time"] > 60:
                significant_change = True

            # update autotrack at most 3 objects per second
            if self.obj_data["frame_time"] - self.previous["frame_time"] >= (1 / 3):
                autotracker_update = True

        self.obj_data.update(obj_data)
        self.current_zones = current_zones
        return (thumb_update, significant_change, autotracker_update)

    def to_dict(self, include_thumbnail: bool = False):
        event = {
            "id": self.obj_data["id"],
            "camera": self.camera,
            "frame_time": self.obj_data["frame_time"],
            "snapshot": self.thumbnail_data,
            "label": self.obj_data["label"],
            "sub_label": self.obj_data.get("sub_label"),
            "top_score": self.top_score,
            "false_positive": self.false_positive,
            "start_time": self.obj_data["start_time"],
            "end_time": self.obj_data.get("end_time", None),
            "score": self.obj_data["score"],
            "box": self.obj_data["box"],
            "area": self.obj_data["area"],
            "ratio": self.obj_data["ratio"],
            "region": self.obj_data["region"],
            "active": self.active,
            "stationary": not self.active,
            "motionless_count": self.obj_data["motionless_count"],
            "position_changes": self.obj_data["position_changes"],
            "current_zones": self.current_zones.copy(),
            "entered_zones": self.entered_zones.copy(),
            "has_clip": self.has_clip,
            "has_snapshot": self.has_snapshot,
            "attributes": self.attributes,
            "current_attributes": self.obj_data["attributes"],
            "pending_loitering": self.pending_loitering,
        }

        if include_thumbnail:
            event["thumbnail"] = base64.b64encode(self.get_thumbnail()).decode("utf-8")

        return event

    def is_active(self):
        return not self.is_stationary()

    def is_stationary(self):
        return (
            self.obj_data["motionless_count"]
            > self.camera_config.detect.stationary.threshold
        )

    def get_thumbnail(self):
        if (
            self.thumbnail_data is None
            or self.thumbnail_data["frame_time"] not in self.frame_cache
        ):
            ret, jpg = cv2.imencode(".jpg", np.zeros((175, 175, 3), np.uint8))

        jpg_bytes = self.get_jpg_bytes(
            timestamp=False, bounding_box=False, crop=True, height=175
        )

        if jpg_bytes:
            return jpg_bytes
        else:
            ret, jpg = cv2.imencode(".jpg", np.zeros((175, 175, 3), np.uint8))
            return jpg.tobytes()

    def get_clean_png(self):
        if self.thumbnail_data is None:
            return None

        try:
            best_frame = cv2.cvtColor(
                self.frame_cache[self.thumbnail_data["frame_time"]],
                cv2.COLOR_YUV2BGR_I420,
            )
        except KeyError:
            logger.warning(
                f"Unable to create clean png because frame {self.thumbnail_data['frame_time']} is not in the cache"
            )
            return None

        ret, png = cv2.imencode(".png", best_frame)
        if ret:
            return png.tobytes()
        else:
            return None

    def get_jpg_bytes(
        self, timestamp=False, bounding_box=False, crop=False, height=None, quality=70
    ):
        if self.thumbnail_data is None:
            return None

        try:
            best_frame = cv2.cvtColor(
                self.frame_cache[self.thumbnail_data["frame_time"]],
                cv2.COLOR_YUV2BGR_I420,
            )
        except KeyError:
            logger.warning(
                f"Unable to create jpg because frame {self.thumbnail_data['frame_time']} is not in the cache"
            )
            return None

        if bounding_box:
            thickness = 2
            color = self.colormap[self.obj_data["label"]]

            # draw the bounding boxes on the frame
            box = self.thumbnail_data["box"]
            draw_box_with_label(
                best_frame,
                box[0],
                box[1],
                box[2],
                box[3],
                self.obj_data["label"],
                f"{int(self.thumbnail_data['score']*100)}% {int(self.thumbnail_data['area'])}",
                thickness=thickness,
                color=color,
            )

            # draw any attributes
            for attribute in self.thumbnail_data["attributes"]:
                box = attribute["box"]
                draw_box_with_label(
                    best_frame,
                    box[0],
                    box[1],
                    box[2],
                    box[3],
                    attribute["label"],
                    f"{attribute['score']:.0%}",
                    thickness=thickness,
                    color=color,
                )

        if crop:
            box = self.thumbnail_data["box"]
            box_size = 300
            region = calculate_region(
                best_frame.shape,
                box[0],
                box[1],
                box[2],
                box[3],
                box_size,
                multiplier=1.1,
            )
            best_frame = best_frame[region[1] : region[3], region[0] : region[2]]

        if height:
            width = int(height * best_frame.shape[1] / best_frame.shape[0])
            best_frame = cv2.resize(
                best_frame, dsize=(width, height), interpolation=cv2.INTER_AREA
            )
        if timestamp:
            color = self.camera_config.timestamp_style.color
            draw_timestamp(
                best_frame,
                self.thumbnail_data["frame_time"],
                self.camera_config.timestamp_style.format,
                font_effect=self.camera_config.timestamp_style.effect,
                font_thickness=self.camera_config.timestamp_style.thickness,
                font_color=(color.blue, color.green, color.red),
                position=self.camera_config.timestamp_style.position,
            )

        ret, jpg = cv2.imencode(
            ".jpg", best_frame, [int(cv2.IMWRITE_JPEG_QUALITY), quality]
        )
        if ret:
            return jpg.tobytes()
        else:
            return None


def zone_filtered(obj: TrackedObject, object_config):
    object_name = obj.obj_data["label"]

    if object_name in object_config:
        obj_settings = object_config[object_name]

        # if the min area is larger than the
        # detected object, don't add it to detected objects
        if obj_settings.min_area > obj.obj_data["area"]:
            return True

        # if the detected object is larger than the
        # max area, don't add it to detected objects
        if obj_settings.max_area < obj.obj_data["area"]:
            return True

        # if the score is lower than the threshold, skip
        if obj_settings.threshold > obj.computed_score:
            return True

        # if the object is not proportionally wide enough
        if obj_settings.min_ratio > obj.obj_data["ratio"]:
            return True

        # if the object is proportionally too wide
        if obj_settings.max_ratio < obj.obj_data["ratio"]:
            return True

    return False


# Maintains the state of a camera
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
        self.object_counts = defaultdict(int)
        self.active_object_counts = defaultdict(int)
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
                    obj["label"]
                    if (
                        not obj.get("sub_label")
                        or not is_label_printable(obj["sub_label"][0])
                    )
                    else obj["sub_label"][0]
                )
                draw_box_with_label(
                    frame_copy,
                    box[0],
                    box[1],
                    box[2],
                    box[3],
                    text,
                    f"{obj['score']:.0%} {int(obj['area'])}",
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

    def update(self, frame_time, current_detections, motion_boxes, regions):
        # get the new frame
        frame_id = f"{self.name}{frame_time}"

        current_frame = self.frame_manager.get(
            frame_id, self.camera_config.frame_shape_yuv
        )

        if current_frame is None:
            logger.debug(f"Failed to get frame {frame_id} from SHM")

        tracked_objects = self.tracked_objects.copy()
        current_ids = set(current_detections.keys())
        previous_ids = set(tracked_objects.keys())
        removed_ids = previous_ids.difference(current_ids)
        new_ids = current_ids.difference(previous_ids)
        updated_ids = current_ids.intersection(previous_ids)

        for id in new_ids:
            new_obj = tracked_objects[id] = TrackedObject(
                self.name,
                self.config.model.colormap,
                self.camera_config,
                self.frame_cache,
                current_detections[id],
            )

            # call event handlers
            for c in self.callbacks["start"]:
                c(self.name, new_obj, frame_time)

        for id in updated_ids:
            updated_obj = tracked_objects[id]
            thumb_update, significant_update, autotracker_update = updated_obj.update(
                frame_time, current_detections[id], current_frame is not None
            )

            if autotracker_update or significant_update:
                for c in self.callbacks["autotrack"]:
                    c(self.name, updated_obj, frame_time)

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
                    c(self.name, updated_obj, frame_time)
                updated_obj.last_published = frame_time

        for id in removed_ids:
            # publish events to mqtt
            removed_obj = tracked_objects[id]
            if "end_time" not in removed_obj.obj_data:
                removed_obj.obj_data["end_time"] = frame_time
                for c in self.callbacks["end"]:
                    c(self.name, removed_obj, frame_time)

        # TODO: can i switch to looking this up and only changing when an event ends?
        # maintain best objects
        camera_activity: dict[str, list[any]] = {
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
                    }
                )

            # if we don't have access to the current frame or
            # if the object's thumbnail is not from the current frame, skip
            if (
                current_frame is None
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
                        c(self.name, self.best_objects[object_type], frame_time)
            else:
                self.best_objects[object_type] = obj
                for c in self.callbacks["snapshot"]:
                    c(self.name, self.best_objects[object_type], frame_time)

        for c in self.callbacks["camera_activity"]:
            c(self.name, camera_activity)

        # update overall camera state for each object type
        obj_counter = Counter(
            obj.obj_data["label"]
            for obj in tracked_objects.values()
            if not obj.false_positive
        )

        active_obj_counter = Counter(
            obj.obj_data["label"]
            for obj in tracked_objects.values()
            if not obj.false_positive and obj.active
        )

        # keep track of all labels detected for this camera
        total_label_count = 0
        total_active_label_count = 0

        # report on all detected objects
        for obj_name, count in obj_counter.items():
            total_label_count += count

            if count != self.object_counts[obj_name]:
                self.object_counts[obj_name] = count
                for c in self.callbacks["object_status"]:
                    c(self.name, obj_name, count)

        # update the active count on all detected objects
        # To ensure we emit 0's if all objects are stationary, we need to loop
        # over the set of all objects, not just active ones.
        for obj_name in set(obj_counter):
            count = active_obj_counter[obj_name]
            total_active_label_count += count

            if count != self.active_object_counts[obj_name]:
                self.active_object_counts[obj_name] = count
                for c in self.callbacks["active_object_status"]:
                    c(self.name, obj_name, count)

        # publish for all labels detected for this camera
        if total_label_count != self.object_counts.get("all"):
            self.object_counts["all"] = total_label_count
            for c in self.callbacks["object_status"]:
                c(self.name, "all", total_label_count)

        # publish active label counts for this camera
        if total_active_label_count != self.active_object_counts.get("all"):
            self.active_object_counts["all"] = total_active_label_count
            for c in self.callbacks["active_object_status"]:
                c(self.name, "all", total_active_label_count)

        # expire any objects that are >0 and no longer detected
        expired_objects = [
            obj_name
            for obj_name, count in self.object_counts.items()
            if count > 0 and obj_name not in obj_counter
        ]
        for obj_name in expired_objects:
            # Ignore the artificial all label
            if obj_name == "all":
                continue

            self.object_counts[obj_name] = 0
            for c in self.callbacks["object_status"]:
                c(self.name, obj_name, 0)
            # Only publish if the object was previously active.
            if self.active_object_counts[obj_name] > 0:
                for c in self.callbacks["active_object_status"]:
                    c(self.name, obj_name, 0)
                self.active_object_counts[obj_name] = 0
            for c in self.callbacks["snapshot"]:
                c(self.name, self.best_objects[obj_name], frame_time)

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
                self._current_frame = current_frame

                if self.previous_frame_id is not None:
                    self.frame_manager.close(self.previous_frame_id)

            self.previous_frame_id = frame_id


class TrackedObjectProcessor(threading.Thread):
    def __init__(
        self,
        config: FrigateConfig,
        dispatcher: Dispatcher,
        tracked_objects_queue,
        ptz_autotracker_thread,
        stop_event,
    ):
        super().__init__(name="detected_frames_processor")
        self.config = config
        self.dispatcher = dispatcher
        self.tracked_objects_queue = tracked_objects_queue
        self.stop_event: MpEvent = stop_event
        self.camera_states: dict[str, CameraState] = {}
        self.frame_manager = SharedMemoryFrameManager()
        self.last_motion_detected: dict[str, float] = {}
        self.ptz_autotracker_thread = ptz_autotracker_thread

        self.requestor = InterProcessRequestor()
        self.detection_publisher = DetectionPublisher(DetectionTypeEnum.video)
        self.event_sender = EventUpdatePublisher()
        self.event_end_subscriber = EventEndSubscriber()

        self.camera_activity: dict[str, dict[str, any]] = {}

        # {
        #   'zone_name': {
        #       'person': {
        #           'camera_1': 2,
        #           'camera_2': 1
        #       }
        #   }
        # }
        self.zone_data = defaultdict(lambda: defaultdict(dict))
        self.active_zone_data = defaultdict(lambda: defaultdict(dict))

        def start(camera, obj: TrackedObject, current_frame_time):
            self.event_sender.publish(
                (
                    EventTypeEnum.tracked_object,
                    EventStateEnum.start,
                    camera,
                    obj.to_dict(),
                )
            )

        def update(camera, obj: TrackedObject, current_frame_time):
            obj.has_snapshot = self.should_save_snapshot(camera, obj)
            obj.has_clip = self.should_retain_recording(camera, obj)
            after = obj.to_dict()
            message = {
                "before": obj.previous,
                "after": after,
                "type": "new" if obj.previous["false_positive"] else "update",
            }
            self.dispatcher.publish("events", json.dumps(message), retain=False)
            obj.previous = after
            self.event_sender.publish(
                (
                    EventTypeEnum.tracked_object,
                    EventStateEnum.update,
                    camera,
                    obj.to_dict(include_thumbnail=True),
                )
            )

        def autotrack(camera, obj: TrackedObject, current_frame_time):
            self.ptz_autotracker_thread.ptz_autotracker.autotrack_object(camera, obj)

        def end(camera, obj: TrackedObject, current_frame_time):
            # populate has_snapshot
            obj.has_snapshot = self.should_save_snapshot(camera, obj)
            obj.has_clip = self.should_retain_recording(camera, obj)

            # write the snapshot to disk
            if obj.has_snapshot:
                snapshot_config: SnapshotsConfig = self.config.cameras[camera].snapshots
                jpg_bytes = obj.get_jpg_bytes(
                    timestamp=snapshot_config.timestamp,
                    bounding_box=snapshot_config.bounding_box,
                    crop=snapshot_config.crop,
                    height=snapshot_config.height,
                    quality=snapshot_config.quality,
                )
                if jpg_bytes is None:
                    logger.warning(f"Unable to save snapshot for {obj.obj_data['id']}.")
                else:
                    with open(
                        os.path.join(CLIPS_DIR, f"{camera}-{obj.obj_data['id']}.jpg"),
                        "wb",
                    ) as j:
                        j.write(jpg_bytes)

                # write clean snapshot if enabled
                if snapshot_config.clean_copy:
                    png_bytes = obj.get_clean_png()
                    if png_bytes is None:
                        logger.warning(
                            f"Unable to save clean snapshot for {obj.obj_data['id']}."
                        )
                    else:
                        with open(
                            os.path.join(
                                CLIPS_DIR,
                                f"{camera}-{obj.obj_data['id']}-clean.png",
                            ),
                            "wb",
                        ) as p:
                            p.write(png_bytes)

            if not obj.false_positive:
                message = {
                    "before": obj.previous,
                    "after": obj.to_dict(),
                    "type": "end",
                }
                self.dispatcher.publish("events", json.dumps(message), retain=False)
                self.ptz_autotracker_thread.ptz_autotracker.end_object(camera, obj)

            self.event_sender.publish(
                (
                    EventTypeEnum.tracked_object,
                    EventStateEnum.end,
                    camera,
                    obj.to_dict(include_thumbnail=True),
                )
            )

        def snapshot(camera, obj: TrackedObject, current_frame_time):
            mqtt_config: MqttConfig = self.config.cameras[camera].mqtt
            if mqtt_config.enabled and self.should_mqtt_snapshot(camera, obj):
                jpg_bytes = obj.get_jpg_bytes(
                    timestamp=mqtt_config.timestamp,
                    bounding_box=mqtt_config.bounding_box,
                    crop=mqtt_config.crop,
                    height=mqtt_config.height,
                    quality=mqtt_config.quality,
                )

                if jpg_bytes is None:
                    logger.warning(
                        f"Unable to send mqtt snapshot for {obj.obj_data['id']}."
                    )
                else:
                    self.dispatcher.publish(
                        f"{camera}/{obj.obj_data['label']}/snapshot",
                        jpg_bytes,
                        retain=True,
                    )

        def object_status(camera, object_name, status):
            self.dispatcher.publish(f"{camera}/{object_name}", status, retain=False)

        def active_object_status(camera, object_name, status):
            self.dispatcher.publish(
                f"{camera}/{object_name}/active", status, retain=False
            )

        def camera_activity(camera, activity):
            last_activity = self.camera_activity.get(camera)

            if not last_activity or activity != last_activity:
                self.camera_activity[camera] = activity
                self.requestor.send_data(UPDATE_CAMERA_ACTIVITY, self.camera_activity)

        for camera in self.config.cameras.keys():
            camera_state = CameraState(
                camera, self.config, self.frame_manager, self.ptz_autotracker_thread
            )
            camera_state.on("start", start)
            camera_state.on("autotrack", autotrack)
            camera_state.on("update", update)
            camera_state.on("end", end)
            camera_state.on("snapshot", snapshot)
            camera_state.on("object_status", object_status)
            camera_state.on("active_object_status", active_object_status)
            camera_state.on("camera_activity", camera_activity)
            self.camera_states[camera] = camera_state

    def should_save_snapshot(self, camera, obj: TrackedObject):
        if obj.false_positive:
            return False

        snapshot_config: SnapshotsConfig = self.config.cameras[camera].snapshots

        if not snapshot_config.enabled:
            return False

        # object never changed position
        if obj.obj_data["position_changes"] == 0:
            return False

        # if there are required zones and there is no overlap
        required_zones = snapshot_config.required_zones
        if len(required_zones) > 0 and not set(obj.entered_zones) & set(required_zones):
            logger.debug(
                f"Not creating snapshot for {obj.obj_data['id']} because it did not enter required zones"
            )
            return False

        return True

    def should_retain_recording(self, camera: str, obj: TrackedObject):
        if obj.false_positive:
            return False

        record_config: RecordConfig = self.config.cameras[camera].record

        # Recording is disabled
        if not record_config.enabled:
            return False

        # object never changed position
        if obj.obj_data["position_changes"] == 0:
            return False

        # If the object is not considered an alert or detection
        review_config = self.config.cameras[camera].review
        if not (
            (
                obj.obj_data["label"] in review_config.alerts.labels
                and (
                    not review_config.alerts.required_zones
                    or set(obj.entered_zones) & set(review_config.alerts.required_zones)
                )
            )
            or (
                (
                    not review_config.detections.labels
                    or obj.obj_data["label"] in review_config.detections.labels
                )
                and (
                    not review_config.detections.required_zones
                    or set(obj.entered_zones) & set(review_config.alerts.required_zones)
                )
            )
        ):
            logger.debug(
                f"Not creating clip for {obj.obj_data['id']} because it did not qualify as an alert or detection"
            )
            return False

        return True

    def should_mqtt_snapshot(self, camera, obj: TrackedObject):
        # object never changed position
        if obj.obj_data["position_changes"] == 0:
            return False

        # if there are required zones and there is no overlap
        required_zones = self.config.cameras[camera].mqtt.required_zones
        if len(required_zones) > 0 and not set(obj.entered_zones) & set(required_zones):
            logger.debug(
                f"Not sending mqtt for {obj.obj_data['id']} because it did not enter required zones"
            )
            return False

        return True

    def update_mqtt_motion(self, camera, frame_time, motion_boxes):
        # publish if motion is currently being detected
        if motion_boxes:
            # only send ON if motion isn't already active
            if self.last_motion_detected.get(camera, 0) == 0:
                self.dispatcher.publish(
                    f"{camera}/motion",
                    "ON",
                    retain=False,
                )

            # always updated latest motion
            self.last_motion_detected[camera] = frame_time
        elif self.last_motion_detected.get(camera, 0) > 0:
            mqtt_delay = self.config.cameras[camera].motion.mqtt_off_delay

            # If no motion, make sure the off_delay has passed
            if frame_time - self.last_motion_detected.get(camera, 0) >= mqtt_delay:
                self.dispatcher.publish(
                    f"{camera}/motion",
                    "OFF",
                    retain=False,
                )
                # reset the last_motion so redundant `off` commands aren't sent
                self.last_motion_detected[camera] = 0

    def get_best(self, camera, label):
        # TODO: need a lock here
        camera_state = self.camera_states[camera]
        if label in camera_state.best_objects:
            best_obj = camera_state.best_objects[label]
            best = best_obj.thumbnail_data.copy()
            best["frame"] = camera_state.frame_cache.get(
                best_obj.thumbnail_data["frame_time"]
            )
            return best
        else:
            return {}

    def get_current_frame(self, camera, draw_options={}):
        if camera == "birdseye":
            return self.frame_manager.get(
                "birdseye",
                (self.config.birdseye.height * 3 // 2, self.config.birdseye.width),
            )

        return self.camera_states[camera].get_current_frame(draw_options)

    def get_current_frame_time(self, camera) -> int:
        """Returns the latest frame time for a given camera."""
        return self.camera_states[camera].current_frame_time

    def run(self):
        while not self.stop_event.is_set():
            try:
                (
                    camera,
                    frame_time,
                    current_tracked_objects,
                    motion_boxes,
                    regions,
                ) = self.tracked_objects_queue.get(True, 1)
            except queue.Empty:
                continue

            camera_state = self.camera_states[camera]

            camera_state.update(
                frame_time, current_tracked_objects, motion_boxes, regions
            )

            self.update_mqtt_motion(camera, frame_time, motion_boxes)

            tracked_objects = [
                o.to_dict() for o in camera_state.tracked_objects.values()
            ]

            # publish info on this frame
            self.detection_publisher.publish(
                (
                    camera,
                    frame_time,
                    tracked_objects,
                    motion_boxes,
                    regions,
                )
            )

            # update zone counts for each label
            # for each zone in the current camera
            for zone in self.config.cameras[camera].zones.keys():
                # count labels for the camera in the zone
                obj_counter = Counter(
                    obj.obj_data["label"]
                    for obj in camera_state.tracked_objects.values()
                    if zone in obj.current_zones and not obj.false_positive
                )
                active_obj_counter = Counter(
                    obj.obj_data["label"]
                    for obj in camera_state.tracked_objects.values()
                    if (
                        zone in obj.current_zones
                        and not obj.false_positive
                        and obj.active
                    )
                )
                total_label_count = 0
                total_active_label_count = 0

                # update counts and publish status
                for label in set(self.zone_data[zone].keys()) | set(obj_counter.keys()):
                    # Ignore the artificial all label
                    if label == "all":
                        continue

                    # if we have previously published a count for this zone/label
                    zone_label = self.zone_data[zone][label]
                    active_zone_label = self.active_zone_data[zone][label]
                    if camera in zone_label:
                        current_count = sum(zone_label.values())
                        current_active_count = sum(active_zone_label.values())
                        zone_label[camera] = (
                            obj_counter[label] if label in obj_counter else 0
                        )
                        active_zone_label[camera] = (
                            active_obj_counter[label]
                            if label in active_obj_counter
                            else 0
                        )
                        new_count = sum(zone_label.values())
                        new_active_count = sum(active_zone_label.values())
                        if new_count != current_count:
                            self.dispatcher.publish(
                                f"{zone}/{label}",
                                new_count,
                                retain=False,
                            )
                        if new_active_count != current_active_count:
                            self.dispatcher.publish(
                                f"{zone}/{label}/active",
                                new_active_count,
                                retain=False,
                            )

                        # Set the count for the /zone/all topic.
                        total_label_count += new_count
                        total_active_label_count += new_active_count

                    # if this is a new zone/label combo for this camera
                    else:
                        if label in obj_counter:
                            zone_label[camera] = obj_counter[label]
                            active_zone_label[camera] = active_obj_counter[label]
                            self.dispatcher.publish(
                                f"{zone}/{label}",
                                obj_counter[label],
                                retain=False,
                            )
                            self.dispatcher.publish(
                                f"{zone}/{label}/active",
                                active_obj_counter[label],
                                retain=False,
                            )

                            # Set the count for the /zone/all topic.
                            total_label_count += obj_counter[label]
                            total_active_label_count += active_obj_counter[label]

                # if we have previously published a count for this zone all labels
                zone_label = self.zone_data[zone]["all"]
                active_zone_label = self.active_zone_data[zone]["all"]
                if camera in zone_label:
                    current_count = sum(zone_label.values())
                    current_active_count = sum(active_zone_label.values())
                    zone_label[camera] = total_label_count
                    active_zone_label[camera] = total_active_label_count
                    new_count = sum(zone_label.values())
                    new_active_count = sum(active_zone_label.values())

                    if new_count != current_count:
                        self.dispatcher.publish(
                            f"{zone}/all",
                            new_count,
                            retain=False,
                        )
                    if new_active_count != current_active_count:
                        self.dispatcher.publish(
                            f"{zone}/all/active",
                            new_active_count,
                            retain=False,
                        )
                # if this is a new zone all label for this camera
                else:
                    zone_label[camera] = total_label_count
                    active_zone_label[camera] = total_active_label_count
                    self.dispatcher.publish(
                        f"{zone}/all",
                        total_label_count,
                        retain=False,
                    )
                    self.dispatcher.publish(
                        f"{zone}/all/active",
                        total_active_label_count,
                        retain=False,
                    )

            # cleanup event finished queue
            while not self.stop_event.is_set():
                update = self.event_end_subscriber.check_for_update(timeout=0.01)

                if not update:
                    break

                event_id, camera, _ = update
                self.camera_states[camera].finished(event_id)

        self.requestor.stop()
        self.detection_publisher.stop()
        self.event_sender.stop()
        self.event_end_subscriber.stop()
        logger.info("Exiting object processor...")
