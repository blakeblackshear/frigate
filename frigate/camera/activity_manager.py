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
        self.zone_object_counts: dict[str, dict[str, Counter]] = {}

        for camera_config in config.cameras.values():
            if not camera_config.enabled:
                continue

            self.last_camera_activity[camera_config.name] = {}
            self.camera_all_object_counts[camera_config.name] = Counter()
            self.camera_active_object_counts[camera_config.name] = Counter()

    def __generate_zone_start_dict(self) -> dict:
        zones: dict[str, dict[str, int]] = {}

        for camera_config in self.config.cameras.values():
            for zone, zone_config in camera_config.zones.items():
                zones[zone] = {}

                for label in zone_config.objects:
                    zones[zone][label] = 0

        return zones

    def update_activity(self, new_activity: dict[str, dict[str, any]]) -> None:
        zone_stats: dict[str, Counter] = {}

        for camera in new_activity.keys():
            if self.last_camera_activity.get(camera, {}).get("objects") != new_activity[
                camera
            ].get("objects"):
                self.compare_camera_activity(camera, new_activity[camera]["objects"])

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

        # run through each object and check what topics need to be updated
        for label in self.config.cameras[camera].objects.track:
            if label in self.config.model.all_attributes:
                continue

            new_count = all_objects[label]
            new_active_count = active_objects[label]

            if (
                new_count != self.camera_all_object_counts[camera][label]
                or label not in self.camera_all_object_counts[camera]
            ):
                self.publish(f"{camera}/{label}", new_count)
                self.camera_all_object_counts[camera][label] = new_count

            if (
                new_active_count != self.camera_active_object_counts[camera][label]
                or label not in self.camera_active_object_counts[camera]
            ):
                self.publish(f"{camera}/{label}/active", new_active_count)
                self.camera_active_object_counts[camera][label] = new_active_count

        self.publish(f"{camera}/all", sum(list(all_objects.values())))
        self.publish(f"{camera}/all/active", sum(list(active_objects.values())))
