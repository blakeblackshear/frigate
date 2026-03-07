"""Convenience classes for updating enrichment configurations dynamically."""

from enum import Enum
from typing import Any

from frigate.comms.config_updater import ConfigSubscriber


class EnrichmentConfigEnum(str, Enum):
    """Supported enrichment config update topics."""

    classification = "config/classification"
    classification_custom = "config/classification/custom/"
    face_recognition = "config/face_recognition"
    lpr = "config/lpr"


class EnrichmentConfigSubscriber:
    """Subscribes to all enrichment config updates under ``config/``."""

    def __init__(self) -> None:
        self.subscriber = ConfigSubscriber("config/")

    def check_for_update(
        self,
    ) -> tuple[EnrichmentConfigEnum, str, Any] | tuple[None, None, None]:
        """Check for an enrichment config update.

        Returns:
            A tuple of (update_type, topic, payload) or (None, None, None)
            if no update is available. For custom classification topics the
            full topic string is returned so the model name can be extracted.
        """
        topic, payload = self.subscriber.check_for_update()

        if topic is None:
            return (None, None, None)

        for member in EnrichmentConfigEnum:
            if topic == member.value or (
                member == EnrichmentConfigEnum.classification_custom
                and topic.startswith(member.value)
            ):
                return (member, topic, payload)

        return (None, None, None)

    def stop(self) -> None:
        self.subscriber.stop()
