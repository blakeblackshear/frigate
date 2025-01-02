import json
import logging
import queue
import threading
from dataclasses import dataclass
from multiprocessing.synchronize import Event as MpEvent
from typing import Any

from webpush import WebPushClient

from frigate.config import FrigateConfig

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


class AsyncWebPushClient(WebPushClient):
    def __init__(self, config: FrigateConfig, stop_event: MpEvent) -> None:
        super().__init__(config)
        self.notification_queue: queue.Queue[PushNotification] = queue.Queue()
        self.notification_thread = threading.Thread(
            target=self._process_notifications, daemon=True
        )
        self.notification_thread.start()
        self.stop_event = stop_event

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

                self.cleanup_registrations()
                self.notification_queue.task_done()

            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"Error processing notification: {str(e)}")

    def stop(self) -> None:
        self.notification_thread.join()
        super().stop()
