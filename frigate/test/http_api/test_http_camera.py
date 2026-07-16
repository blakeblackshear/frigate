"""Tests for the camera delete endpoint's runtime config handling."""

import os
import tempfile
import unittest
from unittest.mock import MagicMock, Mock, patch

import ruamel.yaml

from frigate.config import FrigateConfig
from frigate.config.camera.updater import CameraConfigUpdatePublisher
from frigate.models import Event, Recordings, ReviewSegment
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp


class TestDeleteCameraRuntimeConfig(BaseTestHttp):
    """Deleting a camera must keep the API and dispatcher on the same config."""

    def setUp(self):
        super().setUp(models=[Event, Recordings, ReviewSegment])
        self.minimal_config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "front_door": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {"height": 1080, "width": 1920, "fps": 5},
                },
                "back_yard": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.2:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {"height": 720, "width": 1280, "fps": 10},
                },
            },
        }

    def _write_config_file(self):
        yaml = ruamel.yaml.YAML()
        f = tempfile.NamedTemporaryFile(mode="w", suffix=".yml", delete=False)
        yaml.dump(self.minimal_config, f)
        f.close()
        return f.name

    def _create_app_with_dispatcher(self, dispatcher):
        from fastapi import Request

        from frigate.api.auth import get_allowed_cameras_for_filter, get_current_user
        from frigate.api.fastapi_app import create_fastapi_app

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
            dispatcher=dispatcher,
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

        return app, mock_publisher

    @patch("frigate.api.camera.requests.delete")
    @patch("frigate.api.camera.cleanup_camera_files")
    @patch("frigate.api.camera.cleanup_camera_db")
    @patch("frigate.api.camera.find_config_file")
    def test_delete_syncs_dispatcher_and_prunes_runtime_state(
        self, mock_find_config, mock_cleanup_db, mock_cleanup_files, mock_go2rtc_delete
    ):
        """Deleting a camera swaps every config reference and prunes its state."""
        config_path = self._write_config_file()
        mock_find_config.return_value = config_path
        mock_cleanup_db.return_value = ({}, [])

        dispatcher = MagicMock()
        dispatcher.comms = []

        try:
            app, _ = self._create_app_with_dispatcher(dispatcher)

            with AuthTestClient(app) as client:
                resp = client.delete("/cameras/front_door")

                self.assertEqual(resp.status_code, 200)
                self.assertTrue(resp.json()["success"])

                # the dispatcher must be moved onto the same new object the API
                # now serves, and that object must no longer contain the camera
                self.assertIs(dispatcher.config, app.frigate_config)
                self.assertNotIn("front_door", dispatcher.config.cameras)
                self.assertIn("back_yard", dispatcher.config.cameras)

                # surviving cameras' overrides are re-layered onto the new object
                dispatcher.reapply_runtime_state_to_config.assert_called_once_with()

                # the deleted camera's persisted overrides are pruned
                dispatcher.clear_runtime_state_for_camera.assert_called_once_with(
                    "front_door"
                )
        finally:
            os.unlink(config_path)


if __name__ == "__main__":
    unittest.main()
