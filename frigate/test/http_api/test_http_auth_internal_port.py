"""Tests that the internal port trusted by /auth cannot be moved at runtime."""

import os
import tempfile
import unittest
from unittest.mock import MagicMock, Mock, patch

import ruamel.yaml
from fastapi import Request

from frigate.api.auth import get_allowed_cameras_for_filter, get_current_user
from frigate.api.fastapi_app import create_fastapi_app
from frigate.config import FrigateConfig
from frigate.config.camera.updater import CameraConfigUpdatePublisher
from frigate.const import JWT_SECRET_ENV_VAR
from frigate.models import Event, Recordings, ReviewSegment
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp


@patch.dict(os.environ, {JWT_SECRET_ENV_VAR: "test-secret"})
class TestAuthInternalPort(BaseTestHttp):
    """/auth grants anonymous admin by port, so that port must stay put.

    nginx binds its listeners once at container start and never reloads them,
    but /api/config/set can swap the live config object mid-process. If /auth
    read the port off the live config, saving networking.listen.internal would
    hand unauthenticated admin to whoever can reach the external port.
    """

    def setUp(self):
        super().setUp(models=[Event, Recordings, ReviewSegment])
        self.minimal_config = {
            "mqtt": {"host": "mqtt"},
            "auth": {"enabled": True},
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

        app = create_fastapi_app(
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

        async def mock_get_current_user(request: Request):
            return {
                "username": request.headers.get("remote-user"),
                "role": request.headers.get("remote-role"),
            }

        async def mock_get_allowed_cameras_for_filter(request: Request):
            return list(self.minimal_config.get("cameras", {}).keys())

        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_allowed_cameras_for_filter] = (
            mock_get_allowed_cameras_for_filter
        )

        return app

    def _write_config_file(self):
        """Write the minimal config to a temp YAML file and return the path."""
        yaml = ruamel.yaml.YAML()
        f = tempfile.NamedTemporaryFile(mode="w", suffix=".yml", delete=False)
        yaml.dump(self.minimal_config, f)
        f.close()
        return f.name

    def test_internal_port_is_anonymous_admin(self):
        app = self._create_app()

        with AuthTestClient(app) as client:
            resp = client.get("/auth", headers={"x-server-port": "5000"})

            self.assertEqual(resp.status_code, 202)
            self.assertEqual(resp.headers["remote-user"], "anonymous")
            self.assertEqual(resp.headers["remote-role"], "admin")

    def test_external_port_requires_auth(self):
        app = self._create_app()

        with AuthTestClient(app) as client:
            resp = client.get("/auth", headers={"x-server-port": "8971"})

            self.assertEqual(resp.status_code, 401)

    def test_swapped_config_does_not_move_the_trusted_port(self):
        """The live config is not what /auth trusts.

        Stands in for every path that can rebind app.frigate_config while the
        process runs, whatever restart flag the caller claimed.
        """
        app = self._create_app()

        swapped = FrigateConfig(
            **{
                **self.minimal_config,
                "networking": {"listen": {"internal": 8971, "external": 5000}},
            }
        )
        app.frigate_config = swapped

        with AuthTestClient(app) as client:
            resp = client.get("/auth", headers={"x-server-port": "8971"})
            self.assertEqual(resp.status_code, 401)

            # nginx is still listening where it was told to at boot
            resp = client.get("/auth", headers={"x-server-port": "5000"})
            self.assertEqual(resp.status_code, 202)
            self.assertEqual(resp.headers["remote-role"], "admin")

    @patch("frigate.api.app.find_config_file")
    def test_config_set_rejects_internal_matching_external(self, mock_find_config):
        """Saving the internal port onto the external one is refused outright."""
        config_path = self._write_config_file()
        mock_find_config.return_value = config_path

        try:
            app = self._create_app()

            with AuthTestClient(app) as client:
                resp = client.put(
                    "/config/set",
                    json={
                        "config_data": {"networking": {"listen": {"internal": 8971}}},
                        "update_topic": "config/networking",
                        "requires_restart": 1,
                    },
                )

                self.assertEqual(resp.status_code, 400)
                self.assertFalse(resp.json()["success"])

                # the rejected save must not have reached the live config
                self.assertEqual(
                    app.frigate_config.networking.listen.internal_port, 5000
                )

                resp = client.get("/auth", headers={"x-server-port": "8971"})
                self.assertEqual(resp.status_code, 401)

            with open(config_path) as f:
                self.assertNotIn("8971", f.read().split("external")[0])
        finally:
            os.unlink(config_path)


if __name__ == "__main__":
    unittest.main(verbosity=2)
