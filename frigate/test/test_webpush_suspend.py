"""Tests for notification suspension expiry handling."""

import datetime
import unittest
from unittest.mock import MagicMock

from frigate.comms.webpush import WebPushClient


class TestSuspensionExpiry(unittest.TestCase):
    def _make_client(self, suspended_cameras: dict[str, int]) -> WebPushClient:
        client = WebPushClient.__new__(WebPushClient)
        client.suspended_cameras = suspended_cameras
        client.suspension_broadcaster = MagicMock()
        return client

    def test_clears_and_broadcasts_expired_suspension(self):
        now = datetime.datetime.now().timestamp()
        client = self._make_client({"front_door": int(now - 60)})

        client._clear_expired_suspensions()

        self.assertEqual(client.suspended_cameras["front_door"], 0)
        client.suspension_broadcaster.assert_called_once_with(
            "front_door/notifications/suspended", "0", True
        )

    def test_leaves_active_suspension_untouched(self):
        now = datetime.datetime.now().timestamp()
        suspend_until = int(now + 3600)
        client = self._make_client({"front_door": suspend_until})

        client._clear_expired_suspensions()

        self.assertEqual(client.suspended_cameras["front_door"], suspend_until)
        client.suspension_broadcaster.assert_not_called()

    def test_ignores_unsuspended_camera(self):
        client = self._make_client({"front_door": 0})

        client._clear_expired_suspensions()

        self.assertEqual(client.suspended_cameras["front_door"], 0)
        client.suspension_broadcaster.assert_not_called()

    def test_only_expired_cameras_are_cleared(self):
        now = datetime.datetime.now().timestamp()
        active_until = int(now + 3600)
        client = self._make_client(
            {
                "expired": int(now - 5),
                "active": active_until,
                "idle": 0,
            }
        )

        client._clear_expired_suspensions()

        self.assertEqual(client.suspended_cameras["expired"], 0)
        self.assertEqual(client.suspended_cameras["active"], active_until)
        self.assertEqual(client.suspended_cameras["idle"], 0)
        client.suspension_broadcaster.assert_called_once_with(
            "expired/notifications/suspended", "0", True
        )
