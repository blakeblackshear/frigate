"""Handle sending notifications for Frigate via Firebase."""

import datetime
import json
import logging
import os
from typing import Any, Callable

from py_vapid import Vapid01
from pywebpush import WebPusher

from frigate.comms.dispatcher import Communicator
from frigate.config import FrigateConfig
from frigate.const import CONFIG_DIR
from frigate.models import User

logger = logging.getLogger(__name__)


class WebPushClient(Communicator):  # type: ignore[misc]
    """Frigate wrapper for firebase client."""

    def __init__(self, config: FrigateConfig) -> None:
        self.config = config
        self.claim = None
        self.claim_headers = None
        self.web_pushers: list[WebPusher] = []

        # Pull keys from PEM or generate if they do not exist
        self.vapid = Vapid01.from_file(os.path.join(CONFIG_DIR, "notifications.pem"))

        users: list[User] = User.select(User.notification_tokens).dicts().iterator()
        for user in users:
            for sub in user["notification_tokens"]:
                self.web_pushers.append(WebPusher(sub))

    def subscribe(self, receiver: Callable) -> None:
        """Wrapper for allowing dispatcher to subscribe."""
        pass

    def publish(self, topic: str, payload: Any, retain: bool = False) -> None:
        """Wrapper for publishing when client is in valid state."""
        if topic == "reviews":
            self.send_message(json.loads(payload))

    def send_message(self, payload: dict[str, any]) -> None:
        # check for valid claim or create new one
        now = datetime.datetime.now().timestamp()
        if self.claim is None or self.claim["exp"] < now:
            # create new claim
            self.claim = {
                "sub": "mailto:test@example.com",
                "aud": "https://fcm.googleapis.com",
                "exp": (
                    datetime.datetime.now() + datetime.timedelta(hours=1)
                ).timestamp(),
            }
            self.claim_headers = self.vapid.sign(self.claim)
            logger.info(f"Updated claim with new headers {self.claim_headers}")

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

        for pusher in self.web_pushers:
            pusher.send(
                headers=self.claim_headers,
                ttl=0,
                data=json.dumps({
                    "title": title,
                    "message": message,
                    "direct_url": direct_url,
                    "image": image,
                }),
            )

    def stop(self) -> None:
        pass
