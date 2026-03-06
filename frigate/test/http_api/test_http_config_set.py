"""Tests for the config_set endpoint's wildcard camera propagation."""

import os
import tempfile
import unittest
from unittest.mock import MagicMock, Mock, patch

import ruamel.yaml

from frigate.config import FrigateConfig
from frigate.config.camera.updater import (
    CameraConfigUpdateEnum,
    CameraConfigUpdatePublisher,
    CameraConfigUpdateTopic,
)
from frigate.models import Event, Recordings, ReviewSegment
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp


class TestConfigSetWildcardPropagation(BaseTestHttp):
    """Test that wildcard camera updates fan out to all cameras."""

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
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                },
                "back_yard": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.2:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 720,
                        "width": 1280,
                        "fps": 10,
                    },
                },
            },
        }

    def _create_app_with_publisher(self):
        """Create app with a mocked config publisher."""
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
            enforce_default_admin=False,
        )

        async def mock_get_current_user(request: Request):
            username = request.headers.get("remote-user")
            role = request.headers.get("remote-role")
            return {"username": username, "role": role}

        async def mock_get_allowed_cameras_for_filter(request: Request):
            return list(self.minimal_config.get("cameras", {}).keys())

        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_allowed_cameras_for_filter] = (
            mock_get_allowed_cameras_for_filter
        )

        return app, mock_publisher

    def _write_config_file(self):
        """Write the minimal config to a temp YAML file and return the path."""
        yaml = ruamel.yaml.YAML()
        f = tempfile.NamedTemporaryFile(mode="w", suffix=".yml", delete=False)
        yaml.dump(self.minimal_config, f)
        f.close()
        return f.name

    @patch("frigate.api.app.find_config_file")
    def test_wildcard_detect_update_fans_out_to_all_cameras(self, mock_find_config):
        """config/cameras/*/detect fans out to all cameras."""
        config_path = self._write_config_file()
        mock_find_config.return_value = config_path

        try:
            app, mock_publisher = self._create_app_with_publisher()
            with AuthTestClient(app) as client:
                resp = client.put(
                    "/config/set",
                    json={
                        "config_data": {"detect": {"fps": 15}},
                        "update_topic": "config/cameras/*/detect",
                        "requires_restart": 0,
                    },
                )

                self.assertEqual(resp.status_code, 200)
                data = resp.json()
                self.assertTrue(data["success"])

                # Verify publish_update called for each camera
                self.assertEqual(mock_publisher.publish_update.call_count, 2)

                published_cameras = set()
                for c in mock_publisher.publish_update.call_args_list:
                    topic = c[0][0]
                    self.assertIsInstance(topic, CameraConfigUpdateTopic)
                    self.assertEqual(topic.update_type, CameraConfigUpdateEnum.detect)
                    published_cameras.add(topic.camera)

                self.assertEqual(published_cameras, {"front_door", "back_yard"})

                # Global publisher should NOT be called for wildcard
                mock_publisher.publisher.publish.assert_not_called()
        finally:
            os.unlink(config_path)

    @patch("frigate.api.app.find_config_file")
    def test_wildcard_motion_update_fans_out(self, mock_find_config):
        """config/cameras/*/motion fans out to all cameras."""
        config_path = self._write_config_file()
        mock_find_config.return_value = config_path

        try:
            app, mock_publisher = self._create_app_with_publisher()
            with AuthTestClient(app) as client:
                resp = client.put(
                    "/config/set",
                    json={
                        "config_data": {"motion": {"threshold": 30}},
                        "update_topic": "config/cameras/*/motion",
                        "requires_restart": 0,
                    },
                )

                self.assertEqual(resp.status_code, 200)

                published_cameras = set()
                for c in mock_publisher.publish_update.call_args_list:
                    topic = c[0][0]
                    self.assertEqual(topic.update_type, CameraConfigUpdateEnum.motion)
                    published_cameras.add(topic.camera)

                self.assertEqual(published_cameras, {"front_door", "back_yard"})
        finally:
            os.unlink(config_path)

    @patch("frigate.api.app.find_config_file")
    def test_camera_specific_topic_only_updates_one_camera(self, mock_find_config):
        """config/cameras/front_door/detect only updates front_door."""
        config_path = self._write_config_file()
        mock_find_config.return_value = config_path

        try:
            app, mock_publisher = self._create_app_with_publisher()
            with AuthTestClient(app) as client:
                resp = client.put(
                    "/config/set",
                    json={
                        "config_data": {
                            "cameras": {"front_door": {"detect": {"fps": 20}}}
                        },
                        "update_topic": "config/cameras/front_door/detect",
                        "requires_restart": 0,
                    },
                )

                self.assertEqual(resp.status_code, 200)

                # Only one camera updated
                self.assertEqual(mock_publisher.publish_update.call_count, 1)
                topic = mock_publisher.publish_update.call_args[0][0]
                self.assertEqual(topic.camera, "front_door")
                self.assertEqual(topic.update_type, CameraConfigUpdateEnum.detect)

                # Global publisher should NOT be called
                mock_publisher.publisher.publish.assert_not_called()
        finally:
            os.unlink(config_path)

    @patch("frigate.api.app.find_config_file")
    def test_wildcard_sends_merged_per_camera_config(self, mock_find_config):
        """Wildcard fan-out sends each camera's own merged config."""
        config_path = self._write_config_file()
        mock_find_config.return_value = config_path

        try:
            app, mock_publisher = self._create_app_with_publisher()
            with AuthTestClient(app) as client:
                resp = client.put(
                    "/config/set",
                    json={
                        "config_data": {"detect": {"fps": 15}},
                        "update_topic": "config/cameras/*/detect",
                        "requires_restart": 0,
                    },
                )

                self.assertEqual(resp.status_code, 200)

                for c in mock_publisher.publish_update.call_args_list:
                    camera_detect_config = c[0][1]
                    self.assertIsNotNone(camera_detect_config)
                    self.assertTrue(hasattr(camera_detect_config, "fps"))
        finally:
            os.unlink(config_path)

    @patch("frigate.api.app.find_config_file")
    def test_non_camera_global_topic_uses_generic_publish(self, mock_find_config):
        """Non-camera topics (e.g. config/live) use the generic publisher."""
        config_path = self._write_config_file()
        mock_find_config.return_value = config_path

        try:
            app, mock_publisher = self._create_app_with_publisher()
            with AuthTestClient(app) as client:
                resp = client.put(
                    "/config/set",
                    json={
                        "config_data": {"live": {"height": 720}},
                        "update_topic": "config/live",
                        "requires_restart": 0,
                    },
                )

                self.assertEqual(resp.status_code, 200)

                # Global topic publisher called
                mock_publisher.publisher.publish.assert_called_once()

                # Camera-level publish_update NOT called
                mock_publisher.publish_update.assert_not_called()
        finally:
            os.unlink(config_path)


if __name__ == "__main__":
    unittest.main()
