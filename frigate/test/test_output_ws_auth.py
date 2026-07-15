"""Tests for JSMPEG websocket authorization."""

import unittest
from types import SimpleNamespace

from frigate.config import FrigateConfig
from frigate.output.ws_auth import ws_has_camera_access


class TestWsHasCameraAccess(unittest.TestCase):
    def setUp(self):
        self.config = FrigateConfig(
            mqtt={"host": "mqtt"},
            auth={"roles": {"limited_user": ["front_door"]}},
            cameras={
                "front_door": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {"height": 1080, "width": 1920, "fps": 5},
                },
                "back_door": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.2:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {"height": 1080, "width": 1920, "fps": 5},
                },
            },
        )

    def _make_ws(self, role: str):
        return SimpleNamespace(environ={"HTTP_REMOTE_ROLE": role})

    def test_restricted_role_only_gets_allowed_camera(self):
        ws = self._make_ws("limited_user")
        self.assertTrue(ws_has_camera_access(ws, "front_door", self.config))
        self.assertFalse(ws_has_camera_access(ws, "back_door", self.config))

    def test_unrestricted_role_can_access_any_camera(self):
        ws = self._make_ws("viewer")
        self.assertTrue(ws_has_camera_access(ws, "front_door", self.config))
        self.assertTrue(ws_has_camera_access(ws, "back_door", self.config))

    def test_birdseye_requires_unrestricted_access(self):
        self.assertTrue(
            ws_has_camera_access(self._make_ws("admin"), "birdseye", self.config)
        )
        self.assertTrue(
            ws_has_camera_access(self._make_ws("viewer"), "birdseye", self.config)
        )
        self.assertFalse(
            ws_has_camera_access(self._make_ws("limited_user"), "birdseye", self.config)
        )
