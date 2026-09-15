"""Tests that /auth only accepts a JWT whose role is still in the config."""

import os
import time
from unittest.mock import MagicMock, Mock, patch

from frigate.api.auth import create_encoded_jwt
from frigate.api.fastapi_app import create_fastapi_app
from frigate.config import FrigateConfig
from frigate.config.camera.updater import CameraConfigUpdatePublisher
from frigate.const import JWT_SECRET_ENV_VAR
from frigate.models import Event, Recordings, ReviewSegment
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp


@patch.dict(os.environ, {JWT_SECRET_ENV_VAR: "test-secret"})
class TestAuthJwtRole(BaseTestHttp):
    def setUp(self):
        super().setUp(models=[Event, Recordings, ReviewSegment])
        self.minimal_config = {
            "mqtt": {"host": "mqtt"},
            "auth": {"enabled": True, "roles": {"garage": ["front_door"]}},
            "networking": {"listen": {"internal": 5000, "external": 8971}},
            "cameras": {
                "front_door": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

    def _create_app(self):
        mock_publisher = Mock(spec=CameraConfigUpdatePublisher)
        mock_publisher.publisher = MagicMock()

        return create_fastapi_app(
            FrigateConfig(**self.minimal_config),
            self.db,
            None,
            None,
            None,
            None,
            None,
            None,
            mock_publisher,
            None,
            enforce_default_admin=False,
        )

    def _auth(self, app, role: str):
        token = create_encoded_jwt("bob", role, int(time.time()) + 3600, app.jwt_token)

        with AuthTestClient(app) as client:
            return client.get(
                "/auth",
                headers={
                    "x-server-port": "8971",
                    "authorization": f"Bearer {token}",
                },
            )

    def test_configured_role_is_accepted(self):
        resp = self._auth(self._create_app(), "garage")

        self.assertEqual(resp.status_code, 202)
        self.assertEqual(resp.headers["remote-user"], "bob")
        self.assertEqual(resp.headers["remote-role"], "garage")

    def test_role_removed_from_config_is_rejected(self):
        resp = self._auth(self._create_app(), "removed_role")

        self.assertEqual(resp.status_code, 401)
        self.assertNotIn("remote-role", resp.headers)
