"""Tests for camera monitoring notification authorization."""

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock

from frigate.comms.webpush import WebPushClient


class TestCameraMonitoringNotifications(unittest.TestCase):
    def test_send_camera_monitoring_filters_by_camera_access(self):
        client = WebPushClient.__new__(WebPushClient)
        client.config = SimpleNamespace(
            cameras={"front_door": SimpleNamespace(friendly_name=None)}
        )
        client.web_pushers = {"allowed": [], "denied": []}
        client.user_cameras = {"allowed": {"front_door"}, "denied": set()}
        client.check_registrations = MagicMock()
        client.cleanup_registrations = MagicMock()
        client.send_push_notification = MagicMock()

        client.send_camera_monitoring(
            {"camera": "front_door", "message": "Monitoring condition met"}
        )

        self.assertEqual(client.send_push_notification.call_count, 1)
        self.assertEqual(
            client.send_push_notification.call_args.kwargs["user"], "allowed"
        )