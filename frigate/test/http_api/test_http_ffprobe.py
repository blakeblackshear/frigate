"""Tests for credential scrubbing in the ffprobe API."""

from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient

from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp


class TestHttpFfprobe(BaseTestHttp):
    def setUp(self):
        super().setUp([])
        self.app = self.create_app()

    def client(self) -> TestClient:
        return AuthTestClient(self.app)

    def test_failed_probe_scrubs_credentials_from_stderr(self):
        failed = SimpleNamespace(
            returncode=1,
            stdout=b"",
            stderr=(
                b"[tcp @ 0x1] Connection to tcp://10.0.0.1:554 failed\n"
                b"rtsp://admin:hunter2@10.0.0.1:554/video: Connection refused\n"
            ),
        )

        with patch("frigate.api.camera.ffprobe_stream", return_value=failed):
            with self.client() as client:
                response = client.get("/ffprobe", params={"paths": "camera:front_door"})

        self.assertEqual(response.status_code, 200)
        lines = response.json()[0]["stderr"]
        self.assertEqual(len(lines), 2)
        self.assertNotIn("hunter2", " ".join(lines))
        self.assertEqual(lines[1], "rtsp://*:*@10.0.0.1:554/video: Connection refused")
