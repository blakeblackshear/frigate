"""Tests for /debug_replay API endpoints."""

from unittest.mock import patch

from frigate.debug_replay import ReplayState
from frigate.models import Event, Recordings, ReviewSegment
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp


class TestDebugReplayAPI(BaseTestHttp):
    def setUp(self):
        super().setUp([Event, Recordings, ReviewSegment])
        self.app = self.create_app()

    def test_start_returns_202_with_state_preparing_clip(self):
        with patch(
            "frigate.debug_replay.DebugReplayManager.start",
            return_value="_replay_front",
        ):
            with patch.object(
                type(self.app.replay_manager),
                "state",
                new_callable=lambda: property(lambda s: ReplayState.preparing_clip),
            ):
                with AuthTestClient(self.app) as client:
                    resp = client.post(
                        "/debug_replay/start",
                        json={
                            "camera": "front",
                            "start_time": 100,
                            "end_time": 200,
                        },
                        headers={"remote-user": "admin", "remote-role": "admin"},
                    )

        self.assertEqual(resp.status_code, 202)
        body = resp.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["replay_camera"], "_replay_front")
        self.assertEqual(body["state"], "preparing_clip")

    def test_status_returns_state_and_error_message(self):
        manager = self.app.replay_manager
        manager._set_state(ReplayState.error, error_message="ffmpeg failed: boom")

        with AuthTestClient(self.app) as client:
            resp = client.get(
                "/debug_replay/status",
                headers={"remote-user": "admin", "remote-role": "admin"},
            )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["state"], "error")
        self.assertEqual(body["error_message"], "ffmpeg failed: boom")
        self.assertIsNone(body["progress_percent"])
        self.assertFalse(body["active"])

    def test_status_returns_progress_percent_during_preparing_clip(self):
        manager = self.app.replay_manager
        manager._set_state(ReplayState.preparing_clip)
        manager.progress_percent = 37.5

        with AuthTestClient(self.app) as client:
            resp = client.get(
                "/debug_replay/status",
                headers={"remote-user": "admin", "remote-role": "admin"},
            )

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["progress_percent"], 37.5)
