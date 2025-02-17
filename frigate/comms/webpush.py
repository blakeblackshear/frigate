"""Handle sending notifications for Frigate via Firebase."""

import datetime
import json
import logging
import os
import queue
import threading
from dataclasses import dataclass
from multiprocessing.synchronize import Event as MpEvent
from typing import Any, Callable

from py_vapid import Vapid01
from pywebpush import WebPusher

from frigate.comms.base_communicator import Communicator
from frigate.comms.config_updater import ConfigSubscriber
from frigate.config import FrigateConfig
from frigate.const import CONFIG_DIR
from frigate.models import User

logger = logging.getLogger(__name__)


@dataclass
class PushNotification:
    user: str
    payload: dict[str, Any]
    title: str
    message: str
    direct_url: str = ""
    image: str = ""
    notification_type: str = "alert"
    ttl: int = 0


class WebPushClient(Communicator):  # type: ignore[misc]
    """Frigate wrapper for webpush client."""

    def __init__(self, config: FrigateConfig, stop_event: MpEvent) -> None:
        self.config = config
        self.stop_event = stop_event
        self.claim_headers: dict[str, dict[str, str]] = {}
        self.refresh: int = 0
        self.web_pushers: dict[str, list[WebPusher]] = {}
        self.expired_subs: dict[str, list[str]] = {}
        self.suspended_cameras: dict[str, int] = {
            c.name: 0 for c in self.config.cameras.values()
        }
        self.last_camera_notification_time: dict[str, float] = {
            c.name: 0 for c in self.config.cameras.values()
        }
        self.last_notification_time: float = 0
        self.notification_queue: queue.Queue[PushNotification] = queue.Queue()
        self.notification_thread = threading.Thread(
            target=self._process_notifications, daemon=True
        )
        self.notification_thread.start()

        if not self.config.notifications.email:
            logger.warning("Email must be provided for push notifications to be sent.")

        # Pull keys from PEM or generate if they do not exist
        self.vapid = Vapid01.from_file(os.path.join(CONFIG_DIR, "notifications.pem"))

        users: list[User] = (
            User.select(User.username, User.notification_tokens).dicts().iterator()
        )
        for user in users:
            self.web_pushers[user["username"]] = []
            for sub in user["notification_tokens"]:
                self.web_pushers[user["username"]].append(WebPusher(sub))

        # notification config updater
        self.config_subscriber = ConfigSubscriber("config/notifications")

    def subscribe(self, receiver: Callable) -> None:
        """Wrapper for allowing dispatcher to subscribe."""
        pass

    def check_registrations(self) -> None:
        # check for valid claim or create new one
        now = datetime.datetime.now().timestamp()
        if len(self.claim_headers) == 0 or self.refresh < now:
            self.refresh = int(
                (datetime.datetime.now() + datetime.timedelta(hours=1)).timestamp()
            )
            endpoints: set[str] = set()

            # get a unique set of push endpoints
            for pushers in self.web_pushers.values():
                for push in pushers:
                    endpoint: str = push.subscription_info["endpoint"]
                    endpoints.add(endpoint[0 : endpoint.index("/", 10)])

            # create new claim
            for endpoint in endpoints:
                claim = {
                    "sub": f"mailto:{self.config.notifications.email}",
                    "aud": endpoint,
                    "exp": self.refresh,
                }
                self.claim_headers[endpoint] = self.vapid.sign(claim)

    def cleanup_registrations(self) -> None:
        # delete any expired subs
        if len(self.expired_subs) > 0:
            for user, expired in self.expired_subs.items():
                user_subs = []

                # get all subscriptions, removing ones that are expired
                stored_user: User = User.get_by_id(user)
                for token in stored_user.notification_tokens:
                    if token["endpoint"] in expired:
                        continue

                    user_subs.append(token)

                # overwrite the database and reset web pushers
                User.update(notification_tokens=user_subs).where(
                    User.username == user
                ).execute()

                self.web_pushers[user] = []

                for sub in user_subs:
                    self.web_pushers[user].append(WebPusher(sub))

                logger.info(
                    f"Cleaned up {len(expired)} notification subscriptions for {user}"
                )

        self.expired_subs = {}

    def suspend_notifications(self, camera: str, minutes: int) -> None:
        """Suspend notifications for a specific camera."""
        suspend_until = int(
            (datetime.datetime.now() + datetime.timedelta(minutes=minutes)).timestamp()
        )
        self.suspended_cameras[camera] = suspend_until
        logger.info(
            f"Notifications for {camera} suspended until {datetime.datetime.fromtimestamp(suspend_until).strftime('%Y-%m-%d %H:%M:%S')}"
        )

    def unsuspend_notifications(self, camera: str) -> None:
        """Unsuspend notifications for a specific camera."""
        self.suspended_cameras[camera] = 0
        logger.info(f"Notifications for {camera} unsuspended")

    def is_camera_suspended(self, camera: str) -> bool:
        return datetime.datetime.now().timestamp() <= self.suspended_cameras[camera]

    def publish(self, topic: str, payload: Any, retain: bool = False) -> None:
        """Wrapper for publishing when client is in valid state."""
        # check for updated notification config
        _, updated_notification_config = self.config_subscriber.check_for_update()

        if updated_notification_config:
            for key, value in updated_notification_config.items():
                if key == "_global_notifications":
                    self.config.notifications = value

                elif key in self.config.cameras:
                    self.config.cameras[key].notifications = value

        if topic == "reviews":
            decoded = json.loads(payload)
            camera = decoded["before"]["camera"]
            if not self.config.cameras[camera].notifications.enabled:
                return
            if self.is_camera_suspended(camera):
                logger.debug(f"Notifications for {camera} are currently suspended.")
                return
            self.send_alert(decoded)
        elif topic == "notification_test":
            if not self.config.notifications.enabled:
                return
            self.send_notification_test()

    def send_push_notification(
        self,
        user: str,
        payload: dict[str, Any],
        title: str,
        message: str,
        direct_url: str = "",
        image: str = "",
        notification_type: str = "alert",
        ttl: int = 0,
    ) -> None:
        notification = PushNotification(
            user=user,
            payload=payload,
            title=title,
            message=message,
            direct_url=direct_url,
            image=image,
            notification_type=notification_type,
            ttl=ttl,
        )
        self.notification_queue.put(notification)

    def _process_notifications(self) -> None:
        while not self.stop_event.is_set():
            try:
                notification = self.notification_queue.get(timeout=1.0)
                self.check_registrations()

                for pusher in self.web_pushers[notification.user]:
                    endpoint = pusher.subscription_info["endpoint"]
                    headers = self.claim_headers[
                        endpoint[: endpoint.index("/", 10)]
                    ].copy()
                    headers["urgency"] = "high"

                    resp = pusher.send(
                        headers=headers,
                        ttl=notification.ttl,
                        data=json.dumps(
                            {
                                "title": notification.title,
                                "message": notification.message,
                                "direct_url": notification.direct_url,
                                "image": notification.image,
                                "id": notification.payload.get("after", {}).get(
                                    "id", ""
                                ),
                                "type": notification.notification_type,
                            }
                        ),
                        timeout=10,
                    )

                    if resp.status_code in (404, 410):
                        self.expired_subs.setdefault(notification.user, []).append(
                            endpoint
                        )
                    elif resp.status_code != 201:
                        logger.warning(
                            f"Failed to send notification to {notification.user} :: {resp.status_code}"
                        )

            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"Error processing notification: {str(e)}")

    def send_notification_test(self) -> None:
        if not self.config.notifications.email:
            return

        self.check_registrations()

        for user in self.web_pushers:
            self.send_push_notification(
                user=user,
                payload={},
                title="Test Notification",
                message="This is a test notification from Frigate.",
                direct_url="/",
                notification_type="test",
            )

    def send_alert(self, payload: dict[str, Any]) -> None:
        if (
            not self.config.notifications.email
            or payload["after"]["severity"] != "alert"
        ):
            return

        camera: str = payload["after"]["camera"]
        current_time = datetime.datetime.now().timestamp()

        # Check global cooldown period
        if (
            current_time - self.last_notification_time
            < self.config.notifications.cooldown
        ):
            logger.debug(
                f"Skipping notification for {camera} - in global cooldown period"
            )
            return

        # Check camera-specific cooldown period
        if (
            current_time - self.last_camera_notification_time[camera]
            < self.config.cameras[camera].notifications.cooldown
        ):
            logger.debug(
                f"Skipping notification for {camera} - in camera-specific cooldown period"
            )
            return

        self.check_registrations()

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

        self.last_camera_notification_time[camera] = current_time
        self.last_notification_time = current_time

        reviewId = payload["after"]["id"]
        sorted_objects: set[str] = set()

        for obj in payload["after"]["data"]["objects"]:
            if "-verified" not in obj:
                sorted_objects.add(obj)

        sorted_objects.update(payload["after"]["data"]["sub_labels"])

        title = f"{', '.join(sorted_objects).replace('_', ' ').title()}{' was' if state == 'end' else ''} detected in {', '.join(payload['after']['data']['zones']).replace('_', ' ').title()}"
        message = f"Detected on {camera.replace('_', ' ').title()}"
        image = f"{payload['after']['thumb_path'].replace('/media/frigate', '')}"

        # if event is ongoing open to live view otherwise open to recordings view
        direct_url = f"/review?id={reviewId}" if state == "end" else f"/#{camera}"
        ttl = 3600 if state == "end" else 0

        for user in self.web_pushers:
            self.send_push_notification(
                user=user,
                payload=payload,
                title=title,
                message=message,
                direct_url=direct_url,
                image=image,
                ttl=ttl,
            )

        self.cleanup_registrations()

    def stop(self) -> None:
        logger.info("Closing notification queue")
        self.notification_thread.join()
