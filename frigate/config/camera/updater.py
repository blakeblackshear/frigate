"""Convenience classes for updating configurations dynamically."""

from dataclasses import dataclass
from enum import Enum
from typing import Any

from frigate.comms.config_updater import ConfigPublisher, ConfigSubscriber
from frigate.config import CameraConfig


class CameraConfigUpdateEnum(str, Enum):
    """Supported camera config update types."""

    audio = "audio"
    audio_transcription = "audio_transcription"
    birdseye = "birdseye"
    detect = "detect"
    enabled = "enabled"
    motion = "motion"  # includes motion and motion masks
    notifications = "notifications"
    objects = "objects"
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
        return f"config/cameras/{self.camera}/{self.update_type.name}"


class CameraConfigUpdatePublisher:
    def __init__(self):
        self.publisher = ConfigPublisher()

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
        self.topics = topics

        base_topic = "config/cameras"

        if len(self.camera_configs) == 1:
            base_topic += f"/{list(self.camera_configs.keys())[0]}"

        self.subscriber = ConfigSubscriber(
            base_topic,
            exact=False,
        )

    def __update_config(
        self, camera: str, update_type: CameraConfigUpdateEnum, updated_config: Any
    ) -> None:
        config = self.camera_configs[camera]

        if not config:
            return

        if update_type == CameraConfigUpdateEnum.audio:
            config.audio = updated_config
        if update_type == CameraConfigUpdateEnum.audio_transcription:
            config.audio_transcription = updated_config
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
        elif update_type == CameraConfigUpdateEnum.objects:
            config.objects = updated_config
        elif update_type == CameraConfigUpdateEnum.record:
            config.record = updated_config
        elif update_type == CameraConfigUpdateEnum.review:
            config.review = updated_config
        elif update_type == CameraConfigUpdateEnum.snapshots:
            config.snapshots = updated_config
        elif update_type == CameraConfigUpdateEnum.zones:
            config.zones = updated_config

    def check_for_updates(self) -> dict[str, list[str]]:
        updated_topics: dict[str, list[str]] = {}

        # get all updates available
        while True:
            update_topic, update_config = self.subscriber.check_for_update()

            if update_topic is None or update_config is None:
                break

            _, _, camera, raw_type = update_topic.split("/")
            update_type = CameraConfigUpdateEnum[raw_type]

            if update_type in self.topics:
                if update_type.name in updated_topics:
                    updated_topics[update_type.name].append(camera)
                else:
                    updated_topics[update_type.name] = [camera]

                self.__update_config(camera, update_type, update_config)

        return updated_topics

    def stop(self) -> None:
        self.subscriber.stop()
