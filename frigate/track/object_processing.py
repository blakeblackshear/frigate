import base64
import datetime
import json
import logging
import queue
import threading
from collections import defaultdict
from enum import Enum
from multiprocessing import Queue as MpQueue
from multiprocessing.synchronize import Event as MpEvent
from typing import Any

import cv2
import numpy as np
from peewee import SQL, DoesNotExist

from frigate.camera.state import CameraState
from frigate.comms.detections_updater import DetectionPublisher, DetectionTypeEnum
from frigate.comms.dispatcher import Dispatcher
from frigate.comms.event_metadata_updater import (
    EventMetadataSubscriber,
    EventMetadataTypeEnum,
)
from frigate.comms.events_updater import EventEndSubscriber, EventUpdatePublisher
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import (
    CameraMqttConfig,
    FrigateConfig,
    RecordConfig,
    SnapshotsConfig,
)
from frigate.config.camera.updater import (
    CameraConfigUpdateEnum,
    CameraConfigUpdateSubscriber,
)
from frigate.config.classification import ObjectClassificationType
from frigate.const import (
    FAST_QUEUE_TIMEOUT,
    UPDATE_CAMERA_ACTIVITY,
    UPSERT_REVIEW_SEGMENT,
)
from frigate.events.types import EventStateEnum, EventTypeEnum
from frigate.models import Event, ReviewSegment, Timeline
from frigate.ptz.autotrack import PtzAutoTrackerThread
from frigate.track.tracked_object import TrackedObject
from frigate.util.image import SharedMemoryFrameManager

logger = logging.getLogger(__name__)


class ManualEventState(str, Enum):
    complete = "complete"
    start = "start"
    end = "end"


class TrackedObjectProcessor(threading.Thread):
    def __init__(
        self,
        config: FrigateConfig,
        dispatcher: Dispatcher,
        tracked_objects_queue: MpQueue,
        ptz_autotracker_thread: PtzAutoTrackerThread,
        stop_event: MpEvent,
    ) -> None:
        super().__init__(name="detected_frames_processor")
        self.config = config
        self.dispatcher = dispatcher
        self.tracked_objects_queue = tracked_objects_queue
        self.stop_event: MpEvent = stop_event
        self.camera_states: dict[str, CameraState] = {}
        self.frame_manager = SharedMemoryFrameManager()
        self.last_motion_detected: dict[str, float] = {}
        self.ptz_autotracker_thread = ptz_autotracker_thread

        self.camera_config_subscriber = CameraConfigUpdateSubscriber(
            self.config,
            self.config.cameras,
            [
                CameraConfigUpdateEnum.add,
                CameraConfigUpdateEnum.enabled,
                CameraConfigUpdateEnum.motion,
                CameraConfigUpdateEnum.objects,
                CameraConfigUpdateEnum.remove,
                CameraConfigUpdateEnum.zones,
            ],
        )

        self.requestor = InterProcessRequestor()
        self.detection_publisher = DetectionPublisher(DetectionTypeEnum.all.value)
        self.event_sender = EventUpdatePublisher()
        self.event_end_subscriber = EventEndSubscriber()
        self.sub_label_subscriber = EventMetadataSubscriber(EventMetadataTypeEnum.all)

        self.camera_activity: dict[str, dict[str, Any]] = {}
        self.ongoing_manual_events: dict[str, str] = {}

        # {
        #   'zone_name': {
        #       'person': {
        #           'camera_1': 2,
        #           'camera_2': 1
        #       }
        #   }
        # }
        self.zone_data: dict[str, dict[str, Any]] = defaultdict(
            lambda: defaultdict(dict)
        )
        self.active_zone_data: dict[str, dict[str, Any]] = defaultdict(
            lambda: defaultdict(dict)
        )

        for camera in self.config.cameras.keys():
            self.create_camera_state(camera)

    def create_camera_state(self, camera: str) -> None:
        """Creates a new camera state."""

        def start(camera: str, obj: TrackedObject, frame_name: str) -> None:
            self.event_sender.publish(
                (
                    EventTypeEnum.tracked_object,
                    EventStateEnum.start,
                    camera,
                    frame_name,
                    obj.to_dict(),
                )
            )

        def update(camera: str, obj: TrackedObject, frame_name: str) -> None:
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
                    obj.to_dict(),
                )
            )

        def autotrack(camera: str, obj: TrackedObject, frame_name: str) -> None:
            self.ptz_autotracker_thread.ptz_autotracker.autotrack_object(camera, obj)

        def end(camera: str, obj: TrackedObject, frame_name: str) -> None:
            # populate has_snapshot
            obj.has_snapshot = self.should_save_snapshot(camera, obj)
            obj.has_clip = self.should_retain_recording(camera, obj)

            # write thumbnail to disk if it will be saved as an event
            if obj.has_snapshot or obj.has_clip:
                obj.write_thumbnail_to_disk()

            # write the snapshot to disk
            if obj.has_snapshot:
                obj.write_snapshot_to_disk()

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
                    obj.to_dict(),
                )
            )

        def snapshot(camera: str, obj: TrackedObject) -> bool:
            mqtt_config: CameraMqttConfig = self.config.cameras[camera].mqtt
            if mqtt_config.enabled and self.should_mqtt_snapshot(camera, obj):
                jpg_bytes = obj.get_img_bytes(
                    ext="jpg",
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

                    if obj.obj_data.get("sub_label"):
                        sub_label = obj.obj_data["sub_label"][0]

                        if sub_label in self.config.model.all_attribute_logos:
                            self.dispatcher.publish(
                                f"{camera}/{sub_label}/snapshot",
                                jpg_bytes,
                                retain=True,
                            )

                    return True

            return False

        def camera_activity(camera: str, activity: dict[str, Any]) -> None:
            last_activity = self.camera_activity.get(camera)

            if not last_activity or activity != last_activity:
                self.camera_activity[camera] = activity
                self.requestor.send_data(UPDATE_CAMERA_ACTIVITY, self.camera_activity)

        camera_state = CameraState(
            camera, self.config, self.frame_manager, self.ptz_autotracker_thread
        )
        camera_state.on("start", start)
        camera_state.on("autotrack", autotrack)
        camera_state.on("update", update)
        camera_state.on("end", end)
        camera_state.on("snapshot", snapshot)
        camera_state.on("camera_activity", camera_activity)
        self.camera_states[camera] = camera_state

    def should_save_snapshot(self, camera: str, obj: TrackedObject) -> bool:
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

    def should_retain_recording(self, camera: str, obj: TrackedObject) -> bool:
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
        if obj.max_severity is None:
            return False

        return True

    def should_mqtt_snapshot(self, camera: str, obj: TrackedObject) -> bool:
        # object never changed position
        if obj.is_stationary():
            return False

        # if there are required zones and there is no overlap
        required_zones = self.config.cameras[camera].mqtt.required_zones
        if len(required_zones) > 0 and not set(obj.entered_zones) & set(required_zones):
            logger.debug(
                f"Not sending mqtt for {obj.obj_data['id']} because it did not enter required zones"
            )
            return False

        return True

    def update_mqtt_motion(
        self, camera: str, frame_time: float, motion_boxes: list
    ) -> None:
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

    def get_best(self, camera: str, label: str) -> dict[str, Any]:
        # TODO: need a lock here
        camera_state = self.camera_states[camera]
        if label in camera_state.best_objects:
            best_obj = camera_state.best_objects[label]

            if not best_obj.thumbnail_data:
                return {}

            best = best_obj.thumbnail_data.copy()
            best["frame"] = camera_state.frame_cache.get(
                best_obj.thumbnail_data["frame_time"]
            )
            return best
        else:
            return {}

    def get_current_frame(
        self, camera: str, draw_options: dict[str, Any] = {}
    ) -> np.ndarray | None:
        if camera == "birdseye":
            return self.frame_manager.get(
                "birdseye",
                (self.config.birdseye.height * 3 // 2, self.config.birdseye.width),
            )

        if camera not in self.camera_states:
            return None

        return self.camera_states[camera].get_current_frame(draw_options)

    def get_current_frame_time(self, camera: str) -> float:
        """Returns the latest frame time for a given camera."""
        return self.camera_states[camera].current_frame_time

    def set_sub_label(
        self, event_id: str, sub_label: str | None, score: float | None
    ) -> None:
        """Update sub label for given event id."""
        tracked_obj: TrackedObject | None = None

        for state in self.camera_states.values():
            tracked_obj = state.tracked_objects.get(event_id)

            if tracked_obj is not None:
                break

        try:
            event: Event | None = Event.get(Event.id == event_id)
        except DoesNotExist:
            event = None

        if not tracked_obj and not event:
            return

        if tracked_obj:
            tracked_obj.obj_data["sub_label"] = (sub_label, score)

        if event:
            event.sub_label = sub_label  # type: ignore[assignment]
            data = event.data
            if sub_label is None:
                data["sub_label_score"] = None  # type: ignore[index]
            elif score is not None:
                data["sub_label_score"] = score  # type: ignore[index]
            event.data = data
            event.save()

            # update timeline items
            Timeline.update(
                data=Timeline.data.update({"sub_label": (sub_label, score)})
            ).where(Timeline.source_id == event_id).execute()

            # only update ended review segments
            # manually updating a sub_label from the UI is only possible for ended tracked objects
            try:
                review_segment = ReviewSegment.get(
                    (
                        SQL(
                            "json_extract(data, '$.detections') LIKE ?",
                            [f'%"{event_id}"%'],
                        )
                    )
                    & (ReviewSegment.end_time.is_null(False))
                )

                segment_data = review_segment.data
                detection_ids = segment_data.get("detections", [])

                # Rebuild objects list and sync sub_labels
                objects_list = []
                sub_labels = set()
                events = Event.select(Event.id, Event.label, Event.sub_label).where(
                    Event.id.in_(detection_ids)  # type: ignore[call-arg, misc]
                )
                for det_event in events:
                    if det_event.sub_label:
                        sub_labels.add(det_event.sub_label)
                        objects_list.append(
                            f"{det_event.label}-verified"
                        )  # eg, "bird-verified"
                    else:
                        objects_list.append(det_event.label)  # eg, "bird"

                segment_data["sub_labels"] = list(sub_labels)
                segment_data["objects"] = objects_list

                updated_data = {
                    ReviewSegment.id.name: review_segment.id,
                    ReviewSegment.camera.name: review_segment.camera,
                    ReviewSegment.start_time.name: review_segment.start_time,
                    ReviewSegment.end_time.name: review_segment.end_time,
                    ReviewSegment.severity.name: review_segment.severity,
                    ReviewSegment.thumb_path.name: review_segment.thumb_path,
                    ReviewSegment.data.name: segment_data,
                }

                self.requestor.send_data(UPSERT_REVIEW_SEGMENT, updated_data)
                logger.debug(
                    f"Updated sub_label for event {event_id} in review segment {review_segment.id}"
                )

            except DoesNotExist:
                logger.debug(
                    f"No review segment found with event ID {event_id} when updating sub_label"
                )

    def set_object_attribute(
        self,
        event_id: str,
        field_name: str,
        field_value: str | None,
        score: float | None,
    ) -> None:
        """Update attribute for given event id."""
        tracked_obj: TrackedObject | None = None

        for state in self.camera_states.values():
            tracked_obj = state.tracked_objects.get(event_id)

            if tracked_obj is not None:
                break

        try:
            event: Event | None = Event.get(Event.id == event_id)
        except DoesNotExist:
            event = None

        if not tracked_obj and not event:
            return

        if tracked_obj:
            tracked_obj.obj_data[field_name] = (
                field_value,
                score,
            )

        if event:
            data = event.data
            data[field_name] = field_value  # type: ignore[index]
            if field_value is None:
                data[f"{field_name}_score"] = None  # type: ignore[index]
            elif score is not None:
                data[f"{field_name}_score"] = score  # type: ignore[index]
            event.data = data
            event.save()

    def save_lpr_snapshot(self, payload: tuple) -> None:
        # save the snapshot image
        (frame, event_id, camera) = payload

        img = cv2.imdecode(
            np.frombuffer(base64.b64decode(frame), dtype=np.uint8),
            cv2.IMREAD_COLOR,
        )

        self.camera_states[camera].save_manual_event_image(
            img, event_id, "license_plate", {}
        )

    def create_manual_event(self, payload: tuple) -> None:
        (
            frame_time,
            camera_name,
            label,
            event_id,
            include_recording,
            score,
            sub_label,
            duration,
            source_type,
            draw,
        ) = payload

        # save the snapshot image
        self.camera_states[camera_name].save_manual_event_image(
            None, event_id, label, draw
        )
        end_time = frame_time + duration if duration is not None else None

        # send event to event maintainer
        self.event_sender.publish(
            (
                EventTypeEnum.api,
                EventStateEnum.start,
                camera_name,
                "",
                {
                    "id": event_id,
                    "label": label,
                    "sub_label": sub_label,
                    "score": score,
                    "camera": camera_name,
                    "start_time": frame_time
                    - self.config.cameras[camera_name].record.event_pre_capture,
                    "end_time": end_time,
                    "has_clip": self.config.cameras[camera_name].record.enabled
                    and include_recording,
                    "has_snapshot": True,
                    "type": source_type,
                },
            )
        )

        if source_type == "api":
            self.ongoing_manual_events[event_id] = camera_name
            self.detection_publisher.publish(
                (
                    camera_name,
                    frame_time,
                    {
                        "state": (
                            ManualEventState.complete
                            if end_time
                            else ManualEventState.start
                        ),
                        "label": f"{label}: {sub_label}" if sub_label else label,
                        "event_id": event_id,
                        "end_time": end_time,
                    },
                ),
                DetectionTypeEnum.api.value,
            )

    def create_lpr_event(self, payload: tuple) -> None:
        (
            frame_time,
            camera_name,
            label,
            event_id,
            include_recording,
            score,
            sub_label,
            plate,
        ) = payload

        # send event to event maintainer
        self.event_sender.publish(
            (
                EventTypeEnum.api,
                EventStateEnum.start,
                camera_name,
                "",
                {
                    "id": event_id,
                    "label": label,
                    "sub_label": sub_label,
                    "score": score,
                    "camera": camera_name,
                    "start_time": frame_time
                    - self.config.cameras[camera_name].record.event_pre_capture,
                    "end_time": None,
                    "has_clip": self.config.cameras[camera_name].record.enabled
                    and include_recording,
                    "has_snapshot": True,
                    "type": "api",
                    "recognized_license_plate": plate,
                    "recognized_license_plate_score": score,
                },
            )
        )

        self.ongoing_manual_events[event_id] = camera_name
        self.detection_publisher.publish(
            (
                camera_name,
                frame_time,
                {
                    "state": ManualEventState.start,
                    "label": f"{label}: {sub_label}" if sub_label else label,
                    "event_id": event_id,
                    "end_time": None,
                },
            ),
            DetectionTypeEnum.lpr.value,
        )

    def end_manual_event(self, payload: tuple) -> None:
        (event_id, end_time) = payload

        self.event_sender.publish(
            (
                EventTypeEnum.api,
                EventStateEnum.end,
                None,
                "",
                {"id": event_id, "end_time": end_time},
            )
        )

        if event_id in self.ongoing_manual_events:
            self.detection_publisher.publish(
                (
                    self.ongoing_manual_events[event_id],
                    end_time,
                    {
                        "state": ManualEventState.end,
                        "event_id": event_id,
                        "end_time": end_time,
                    },
                ),
                DetectionTypeEnum.api.value,
            )
            self.ongoing_manual_events.pop(event_id)

    def force_end_all_events(self, camera: str, camera_state: CameraState) -> None:
        """Ends all active events on camera when disabling."""
        last_frame_name = camera_state.previous_frame_id
        for obj_id, obj in list(camera_state.tracked_objects.items()):
            if "end_time" not in obj.obj_data:
                logger.debug(f"Camera {camera} disabled, ending active event {obj_id}")
                obj.obj_data["end_time"] = datetime.datetime.now().timestamp()
                # end callbacks
                for callback in camera_state.callbacks["end"]:
                    callback(camera, obj, last_frame_name)

                # camera activity callbacks
                for callback in camera_state.callbacks["camera_activity"]:
                    callback(
                        camera,
                        {"enabled": False, "motion": 0, "objects": []},
                    )

    def run(self) -> None:
        while not self.stop_event.is_set():
            # check for config updates
            updated_topics = self.camera_config_subscriber.check_for_updates()

            if "enabled" in updated_topics:
                for camera in updated_topics["enabled"]:
                    if self.camera_states[camera].prev_enabled is None:
                        self.camera_states[camera].prev_enabled = self.config.cameras[
                            camera
                        ].enabled
            elif "add" in updated_topics:
                for camera in updated_topics["add"]:
                    self.config.cameras[camera] = (
                        self.camera_config_subscriber.camera_configs[camera]
                    )
                    self.create_camera_state(camera)
            elif "remove" in updated_topics:
                for camera in updated_topics["remove"]:
                    camera_state = self.camera_states[camera]
                    camera_state.shutdown()
                    self.camera_states.pop(camera)

            # manage camera disabled state
            for camera, config in self.config.cameras.items():
                if not config.enabled_in_config:
                    continue

                current_enabled = config.enabled
                camera_state = self.camera_states[camera]

                if camera_state.prev_enabled and not current_enabled:
                    logger.debug(f"Not processing objects for disabled camera {camera}")
                    self.force_end_all_events(camera, camera_state)

                camera_state.prev_enabled = current_enabled

                if not current_enabled:
                    continue

            # check for sub label updates
            while True:
                update = self.sub_label_subscriber.check_for_update(timeout=0)

                if not update:
                    break

                (raw_topic, payload) = update

                if not raw_topic or not payload:
                    break

                topic = str(raw_topic)

                if topic.endswith(EventMetadataTypeEnum.sub_label.value):
                    (event_id, sub_label, score) = payload
                    self.set_sub_label(event_id, sub_label, score)
                if topic.endswith(EventMetadataTypeEnum.attribute.value):
                    (event_id, field_name, field_value, score) = payload
                    self.set_object_attribute(event_id, field_name, field_value, score)
                elif topic.endswith(EventMetadataTypeEnum.lpr_event_create.value):
                    self.create_lpr_event(payload)
                elif topic.endswith(EventMetadataTypeEnum.save_lpr_snapshot.value):
                    self.save_lpr_snapshot(payload)
                elif topic.endswith(EventMetadataTypeEnum.manual_event_create.value):
                    self.create_manual_event(payload)
                elif topic.endswith(EventMetadataTypeEnum.manual_event_end.value):
                    self.end_manual_event(payload)

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

            if not self.config.cameras[camera].enabled:
                logger.debug(f"Camera {camera} disabled, skipping update")
                continue

            camera_state = self.camera_states[camera]

            camera_state.update(
                frame_name, frame_time, current_tracked_objects, motion_boxes, regions
            )

            self.update_mqtt_motion(camera, frame_time, motion_boxes)

            attribute_model_names = [
                name
                for name, model_config in self.config.classification.custom.items()
                if model_config.object_config
                and model_config.object_config.classification_type
                == ObjectClassificationType.attribute
            ]
            tracked_objects = [
                o.to_dict(attribute_model_names=attribute_model_names)
                for o in camera_state.tracked_objects.values()
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
                ),
                DetectionTypeEnum.video.value,
            )

            # cleanup event finished queue
            while not self.stop_event.is_set():
                update = self.event_end_subscriber.check_for_update(
                    timeout=FAST_QUEUE_TIMEOUT
                )

                if not update:
                    break

                event_id, camera, _ = update
                self.camera_states[camera].finished(event_id)

        # shut down camera states
        for state in self.camera_states.values():
            state.shutdown()

        self.requestor.stop()
        self.detection_publisher.stop()
        self.event_sender.stop()
        self.event_end_subscriber.stop()
        self.sub_label_subscriber.stop()
        self.camera_config_subscriber.stop()

        logger.info("Exiting object processor...")
