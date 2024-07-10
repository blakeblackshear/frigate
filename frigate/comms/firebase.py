"""Handle sending notifications for Frigate via Firebase."""

import json
import logging
import threading
from multiprocessing.synchronize import Event as MpEvent
from typing import Any, Callable

import firebase_admin
from firebase_admin import credentials, messaging

from frigate.comms.dispatcher import Communicator
from frigate.config import FrigateConfig

logger = logging.getLogger(__name__)


class FirebaseClient(Communicator):  # type: ignore[misc]
    """Frigate wrapper for firebase client."""

    def __init__(self, config: FrigateConfig, stop_event: MpEvent) -> None:
        self.messenger = FirebaseMessenger(config, stop_event)
        self.messenger.start()

    def subscribe(self, receiver: Callable) -> None:
        """Wrapper for allowing dispatcher to subscribe."""
        pass

    def publish(self, topic: str, payload: Any, retain: bool = False) -> None:
        """Wrapper for publishing when client is in valid state."""
        logger.info(f"got a message on {topic}")
        if topic == "reviews":
            self.messenger.send_message(json.loads(payload))

    def stop(self) -> None:
        pass


class FirebaseMessenger(threading.Thread):
    def __init__(self, config: FrigateConfig, stop_event: MpEvent) -> None:
        threading.Thread.__init__(self)
        self.name = "firebase_messenger"
        self.config = config
        self.stop_event = stop_event

    def send_message(self, payload: dict[str, any]) -> None:
        state = payload["type"]
        sorted_objects: set[str] = set()

        for obj in payload["after"]["data"]["objects"]:
            if "-verified" not in obj:
                sorted_objects.add(obj)

        sorted_objects.update(payload["after"]["data"]["sub_labels"])

        title = f"{', '.join(sorted_objects).replace('_', ' ')}{' was' if state == 'end' else ''} detected in {', '.join(payload['after']['data']['zones']).replace('_', ' ')}"
        logger.info(f"sending message with title {title}")
        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=f"{', '.join(sorted_objects).replace('_', ' ')}{' was' if state == 'end' else ''} detected in {', '.join(payload['after']['data']['zones']).replace('_', ' ')}",
                body=f"Detected on {payload['after']['camera']}",
            ),
            tokens=[
                "cNNicZp6S92qn4kAVJnzd7:APA91bGv-MvDmNoZ2xqJTkPyCTmyv2WG0tfwIqWUuNtq3SXlpQJpdPCCjTEehOLDa0Yphv__KdxOQYEfaFvYfTW2qQevX-tSnRCVa_sJazQ_rfTervpo_zBVJD1T5GfYaY6kr41Wr_fP"
            ],
        )
        messaging.send_multicast(message)

    def run(self) -> None:
        logger.info("Starting notifications setup")

        try:
            firebase_admin.get_app()
        except ValueError:
            cred = credentials.Certificate("/config/firebase-priv-key.json")
            firebase_admin.initialize_app(credential=cred)

        logger.info("finished notifications startup")

        while self.stop_event.wait(0.1):
            # TODO check for a delete invalid tokens
            pass
