"""Tests for config_set live stream ordering and go2rtc transcode sync."""

import os
import tempfile
from unittest.mock import MagicMock, Mock, patch

import ruamel.yaml
from fastapi import Request

from frigate.api.auth import get_allowed_cameras_for_filter, get_current_user
from frigate.api.fastapi_app import create_fastapi_app
from frigate.config import FrigateConfig
from frigate.config.camera.updater import CameraConfigUpdatePublisher
from frigate.models import Event, Recordings, ReviewSegment
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp
from frigate.util.live_streams import transcode_stream_source

STREAMS_PATH = "cameras.front_door.live.streams"


class TestConfigSetLiveStreams(BaseTestHttp):
    def setUp(self):
        super().setUp(models=[Event, Recordings, ReviewSegment])
        self.minimal_config["go2rtc"] = {
            "streams": {
                "front_main": ["rtsp://10.0.0.1:554/main"],
                "front_sub": ["rtsp://10.0.0.1:554/sub"],
            }
        }
        self.minimal_config["cameras"]["front_door"]["live"] = {
            "streams": {"Main": "front_main", "Sub": "front_sub"}
        }

    def _write_config_file(self) -> str:
        yaml = ruamel.yaml.YAML()
        f = tempfile.NamedTemporaryFile(mode="w", suffix=".yml", delete=False)
        yaml.dump(self.minimal_config, f)
        f.close()
        self.addCleanup(os.unlink, f.name)
        return f.name

    def _read_config_file(self, path: str) -> dict:
        with open(path) as f:
            return ruamel.yaml.YAML(typ="safe").load(f)

    def _app(self):
        publisher = Mock(spec=CameraConfigUpdatePublisher)
        publisher.publisher = MagicMock()
        app = create_fastapi_app(
            FrigateConfig(**self.minimal_config),
            self.db,
            None,
            None,
            None,
            None,
            None,
            None,
            publisher,
            None,
            enforce_default_admin=False,
        )

        async def mock_get_current_user(request: Request):
            return {
                "username": request.headers.get("remote-user"),
                "role": request.headers.get("remote-role"),
            }

        async def mock_get_allowed_cameras_for_filter(request: Request):
            return ["front_door"]

        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_allowed_cameras_for_filter] = (
            mock_get_allowed_cameras_for_filter
        )
        return app

    def _save(self, app, live: dict, replace_paths: list[str] | None = None):
        body = {
            "config_data": {"cameras": {"front_door": {"live": live}}},
            "requires_restart": 0,
            "update_topic": "config/cameras/front_door/live",
        }

        if replace_paths is not None:
            body["replace_paths"] = replace_paths

        with AuthTestClient(app) as client:
            return client.put("/config/set", json=body)

    @patch("frigate.api.app.find_config_file")
    def test_replace_paths_saves_map_in_sent_order(self, mock_find_config):
        path = self._write_config_file()
        mock_find_config.return_value = path

        resp = self._save(
            self._app(),
            {"streams": {"Sub": "front_sub", "Main": "front_main"}},
            [STREAMS_PATH],
        )

        self.assertEqual(resp.status_code, 200)
        streams = self._read_config_file(path)["cameras"]["front_door"]["live"][
            "streams"
        ]
        self.assertEqual(list(streams), ["Sub", "Main"])

    @patch("frigate.api.app.find_config_file")
    def test_without_replace_paths_order_is_kept(self, mock_find_config):
        path = self._write_config_file()
        mock_find_config.return_value = path

        self._save(self._app(), {"streams": {"Sub": "front_sub", "Main": "front_main"}})

        streams = self._read_config_file(path)["cameras"]["front_door"]["live"][
            "streams"
        ]
        self.assertEqual(list(streams), ["Main", "Sub"])

    @patch("frigate.api.app.find_config_file")
    def test_replace_path_missing_from_yaml_is_skipped(self, mock_find_config):
        del self.minimal_config["cameras"]["front_door"]["live"]
        path = self._write_config_file()
        mock_find_config.return_value = path

        resp = self._save(
            self._app(), {"streams": {"Main": "front_main"}}, [STREAMS_PATH]
        )

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            self._read_config_file(path)["cameras"]["front_door"]["live"]["streams"],
            {"Main": "front_main"},
        )

    @patch("frigate.api.app.sync_transcode_streams", return_value=True)
    @patch("frigate.api.app.find_config_file")
    def test_enabling_transcode_syncs_go2rtc(self, mock_find_config, mock_sync):
        path = self._write_config_file()
        mock_find_config.return_value = path

        resp = self._save(
            self._app(),
            {
                "transcode": {
                    "enabled": True,
                    "qualities": [{"height": 480, "bitrate": 500}],
                }
            },
        )

        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["go2rtc_synced"])
        mock_sync.assert_called_once_with(
            {},
            {
                "front_door_transcode_480p": transcode_stream_source(
                    "front_main", 480, 500
                )
            },
        )

    @patch("frigate.api.app.sync_transcode_streams", return_value=False)
    @patch("frigate.api.app.find_config_file")
    def test_sync_failure_is_reported(self, mock_find_config, mock_sync):
        path = self._write_config_file()
        mock_find_config.return_value = path

        resp = self._save(self._app(), {"transcode": {"enabled": True}})

        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["success"])
        self.assertFalse(resp.json()["go2rtc_synced"])
