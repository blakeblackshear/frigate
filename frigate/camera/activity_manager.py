"""Manage camera activity and updating listeners."""

from collections import Counter
from typing import Callable

from frigate.config.config import FrigateConfig


class CameraActivityManager:
    def __init__(
        self, config: FrigateConfig, publish: Callable[[str, any], None]
    ) -> None:
        self.config = config
        self.publish = publish
        self.last_camera_activity: dict[str, dict[str, any]] = {}
        self.camera_all_object_counts: dict[str, Counter] = {}
        self.camera_active_object_counts: dict[str, Counter] = {}
        self.zone_all_object_counts: dict[str, Counter] = {}
        self.zone_active_object_counts: dict[str, Counter] = {}
        self.all_zone_labels: dict[str, set[str]] = {}

        for camera_config in config.cameras.values():
            if not camera_config.enabled_in_config:
                continue

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

    def update_activity(self, new_activity: dict[str, dict[str, any]]) -> None:
        all_objects: list[dict[str, any]] = []

        for camera in new_activity.keys():
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
        self, camera: str, new_activity: dict[str, any]
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
