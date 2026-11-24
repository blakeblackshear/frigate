"""Tests for trigger push notifications."""

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock

from frigate.comms.webpush import WebPushClient


class TestTriggerNotification(unittest.TestCase):
    def test_image_is_the_triggering_event_thumbnail(self):
        client = WebPushClient.__new__(WebPushClient)
        client.config = SimpleNamespace(
            notifications=SimpleNamespace(email="admin@example.com"),
            cameras={"front_door": SimpleNamespace(friendly_name=None)},
        )
        client.web_pushers = {"admin": []}
        client.user_cameras = {"admin": {"front_door"}}
        client.last_camera_notification_time = {}
        client._within_cooldown = MagicMock(return_value=False)
        client.check_registrations = MagicMock()
        client.cleanup_registrations = MagicMock()
        client.send_push_notification = MagicMock()

        client.send_trigger(
            {
                "camera": "front_door",
                "event_id": "1700000000.0-abc123",
                "name": "red_car",
                "type": "thumbnail",
                "score": 0.9,
            }
        )

        self.assertEqual(
            client.send_push_notification.call_args.kwargs["image"],
            "api/events/1700000000.0-abc123/thumbnail.webp",
        )


if __name__ == "__main__":
    unittest.main()
