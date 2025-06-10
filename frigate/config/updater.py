"""Convenience classes for updating global configurations dynamically."""

from dataclasses import dataclass
from enum import Enum
from typing import Any

from frigate.comms.config_updater import ConfigPublisher, ConfigSubscriber


class GlobalConfigUpdateEnum(str, Enum):
    """Supported global config update types."""

    add_camera = "add_camera"
    remove_camera = "remove_camera"


@dataclass
class GlobalConfigUpdateTopic:
    update_type: GlobalConfigUpdateEnum

    @property
    def topic(self) -> str:
        return f"config/{self.update_type.name}"


class GlobalConfigUpdatePublisher:
    def __init__(self):
        self.publisher = ConfigPublisher()

    def publish_update(self, topic: GlobalConfigUpdateTopic, config: Any) -> None:
        self.publisher.publish(topic.topic, config)

    def stop(self) -> None:
        self.publisher.stop()


class GlobalConfigUpdateSubscriber:
    def __init__(
        self,
        topics: list[GlobalConfigUpdateEnum],
    ):
        self.topics = topics
        self.subscriber = ConfigSubscriber(
            "config/",
            exact=False,
        )

    def check_for_updates(self) -> list[tuple[GlobalConfigUpdateEnum, Any]]:
        updated_topics: list[tuple[GlobalConfigUpdateEnum, Any]] = []

        # get all updates available
        while True:
            update_topic, payload = self.subscriber.check_for_update()

            if update_topic is None or payload is None:
                break

            _, raw_type = update_topic.split("/")
            update_type = GlobalConfigUpdateEnum[raw_type]

            if update_type in self.topics:
                updated_topics.append((update_type, payload))

        return updated_topics

    def stop(self) -> None:
        self.subscriber.stop()
