"""Tests for camera watch ownership in the chat tools."""

import asyncio
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from frigate.api.chat import _execute_start_camera_watch, _execute_stop_camera_watch
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


class TestStartCameraWatch(unittest.TestCase):
    @patch("frigate.api.chat.require_camera_access", new_callable=AsyncMock)
    @patch("frigate.api.chat.start_vlm_watch_job", return_value="job1")
    def test_records_caller_as_owner(self, start, _access):
        request = _request("alice", "viewer")
        request.app = MagicMock()
        request.app.frigate_config.cameras = {"front": None}
        request.app.genai_manager.chat_client.supports_vision = True

        asyncio.run(
            _execute_start_camera_watch(
                request, {"camera": "front", "condition": "person"}
            )
        )

        self.assertEqual(start.call_args.kwargs["username"], "alice")


if __name__ == "__main__":
    unittest.main()
