"""Manage camera activity and updating listeners."""

import datetime
import json
import logging
import random
import string
from collections import Counter
from typing import Any, Callable

from frigate.comms.event_metadata_updater import (
    EventMetadataPublisher,
    EventMetadataTypeEnum,
)
from frigate.config import CameraConfig, FrigateConfig

logger = logging.getLogger(__name__)


class CameraActivityManager:
    def __init__(
        self, config: FrigateConfig, publish: Callable[[str, Any], None]
    ) -> None:
        self.config = config
        self.publish = publish
        self.last_camera_activity: dict[str, dict[str, Any]] = {}
        self.camera_all_object_counts: dict[str, Counter] = {}
        self.camera_active_object_counts: dict[str, Counter] = {}
        self.zone_all_object_counts: dict[str, Counter] = {}
        self.zone_active_object_counts: dict[str, Counter] = {}
        self.all_zone_labels: dict[str, set[str]] = {}

        for camera_config in config.cameras.values():
            if not camera_config.enabled_in_config:
                continue

            self.__init_camera(camera_config)

    def __init_camera(self, camera_config: CameraConfig) -> None:
        self.last_camera_activity[camera_config.name] = {}
        self.camera_all_object_counts[camera_config.name] = Counter()
        self.camera_active_object_counts[camera_config.name] = Counter()

        for zone, zone_config in camera_config.zones.items():
            if zone not in self.all_zone_labels:
                self.zone_all_object_counts[zone] = Counter()
                self.zone_active_object_counts[zone] = Counter()
                self.all_zone_labels[zone] = set()

            self.all_zone_labels[zone].update(
                zone_config.objects
                if zone_config.objects
                else camera_config.objects.track
            )

    def update_activity(self, new_activity: dict[str, dict[str, Any]]) -> None:
        all_objects: list[dict[str, Any]] = []

        for camera in new_activity.keys():
            # handle cameras that were added dynamically
            if camera not in self.camera_all_object_counts:
                self.__init_camera(self.config.cameras[camera])

            new_objects = new_activity[camera].get("objects", [])
            all_objects.extend(new_objects)

            if self.last_camera_activity.get(camera, {}).get("objects") != new_objects:
                self.compare_camera_activity(camera, new_objects)

        # run through every zone, getting a count of objects in that zone right now
        for zone, labels in self.all_zone_labels.items():
            all_zone_objects = Counter(
                obj["label"].replace("-verified", "")
                for obj in all_objects
                if zone in obj["current_zones"]
            )
            active_zone_objects = Counter(
                obj["label"].replace("-verified", "")
                for obj in all_objects
                if zone in obj["current_zones"] and not obj["stationary"]
            )
            any_changed = False

            # run through each object and check what topics need to be updated for this zone
            for label in labels:
                new_count = all_zone_objects[label]
                new_active_count = active_zone_objects[label]

                if (
                    new_count != self.zone_all_object_counts[zone][label]
                    or label not in self.zone_all_object_counts[zone]
                ):
                    any_changed = True
                    self.publish(f"{zone}/{label}", new_count)
                    self.zone_all_object_counts[zone][label] = new_count

                if (
                    new_active_count != self.zone_active_object_counts[zone][label]
                    or label not in self.zone_active_object_counts[zone]
                ):
                    any_changed = True
                    self.publish(f"{zone}/{label}/active", new_active_count)
                    self.zone_active_object_counts[zone][label] = new_active_count

            if any_changed:
                self.publish(f"{zone}/all", sum(list(all_zone_objects.values())))
                self.publish(
                    f"{zone}/all/active", sum(list(active_zone_objects.values()))
                )

        self.last_camera_activity = new_activity

    def compare_camera_activity(
        self, camera: str, new_activity: dict[str, Any]
    ) -> None:
        all_objects = Counter(
            obj["label"].replace("-verified", "") for obj in new_activity
        )
        active_objects = Counter(
            obj["label"].replace("-verified", "")
            for obj in new_activity
            if not obj["stationary"]
        )
        any_changed = False

        # run through each object and check what topics need to be updated
        for label in self.config.cameras[camera].objects.track:
            if label in self.config.model.non_logo_attributes:
                continue

            new_count = all_objects[label]
            new_active_count = active_objects[label]

            if (
                new_count != self.camera_all_object_counts[camera][label]
                or label not in self.camera_all_object_counts[camera]
            ):
                any_changed = True
                self.publish(f"{camera}/{label}", new_count)
                self.camera_all_object_counts[camera][label] = new_count

            if (
                new_active_count != self.camera_active_object_counts[camera][label]
                or label not in self.camera_active_object_counts[camera]
            ):
                any_changed = True
                self.publish(f"{camera}/{label}/active", new_active_count)
                self.camera_active_object_counts[camera][label] = new_active_count

        if any_changed:
            self.publish(f"{camera}/all", sum(list(all_objects.values())))
            self.publish(f"{camera}/all/active", sum(list(active_objects.values())))


class AudioActivityManager:
    def __init__(
        self, config: FrigateConfig, publish: Callable[[str, Any], None]
    ) -> None:
        self.config = config
        self.publish = publish
        self.current_audio_detections: dict[str, dict[str, dict[str, Any]]] = {}
        self.event_metadata_publisher = EventMetadataPublisher()

        for camera_config in config.cameras.values():
            if not camera_config.audio.enabled_in_config:
                continue

            self.__init_camera(camera_config)

    def __init_camera(self, camera_config: CameraConfig) -> None:
        self.current_audio_detections[camera_config.name] = {}

    def update_activity(self, new_activity: dict[str, dict[str, Any]]) -> None:
        now = datetime.datetime.now().timestamp()

        for camera in new_activity.keys():
            # handle cameras that were added dynamically
            if camera not in self.current_audio_detections:
                self.__init_camera(self.config.cameras[camera])

            new_detections = new_activity[camera].get("detections", [])
            if self.compare_audio_activity(camera, new_detections, now):
                logger.debug(f"Audio detections for {camera}: {new_activity}")
                self.publish(
                    f"{camera}/audio/all",
                    "ON" if len(self.current_audio_detections[camera]) > 0 else "OFF",
                )
                self.publish(
                    "audio_detections",
                    json.dumps(self.current_audio_detections),
                )

    def compare_audio_activity(
        self, camera: str, new_detections: list[tuple[str, float]], now: float
    ) -> None:
        max_not_heard = self.config.cameras[camera].audio.max_not_heard
        current = self.current_audio_detections[camera]

        any_changed = False

        for label, score in new_detections:
            any_changed = True
            if label in current:
                current[label]["last_detection"] = now
                current[label]["score"] = score
            else:
                rand_id = "".join(
                    random.choices(string.ascii_lowercase + string.digits, k=6)
                )
                event_id = f"{now}-{rand_id}"
                self.publish(f"{camera}/audio/{label}", "ON")

                self.event_metadata_publisher.publish(
                    (
                        now,
                        camera,
                        label,
                        event_id,
                        True,
                        score,
                        None,
                        None,
                        "audio",
                        {},
                    ),
                    EventMetadataTypeEnum.manual_event_create.value,
                )
                current[label] = {
                    "id": event_id,
                    "score": score,
                    "last_detection": now,
                }

        # expire detections
        for label in list(current.keys()):
            if now - current[label]["last_detection"] > max_not_heard:
                any_changed = True
                self.publish(f"{camera}/audio/{label}", "OFF")

                self.event_metadata_publisher.publish(
                    (current[label]["id"], now),
                    EventMetadataTypeEnum.manual_event_end.value,
                )
                del current[label]

        return any_changed

    def expire_all(self, camera: str) -> None:
        now = datetime.datetime.now().timestamp()
        current = self.current_audio_detections.get(camera, {})

        for label in list(current.keys()):
            self.publish(f"{camera}/audio/{label}", "OFF")

            self.event_metadata_publisher.publish(
                (current[label]["id"], now),
                EventMetadataTypeEnum.manual_event_end.value,
            )
            del current[label]
