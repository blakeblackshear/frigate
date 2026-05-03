"""Tests for /debug_replay API endpoints."""

from unittest.mock import patch

from frigate.models import Event, Recordings, ReviewSegment
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp


class TestDebugReplayAPI(BaseTestHttp):
    def setUp(self):
        super().setUp([Event, Recordings, ReviewSegment])
        self.app = self.create_app()

    def test_start_returns_202_with_job_id(self):
        # Stub the factory to skip validation/threading and just record the
        # name on the manager the way the real factory's mark_starting would.
        def fake_start(**kwargs):
            kwargs["replay_manager"].mark_starting(
                source_camera=kwargs["source_camera"],
                replay_camera_name="_replay_front",
                start_ts=kwargs["start_ts"],
                end_ts=kwargs["end_ts"],
            )
            return "job-1234"

        with patch(
            "frigate.api.debug_replay.start_debug_replay_job",
            side_effect=fake_start,
        ):
            with AuthTestClient(self.app) as client:
                resp = client.post(
                    "/debug_replay/start",
                    json={
                        "camera": "front",
                        "start_time": 100,
                        "end_time": 200,
                    },
                )

        self.assertEqual(resp.status_code, 202)
        body = resp.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["job_id"], "job-1234")
        self.assertEqual(body["replay_camera"], "_replay_front")

    def test_start_returns_400_on_validation_error(self):
        with patch(
            "frigate.api.debug_replay.start_debug_replay_job",
            side_effect=ValueError("Camera 'missing' not found"),
        ):
            with AuthTestClient(self.app) as client:
                resp = client.post(
                    "/debug_replay/start",
                    json={
                        "camera": "missing",
                        "start_time": 100,
                        "end_time": 200,
                    },
                )

        self.assertEqual(resp.status_code, 400)
        body = resp.json()
        self.assertFalse(body["success"])
        # Message is hard-coded so we don't echo exception text back to clients
        # (CodeQL: information exposure through an exception).
        self.assertEqual(body["message"], "Invalid debug replay parameters")

    def test_start_returns_409_when_session_already_active(self):
        with patch(
            "frigate.api.debug_replay.start_debug_replay_job",
            side_effect=RuntimeError("A replay session is already active"),
        ):
            with AuthTestClient(self.app) as client:
                resp = client.post(
                    "/debug_replay/start",
                    json={
                        "camera": "front",
                        "start_time": 100,
                        "end_time": 200,
                    },
                )

        self.assertEqual(resp.status_code, 409)
        body = resp.json()
        self.assertFalse(body["success"])

    def test_status_inactive_when_no_session(self):
        with AuthTestClient(self.app) as client:
            resp = client.get("/debug_replay/status")

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertFalse(body["active"])
        self.assertIsNone(body["replay_camera"])
        self.assertIsNone(body["source_camera"])
        self.assertIsNone(body["start_time"])
        self.assertIsNone(body["end_time"])
        self.assertFalse(body["live_ready"])
        # Make sure deprecated fields are gone
        self.assertNotIn("state", body)
        self.assertNotIn("progress_percent", body)
        self.assertNotIn("error_message", body)

    def test_status_active_after_mark_starting(self):
        manager = self.app.replay_manager
        manager.mark_starting(
            source_camera="front",
            replay_camera_name="_replay_front",
            start_ts=100.0,
            end_ts=200.0,
        )

        with AuthTestClient(self.app) as client:
            resp = client.get("/debug_replay/status")

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["active"])
        self.assertEqual(body["replay_camera"], "_replay_front")
        self.assertEqual(body["source_camera"], "front")
        self.assertEqual(body["start_time"], 100.0)
        self.assertEqual(body["end_time"], 200.0)
        self.assertFalse(body["live_ready"])
