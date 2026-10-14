"""Tests for go2rtc stream source restrictions on config/save and config/set."""

import copy
import os
import tempfile
from unittest.mock import patch

import ruamel.yaml

from frigate.config.env import FRIGATE_ENV_VARS
from frigate.models import Event, Recordings, ReviewSegment
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp

# shape of the source in GHSA-qjjw-3v66-279f, with the payload replaced
_INJECTED_SRC = "ffmpeg:#input='-f''h264''-i''data:placeholder''-c''copy'"

# an unrestricted ffmpeg: source the operator already has in the file on disk
_EXISTING_SRC = "ffmpeg:rtsp://10.0.0.1:554/video#raw=-vn"

_CONFIG = {
    "mqtt": {"host": "mqtt"},
    "go2rtc": {"streams": {"front_door": [_EXISTING_SRC]}},
    "cameras": {
        "front_door": {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}]
            },
            "detect": {"height": 1080, "width": 1920, "fps": 5},
        },
    },
}


def _dump(config: dict) -> str:
    yaml = ruamel.yaml.YAML()
    stream = tempfile.SpooledTemporaryFile(mode="w+")
    yaml.dump(config, stream)
    stream.seek(0)
    return stream.read()


class TestConfigGo2rtcStreamRestrictions(BaseTestHttp):
    def setUp(self):
        super().setUp([Event, Recordings, ReviewSegment])
        self.minimal_config = _CONFIG
        self.app = super().create_app()

        fd, self.config_path = tempfile.mkstemp(suffix=".yml")
        with os.fdopen(fd, "w") as f:
            f.write(_dump(_CONFIG))
        self.addCleanup(os.unlink, self.config_path)

        find_patch = patch(
            "frigate.api.app.find_config_file", return_value=self.config_path
        )
        find_patch.start()
        self.addCleanup(find_patch.stop)

        env_patch = patch.dict(os.environ)
        env_patch.start()
        self.addCleanup(env_patch.stop)
        os.environ.pop("GO2RTC_ALLOW_ARBITRARY_EXEC", None)

    def _read_config(self) -> str:
        with open(self.config_path) as f:
            return f.read()

    def _set_streams(self, streams: dict):
        with AuthTestClient(self.app) as client:
            return client.put(
                "/config/set",
                json={
                    "config_data": {"go2rtc": {"streams": streams}},
                    "requires_restart": 1,
                },
            )

    def _save_streams(self, streams: dict, prefix: str = ""):
        config = copy.deepcopy(_CONFIG)
        config["go2rtc"]["streams"].update(streams)
        with AuthTestClient(self.app) as client:
            return client.post(
                "/config/save?save_option=saveonly",
                content=prefix + _dump(config),
                headers={"Content-Type": "text/plain"},
            )

    # --- config/set ---

    def test_set_rejects_injected_ffmpeg_source(self):
        before = self._read_config()
        resp = self._set_streams({"new_stream": [_INJECTED_SRC]})
        assert resp.status_code == 400
        assert resp.json()["success"] is False
        assert self._read_config() == before

    def test_set_rejects_injected_string_source(self):
        before = self._read_config()
        resp = self._set_streams({"new_stream": "ffmpeg:front_door#raw=-vn"})
        assert resp.status_code == 400
        assert self._read_config() == before

    def test_set_rejects_injected_source_added_to_existing_stream(self):
        before = self._read_config()
        resp = self._set_streams({"front_door": [_EXISTING_SRC, _INJECTED_SRC]})
        assert resp.status_code == 400
        assert self._read_config() == before

    def test_set_allows_standard_sources(self):
        resp = self._set_streams(
            {
                "new_stream": [
                    "rtsp://10.0.0.2:554/video",
                    "ffmpeg:new_stream#audio=opus",
                ]
            }
        )
        assert resp.status_code == 200, resp.text
        assert "ffmpeg:new_stream#audio=opus" in self._read_config()

    def test_set_keeps_existing_source_on_disk(self):
        resp = self._set_streams(
            {"front_door": [_EXISTING_SRC, "ffmpeg:front_door#audio=opus"]}
        )
        assert resp.status_code == 200, resp.text
        assert _EXISTING_SRC in self._read_config()

    def test_set_allows_injected_source_when_override_set(self):
        with patch.dict(os.environ, {"GO2RTC_ALLOW_ARBITRARY_EXEC": "true"}):
            resp = self._set_streams({"new_stream": [_INJECTED_SRC]})
        assert resp.status_code == 200, resp.text

    # --- config/save ---

    def test_save_rejects_injected_ffmpeg_source(self):
        before = self._read_config()
        resp = self._save_streams({"new_stream": [_INJECTED_SRC]})
        assert resp.status_code == 400
        assert self._read_config() == before

    def test_save_rejects_exec_source(self):
        before = self._read_config()
        resp = self._save_streams({"new_stream": "exec:/tmp/something"})
        assert resp.status_code == 400
        assert self._read_config() == before

    def test_save_rejects_map_source(self):
        before = self._read_config()
        resp = self._save_streams({"new_stream": {"url": "rtsp://10.0.0.2/video"}})
        assert resp.status_code == 400
        assert self._read_config() == before

    def test_save_resubmitting_existing_config_allowed(self):
        # the UI config editor always sends back the whole file
        resp = self._save_streams({"new_stream": "rtsp://10.0.0.2:554/video"})
        assert resp.status_code == 200, resp.text
        config = self._read_config()
        assert _EXISTING_SRC in config
        assert "rtsp://10.0.0.2:554/video" in config

    def test_save_tagged_config_with_standard_source_allowed(self):
        # a tag on the root map still passes validation and startup parsing
        resp = self._save_streams(
            {"new_stream": "rtsp://10.0.0.2:554/video"}, prefix="!config\n"
        )
        assert resp.status_code == 200, resp.text

    def test_save_tagged_config_with_injected_source_rejected(self):
        before = self._read_config()
        resp = self._save_streams({"new_stream": [_INJECTED_SRC]}, prefix="!config\n")
        assert resp.status_code == 400
        assert "Restricted go2rtc stream source" in resp.json()["message"]
        assert self._read_config() == before

    # --- {FRIGATE_*} placeholders resolve the same way as at go2rtc startup ---

    def test_set_rejects_unresolvable_placeholder(self):
        before = self._read_config()
        with patch.dict(FRIGATE_ENV_VARS, {"FRIGATE_RTSP_USER": "user"}):
            for src, message in (
                (
                    "{FRIGATE_RTSP_USER!r}fmpeg:front_door#raw=-vn",
                    "Invalid variable placeholder in go2rtc stream: new_stream",
                ),
                (
                    "{FRIGATE_RTSP_USER:>5}",
                    "Invalid variable placeholder in go2rtc stream: new_stream",
                ),
                (
                    "rtsp://{FRIGATE_UNDEFINED}@10.0.0.2:554/video",
                    "Unknown variable in go2rtc stream: new_stream",
                ),
            ):
                resp = self._set_streams({"new_stream": [src]})
                assert resp.status_code == 400, src
                assert resp.json()["message"] == message, src
                assert self._read_config() == before

    def test_set_reports_each_issue(self):
        resp = self._set_streams(
            {
                "typo_stream": ["rtsp://{FRIGATE_UNDEFINED}@10.0.0.2:554/video"],
                "injected_stream": [_INJECTED_SRC],
            }
        )
        assert resp.status_code == 400
        assert resp.json()["message"] == (
            "Restricted go2rtc stream source in: injected_stream; "
            "Unknown variable in go2rtc stream: typo_stream"
        )

    def test_set_allows_resolvable_placeholder(self):
        src = "rtsp://{FRIGATE_RTSP_USER}@10.0.0.2:554/video"
        with patch.dict(FRIGATE_ENV_VARS, {"FRIGATE_RTSP_USER": "user"}):
            resp = self._set_streams({"new_stream": [src]})
        assert resp.status_code == 200, resp.text
        assert src in self._read_config()
