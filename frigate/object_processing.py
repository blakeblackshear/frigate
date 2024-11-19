import datetime
import json
import logging
import os
import queue
import threading
from collections import Counter, defaultdict
from multiprocessing.synchronize import Event as MpEvent
from typing import Callable

import cv2
import numpy as np

from frigate.comms.detections_updater import DetectionPublisher, DetectionTypeEnum
from frigate.comms.dispatcher import Dispatcher
from frigate.comms.events_updater import EventEndSubscriber, EventUpdatePublisher
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import (
    FrigateConfig,
    MqttConfig,
    RecordConfig,
    SnapshotsConfig,
    ZoomingModeEnum,
)
from frigate.const import CLIPS_DIR, UPDATE_CAMERA_ACTIVITY
from frigate.events.types import EventStateEnum, EventTypeEnum
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
                c(self.name, self.best_objects[obj_name], frame_name)

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

            self.previous_frame_id = frame_name


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

        def start(camera: str, obj: TrackedObject, frame_name: str):
            self.event_sender.publish(
                (
                    EventTypeEnum.tracked_object,
                    EventStateEnum.start,
                    camera,
                    frame_name,
                    obj.to_dict(),
                )
            )

        def update(camera: str, obj: TrackedObject, frame_name: str):
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
                    frame_name,
                    obj.to_dict(include_thumbnail=True),
                )
            )

        def autotrack(camera: str, obj: TrackedObject, frame_name: str):
            self.ptz_autotracker_thread.ptz_autotracker.autotrack_object(camera, obj)

        def end(camera: str, obj: TrackedObject, frame_name: str):
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
                    frame_name,
                    obj.to_dict(include_thumbnail=True),
                )
            )

        def snapshot(camera, obj: TrackedObject, frame_name: str):
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
                    or set(obj.entered_zones)
                    & set(review_config.detections.required_zones)
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
                    frame_name,
                    frame_time,
                    current_tracked_objects,
                    motion_boxes,
                    regions,
                ) = self.tracked_objects_queue.get(True, 1)
            except queue.Empty:
                continue

            camera_state = self.camera_states[camera]

            camera_state.update(
                frame_name, frame_time, current_tracked_objects, motion_boxes, regions
            )

            self.update_mqtt_motion(camera, frame_time, motion_boxes)

            tracked_objects = [
                o.to_dict() for o in camera_state.tracked_objects.values()
            ]

            # publish info on this frame
            self.detection_publisher.publish(
                (
                    camera,
                    frame_name,
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
