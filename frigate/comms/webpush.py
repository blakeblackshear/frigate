"""Handle sending notifications for Frigate via Firebase."""

import json
import logging
from typing import Any, Callable

from frigate.comms.dispatcher import Communicator
from frigate.config import FrigateConfig
from frigate.models import User

logger = logging.getLogger(__name__)


class WebPushClient(Communicator):  # type: ignore[misc]
    """Frigate wrapper for firebase client."""

    def __init__(self, config: FrigateConfig) -> None:
        self.config = config
        # TODO check for VAPID key

        self.tokens = []
        self.invalid_tokens = []

        users: list[User] = User.select(User.notification_tokens).dicts().iterator()

        for user in users:
            self.tokens.extend(user["notification_tokens"])

    def subscribe(self, receiver: Callable) -> None:
        """Wrapper for allowing dispatcher to subscribe."""
        pass

    def publish(self, topic: str, payload: Any, retain: bool = False) -> None:
        """Wrapper for publishing when client is in valid state."""
        if topic == "reviews":
            self.send_message(json.loads(payload))

    def send_message(self, payload: dict[str, any]) -> None:
        # Only notify for alerts
        if payload["after"]["severity"] != "alert":
            return

        state = payload["type"]

        # Don't notify if message is an update and important fields don't have an update
        if (
            state == "update"
            and len(payload["before"]["data"]["objects"])
            == len(payload["after"]["data"]["objects"])
            and len(payload["before"]["data"]["zones"])
            == len(payload["after"]["data"]["zones"])
        ):
            return

        reviewId = payload["after"]["id"]
        sorted_objects: set[str] = set()

        for obj in payload["after"]["data"]["objects"]:
            if "-verified" not in obj:
                sorted_objects.add(obj)

        sorted_objects.update(payload["after"]["data"]["sub_labels"])

        title = f"{', '.join(sorted_objects).replace('_', ' ').title()}{' was' if state == 'end' else ''} detected in {', '.join(payload['after']['data']['zones']).replace('_', ' ').title()}"
        message = f"Detected on {payload['after']['camera'].replace('_', ' ').title()}"
        direct_url = f"{self.config.notifications.base_url}/review?id={reviewId}"
        image = f'{self.config.notifications.base_url}{payload["after"]["thumb_path"].replace("/media/frigate", "")}'

    def stop(self) -> None:
        pass
