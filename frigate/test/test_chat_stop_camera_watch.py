"""Tests for camera watch ownership in the chat tools."""

import asyncio
import threading
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from frigate.api.chat import _execute_start_camera_watch, _execute_stop_camera_watch
from frigate.jobs.vlm_watch import MAX_WATCH_MINUTES, VLMWatchJob, VLMWatchRunner
from frigate.types import JobStatusTypesEnum


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

    @patch("frigate.api.chat.require_camera_access", new_callable=AsyncMock)
    @patch("frigate.api.chat.start_vlm_watch_job", return_value="job1")
    def test_rejects_non_string_labels_and_clamps_duration(self, start, _access):
        request = _request("alice", "viewer")
        request.app = MagicMock()
        request.app.frigate_config.cameras = {"front": None}
        request.app.genai_manager.chat_client.supports_vision = True
        arguments = {"camera": "front", "condition": "person"}

        result = asyncio.run(
            _execute_start_camera_watch(request, {**arguments, "labels": [1]})
        )
        self.assertIn("error", result)
        start.assert_not_called()

        asyncio.run(
            _execute_start_camera_watch(
                request, {**arguments, "max_duration_minutes": 1e308}
            )
        )
        self.assertEqual(
            start.call_args.kwargs["max_duration_minutes"], MAX_WATCH_MINUTES
        )


class TestWatchRunnerSetup(unittest.TestCase):
    @patch("frigate.jobs.vlm_watch.DetectionSubscriber")
    @patch("frigate.jobs.vlm_watch.InterProcessRequestor")
    def test_setup_error_fails_job_and_closes_sockets(self, requestor, subscriber):
        job = VLMWatchJob(camera="front", condition="person", labels=[1])
        runner = VLMWatchRunner(
            job=job,
            config=MagicMock(),
            cancel_event=threading.Event(),
            frame_processor=MagicMock(),
            genai_manager=MagicMock(),
            dispatcher=MagicMock(),
        )

        runner.run()

        self.assertEqual(job.status, JobStatusTypesEnum.failed)
        requestor.return_value.stop.assert_called_once()
        subscriber.return_value.stop.assert_called_once()


if __name__ == "__main__":
    unittest.main()
