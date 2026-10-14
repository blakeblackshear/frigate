"""Tests for the /auth subrequest on nginx-proxied go2rtc live-stream paths."""

import time
from unittest.mock import patch

import requests
from fastapi.testclient import TestClient
from joserfc.jwk import OctKey

from frigate.api.auth import create_encoded_jwt
from frigate.models import Event, Recordings, ReviewSegment, User
from frigate.test.http_api.base_http_test import BaseTestHttp

_CONFIG = {
    "mqtt": {"host": "mqtt"},
    "cameras": {
        "front_door": {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}]
            },
            "detect": {"height": 1080, "width": 1920, "fps": 5},
        },
    },
}

# shape of the source in GHSA-93xj-hg88-ffg7, with the payload replaced
_AD_HOC_SRC = "ffmpeg:%23input%3D'-f''h264''-i''data:placeholder''-c''copy'"


class TestGo2rtcProxyAuth(BaseTestHttp):
    def setUp(self):
        super().setUp([Event, ReviewSegment, Recordings, User])
        self.minimal_config = _CONFIG
        self.app = super().create_app()
        self.app.jwt_token = OctKey.import_key(b"0" * 32)

        get_patch = patch(
            "frigate.api.auth.requests.get",
            side_effect=requests.ConnectionError("go2rtc unavailable"),
        )
        get_patch.start()
        self.addCleanup(get_patch.stop)

    def _auth(self, role: str, original_url: str):
        token = create_encoded_jwt(
            role, role, int(time.time()) + 3600, self.app.jwt_token
        )
        with TestClient(self.app) as client:
            return client.get(
                "/auth",
                headers={
                    "authorization": f"Bearer {token}",
                    "x-original-url": original_url,
                },
            )

    def test_viewer_ad_hoc_mse_source_denied(self):
        resp = self._auth("viewer", f"/live/mse/api/ws?src={_AD_HOC_SRC}")
        assert resp.status_code == 403

    def test_viewer_ad_hoc_webrtc_sources_denied(self):
        for path in ("/live/webrtc/api/ws", "/api/go2rtc/webrtc"):
            resp = self._auth("viewer", f"{path}?src={_AD_HOC_SRC}")
            assert resp.status_code == 403, path

    def test_admin_ad_hoc_mse_source_denied(self):
        resp = self._auth("admin", f"/live/mse/api/ws?src={_AD_HOC_SRC}")
        assert resp.status_code == 403

    def test_viewer_camera_stream_allowed(self):
        resp = self._auth("viewer", "/live/mse/api/ws?src=front_door")
        assert resp.status_code == 202
        assert resp.headers["remote-role"] == "viewer"
