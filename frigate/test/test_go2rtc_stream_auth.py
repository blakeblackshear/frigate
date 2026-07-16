"""Unit tests for `deny_response_for_go2rtc_stream`.

Covers the camera-level authorization enforced in the `/auth` subrequest for
the nginx-proxied go2rtc live-stream paths (MSE/WebRTC WebSockets and the
WebRTC signaling endpoint). These paths name the stream via the `src` query
param, which the static-media auth in `media_auth` does not inspect.
"""

import types
import unittest

from frigate.api.auth import deny_response_for_go2rtc_stream
from frigate.config import FrigateConfig

_CONFIG = {
    "mqtt": {"host": "mqtt"},
    "auth": {
        "roles": {
            "limited_user": ["front_door"],
            "dual_user": ["front_door", "back_door"],
        }
    },
    "cameras": {
        "front_door": {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}]
            },
            "detect": {"height": 1080, "width": 1920, "fps": 5},
            # go2rtc stream name differs from the camera name (substream)
            "live": {"streams": {"Main Stream": "front_door_sub"}},
        },
        "back_door": {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.2:554/video", "roles": ["detect"]}]
            },
            "detect": {"height": 1080, "width": 1920, "fps": 5},
        },
        "garage": {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.3:554/video", "roles": ["detect"]}]
            },
            "detect": {"height": 1080, "width": 1920, "fps": 5},
        },
    },
}


def _request(config: FrigateConfig) -> types.SimpleNamespace:
    return types.SimpleNamespace(app=types.SimpleNamespace(frigate_config=config))


class TestDenyResponseForGo2rtcStream(unittest.TestCase):
    def setUp(self) -> None:
        self.config = FrigateConfig(**_CONFIG)
        self.request = _request(self.config)

    def _deny(self, url: str, role: str):
        return deny_response_for_go2rtc_stream(url, role, self.request)

    # --- non-stream paths pass through ---

    def test_non_stream_path_passes_through(self):
        self.assertIsNone(
            self._deny("http://host/clips/back_door-1.jpg", "limited_user")
        )

    def test_empty_url_passes_through(self):
        self.assertIsNone(self._deny("", "limited_user"))

    def test_jsmpeg_path_not_handled_here(self):
        # jsmpeg is authorized per-frame in the output pipeline, not here
        self.assertIsNone(
            self._deny("http://host/live/jsmpeg/back_door", "limited_user")
        )

    # --- restricted role: allowed vs forbidden cameras ---

    def test_mse_allowed_camera(self):
        self.assertIsNone(
            self._deny("http://host/live/mse/api/ws?src=front_door", "limited_user")
        )

    def test_mse_forbidden_camera_denied(self):
        self.assertEqual(
            self._deny("http://host/live/mse/api/ws?src=back_door", "limited_user"),
            403,
        )

    def test_webrtc_ws_forbidden_camera_denied(self):
        self.assertEqual(
            self._deny("http://host/live/webrtc/api/ws?src=back_door", "limited_user"),
            403,
        )

    def test_webrtc_signaling_forbidden_camera_denied(self):
        self.assertEqual(
            self._deny("http://host/api/go2rtc/webrtc?src=back_door", "limited_user"),
            403,
        )

    def test_unknown_camera_denied(self):
        self.assertEqual(
            self._deny("http://host/live/mse/api/ws?src=nonexistent", "limited_user"),
            403,
        )

    def test_missing_src_denied(self):
        self.assertEqual(self._deny("http://host/live/mse/api/ws", "limited_user"), 403)

    # --- multi-camera role: each assigned camera allowed, others denied ---

    def test_multi_camera_role_allows_first_assigned(self):
        self.assertIsNone(
            self._deny("http://host/live/mse/api/ws?src=front_door", "dual_user")
        )

    def test_multi_camera_role_allows_second_assigned(self):
        self.assertIsNone(
            self._deny("http://host/live/mse/api/ws?src=back_door", "dual_user")
        )

    def test_multi_camera_role_denies_unassigned(self):
        # garage is configured but not in dual_user's allow-list
        self.assertEqual(
            self._deny("http://host/live/mse/api/ws?src=garage", "dual_user"),
            403,
        )

    # --- substream names resolve to their owning camera ---

    def test_allowed_substream_resolves_to_owning_camera(self):
        # front_door_sub is owned by front_door, which limited_user may access
        self.assertIsNone(
            self._deny("http://host/live/mse/api/ws?src=front_door_sub", "limited_user")
        )

    # --- multiple src values: deny if any is forbidden ---

    def test_multiple_src_one_forbidden_denied(self):
        self.assertEqual(
            self._deny(
                "http://host/live/mse/api/ws?src=front_door&src=back_door",
                "limited_user",
            ),
            403,
        )

    def test_multiple_src_all_allowed(self):
        self.assertIsNone(
            self._deny(
                "http://host/live/mse/api/ws?src=front_door&src=front_door_sub",
                "limited_user",
            )
        )

    # --- privileged roles bypass the check ---

    def test_admin_bypasses(self):
        self.assertIsNone(
            self._deny("http://host/live/mse/api/ws?src=back_door", "admin")
        )

    def test_builtin_viewer_role_bypasses(self):
        # the built-in viewer role is not in the config allow-list map, so it
        # is treated as full access
        self.assertIsNone(
            self._deny("http://host/live/mse/api/ws?src=back_door", "viewer")
        )

    def test_missing_role_bypasses(self):
        self.assertIsNone(self._deny("http://host/live/mse/api/ws?src=back_door", None))


if __name__ == "__main__":
    unittest.main()
