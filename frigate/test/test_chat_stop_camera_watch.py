"""Tests for the stop_camera_watch chat tool."""

import unittest
from types import SimpleNamespace
from unittest.mock import patch

from frigate.api.chat import _execute_stop_camera_watch
from frigate.jobs.vlm_watch import VLMWatchJob


def _request(user: str, role: str) -> SimpleNamespace:
    return SimpleNamespace(headers={"remote-user": user, "remote-role": role})


class TestStopCameraWatch(unittest.TestCase):
    def setUp(self):
        job = VLMWatchJob(camera="front", condition="person", username="alice")
        patch("frigate.api.chat.get_vlm_watch_job", return_value=job).start()
        self.stop = patch(
            "frigate.api.chat.stop_vlm_watch_job", return_value=True
        ).start()
        self.addCleanup(patch.stopall)

    def test_other_user_cannot_cancel(self):
        result = _execute_stop_camera_watch(_request("bob", "viewer"))

        self.assertFalse(result["success"])
        self.stop.assert_not_called()

    def test_creator_can_cancel(self):
        result = _execute_stop_camera_watch(_request("alice", "viewer"))

        self.assertTrue(result["success"])
        self.stop.assert_called_once()

    def test_admin_can_cancel(self):
        result = _execute_stop_camera_watch(_request("bob", "admin"))

        self.assertTrue(result["success"])
        self.stop.assert_called_once()


if __name__ == "__main__":
    unittest.main()
