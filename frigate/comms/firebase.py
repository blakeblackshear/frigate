import logging
from typing import Any, Callable

import firebase_admin
from firebase_admin import messaging

from frigate.comms.dispatcher import Communicator
from frigate.config import FrigateConfig

logger = logging.getLogger(__name__)


class FirebaseClient(Communicator):  # type: ignore[misc]
    """Frigate wrapper for firebase client."""

    def __init__(self, config: FrigateConfig) -> None:
        firebase_admin.initialize_app(
            options={
                "apiKey": "AIzaSyCoweRLtvai8iNwhsoT-GH_CH_0pckqMmA",
                "authDomain": "frigate-ed674.firebaseapp.com",
                "projectId": "frigate-ed674",
                "storageBucket": "frigate-ed674.appspot.com",
                "messagingSenderId": "76314288339",
                "appId": "1:76314288339:web:090e170610d3bf0966f426",
                "measurementId": "G-GZ1JKNDJZK",
            }
        )

    def subscribe(self, receiver: Callable) -> None:
        """Wrapper for allowing dispatcher to subscribe."""
        pass

    def publish(self, topic: str, payload: Any, retain: bool = False) -> None:
        """Wrapper for publishing when client is in valid state."""
        if topic == "reviews":
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title="Something happened",
                    body="There is a body",
                ),
                tokens=[],
            )
            messaging.send_multicast(message)

    def stop(self) -> None:
        pass
