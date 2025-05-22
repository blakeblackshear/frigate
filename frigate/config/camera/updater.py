"""Convenience classes for updating configurations dynamically."""

from dataclasses import dataclass
from enum import Enum
from typing import Any

from frigate.comms.config_updater import ConfigPublisher, ConfigSubscriber
from frigate.config import CameraConfig


class CameraConfigUpdateEnum(str, Enum):
    """Supported camera config update types."""

    audio = "audio"
    birdseye = "birdseye"
    detect = "detect"
    enabled = "enabled"
    motion = "motion"  # includes motion and motion masks
    notifications = "notifications"
    record = "record"
    review = "review"
    snapshots = "snapshots"
    zones = "zones"


@dataclass
class CameraConfigUpdateTopic:
    update_type: CameraConfigUpdateEnum
    camera: str

    @property
    def topic(self) -> str:
        return f"config/cameras/{self.camera}/{self.update_type}"


def find_base_topic(topics: list[CameraConfigUpdateTopic]) -> str:
    """
    Finds the longest common topic of topic strings.

    Args:
        topics: list of update topics.

    Returns:
        The longest common topic of the two strings.
    """
    strings = [topic.topic for topic in topics]

    for i in range(min([len(s) for s in strings])):
        letters = [s[i] for s in strings]
        if all([letters[0] == letter for letter in letters]):
            continue

        return strings[0][0:i]


class CameraConfigUpdatePublisher:
    def __init__(self, publisher: ConfigPublisher):
        self.publisher = publisher

    def publish_update(self, topic: CameraConfigUpdateTopic, config: Any) -> None:
        self.publisher.publish(topic.topic, config)

    def stop(self) -> None:
        self.publisher.stop()


class CameraConfigUpdateSubscriber:
    def __init__(
        self,
        camera_configs: dict[str, CameraConfig],
        topics: list[CameraConfigUpdateEnum],
    ):
        self.camera_configs = camera_configs
        self.exact = len(topics) == 1
        self.subscriber = ConfigSubscriber(
            topics[0] if self.exact else find_base_topic(topics),
            exact=self.exact,
        )

    def __update_config(
        self, camera: str, update_type: CameraConfigUpdateEnum, updated_config: Any
    ) -> None:
        config = self.camera_configs[camera]

        if not config:
            return

        if update_type == CameraConfigUpdateEnum.audio:
            config.audio = updated_config
        elif update_type == CameraConfigUpdateEnum.birdseye:
            config.birdseye = updated_config
        elif update_type == CameraConfigUpdateEnum.detect:
            config.detect = updated_config
        elif update_type == CameraConfigUpdateEnum.enabled:
            config.enabled = updated_config
        elif update_type == CameraConfigUpdateEnum.motion:
            config.motion = updated_config
        elif update_type == CameraConfigUpdateEnum.notifications:
            config.notifications = updated_config
        elif updated_config == CameraConfigUpdateEnum.record:
            config.record = updated_config
        elif updated_config == CameraConfigUpdateEnum.review:
            config.review = updated_config
        elif updated_config == CameraConfigUpdateEnum.snapshots:
            config.snapshots = updated_config
        elif update_type == CameraConfigUpdateEnum.zones:
            config.zones = updated_config

    def check_for_update(self) -> bool:
        update_topic, update_config = self.subscriber.check_for_update()

        if update_topic and update_config:
            _, _, camera, update_type = update_topic.split("/")

            for enum in CameraConfigUpdateEnum.__members__.values():
                if update_type == enum.name:
                    self.__update_config(camera, enum)
                    return True

        return False

    def stop(self) -> None:
        self.subscriber.stop()
