"""Unit tests for `deny_response_for_go2rtc_stream`.

Covers the camera-level authorization enforced in the `/auth` subrequest for
the nginx-proxied go2rtc live-stream paths (MSE/WebRTC WebSockets and the
WebRTC signaling endpoint). These paths name the stream via the `src` query
param, which the static-media auth in `media_auth` does not inspect.
"""

import types
import unittest
from unittest.mock import MagicMock, patch

import requests

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
    "go2rtc": {"streams": {"doorbell_audio": ["rtsp://10.0.0.4:554/audio"]}},
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
    return types.SimpleNamespace(
        app=types.SimpleNamespace(frigate_config=config), headers={}
    )


class TestDenyResponseForGo2rtcStream(unittest.TestCase):
    def setUp(self) -> None:
        self.config = FrigateConfig(**_CONFIG)
        self.request = _request(self.config)

        # go2rtc is not running in tests; individual tests override this
        get_patch = patch(
            "frigate.api.auth.requests.get",
            side_effect=requests.ConnectionError("go2rtc unavailable"),
        )
        self.mock_get = get_patch.start()
        self.addCleanup(get_patch.stop)

    def _go2rtc_streams(self, *names: str) -> None:
        response = MagicMock(ok=True)
        response.json.return_value = {name: {} for name in names}
        self.mock_get.side_effect = None
        self.mock_get.return_value = response

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

    # --- ad hoc sources are denied for every role ---

    def test_ad_hoc_ffmpeg_source_denied_for_all_roles(self):
        # shape of the source in GHSA-93xj-hg88-ffg7
        src = "ffmpeg:%23input%3D'-f''h264''-i''data:placeholder''-c''copy'"
        for path in (
            "/live/mse/api/ws",
            "/live/webrtc/api/ws",
            "/api/go2rtc/webrtc",
        ):
            for role in ("viewer", "admin", "limited_user", None):
                self.assertEqual(
                    self._deny(f"http://host{path}?src={src}", role),
                    403,
                    f"{path} {role}",
                )

    def test_ad_hoc_source_with_name_param_denied(self):
        # name= would otherwise let go2rtc replace an existing stream's source
        self.assertEqual(
            self._deny(
                "http://host/live/mse/api/ws?src=ffmpeg:x%23video%3Dh264"
                "&name=front_door",
                "admin",
            ),
            403,
        )

    def test_ad_hoc_source_after_existing_src_denied(self):
        self.assertEqual(
            self._deny(
                "http://host/live/mse/api/ws?src=front_door&src=exec:x", "viewer"
            ),
            403,
        )

    def test_unknown_stream_denied_for_admin(self):
        self.assertEqual(
            self._deny("http://host/live/mse/api/ws?src=nonexistent", "admin"), 403
        )

    def test_blank_src_denied_for_admin(self):
        self.assertEqual(self._deny("http://host/live/mse/api/ws?src=", "admin"), 403)

    def test_go2rtc_config_stream_allowed(self):
        self.assertIsNone(
            self._deny("http://host/live/mse/api/ws?src=doorbell_audio", "viewer")
        )
        self.mock_get.assert_not_called()

    def test_runtime_go2rtc_stream_allowed(self):
        # streams added through PUT /go2rtc/streams only exist in go2rtc
        self._go2rtc_streams("front_door", "wizard_test")
        self.assertIsNone(
            self._deny("http://host/live/mse/api/ws?src=wizard_test", "admin")
        )

    def test_runtime_lookup_does_not_admit_ad_hoc_source(self):
        self._go2rtc_streams("front_door", "wizard_test")
        self.assertEqual(
            self._deny("http://host/live/mse/api/ws?src=ffmpeg:wizard_test", "admin"),
            403,
        )

    def test_go2rtc_error_fails_closed(self):
        self.mock_get.side_effect = None
        self.mock_get.return_value = MagicMock(ok=False)
        self.assertEqual(
            self._deny("http://host/live/mse/api/ws?src=wizard_test", "admin"), 403
        )

    # --- path spellings nginx normalizes before matching its location ---

    def test_path_variants_are_checked(self):
        for path in (
            "/live/mse/api/%77s",
            "/live/mse/api%2Fws",
            "//live/mse/api/ws",
            "/live//mse/api/ws",
            "/live/mse/api/./ws",
            "/live/other/../mse/api/ws",
            "/live/mse/api/%2e/ws",
            "/%6Cive/webrtc/api/ws",
            "/api/go2rtc/%77ebrtc",
            "/live/mse/api/ws/",
            "/live/mse/api/ws/extra",
            "http://host//live/mse/api/ws",
        ):
            self.assertEqual(self._deny(f"{path}?src=nonexistent", "viewer"), 403, path)

    def test_path_variants_allow_existing_stream(self):
        self.assertIsNone(self._deny("/live/mse/api/%77s?src=front_door", "viewer"))

    def test_nginx_marker_applies_check(self):
        self.request.headers = {"x-go2rtc-stream-proxy": "1"}
        self.assertEqual(self._deny("/unexpected?src=nonexistent", "viewer"), 403)

    def test_unrelated_paths_not_checked(self):
        for path in ("/live/mse/api", "/api/go2rtc/streams", "/live/jsmpeg/x"):
            self.assertIsNone(self._deny(f"{path}?src=nonexistent", "viewer"), path)


if __name__ == "__main__":
    unittest.main()
