"""Tests for the go2rtc ffmpeg and ngrok options applied at startup."""

import os
import unittest
from unittest.mock import patch

from frigate.util.services import (
    apply_go2rtc_ffmpeg_config,
    is_restricted_go2rtc_api_source,
    is_restricted_go2rtc_source,
)

FFMPEG_PATH = "/usr/lib/ffmpeg/7.0/bin/ffmpeg"


class TestApplyGo2rtcFfmpegConfig(unittest.TestCase):
    def setUp(self):
        env_patch = patch.dict(os.environ)
        env_patch.start()
        self.addCleanup(env_patch.stop)
        os.environ.pop("GO2RTC_ALLOW_ARBITRARY_EXEC", None)

    def test_sets_bin_when_missing(self):
        config = {}
        assert apply_go2rtc_ffmpeg_config(config, FFMPEG_PATH) == []
        assert config["ffmpeg"] == {"bin": FFMPEG_PATH}

    def test_forces_bin_override(self):
        config = {"ffmpeg": {"bin": "/bin/sh", "global": "-c 'id' x"}}
        assert apply_go2rtc_ffmpeg_config(config, FFMPEG_PATH) == ["ffmpeg.bin"]
        assert config["ffmpeg"]["bin"] == FFMPEG_PATH

    def test_keeps_saved_templates(self):
        config = {"ffmpeg": {"global": "-vaapi_device /dev/dri/renderD128"}}
        assert apply_go2rtc_ffmpeg_config(config, FFMPEG_PATH) == []
        assert config["ffmpeg"]["global"] == "-vaapi_device /dev/dri/renderD128"

    def test_drops_ngrok(self):
        config = {"ngrok": {"command": "/bin/sh -c id"}}
        assert apply_go2rtc_ffmpeg_config(config, FFMPEG_PATH) == ["ngrok"]
        assert "ngrok" not in config

    def test_allows_bin_and_ngrok_when_override_set(self):
        config = {
            "ffmpeg": {"bin": "/usr/bin/ffmpeg"},
            "ngrok": {"command": "ngrok tcp 8555"},
        }
        with patch.dict(os.environ, {"GO2RTC_ALLOW_ARBITRARY_EXEC": "true"}):
            assert apply_go2rtc_ffmpeg_config(config, FFMPEG_PATH) == []
        assert config["ffmpeg"]["bin"] == "/usr/bin/ffmpeg"
        assert config["ngrok"] == {"command": "ngrok tcp 8555"}


class TestRestrictedGo2rtcVarExpansion(unittest.TestCase):
    """go2rtc expands `${VAR:default}` over the raw config before parsing, and
    the default can name an exec source, so a `${` source is restricted."""

    def setUp(self):
        exec_patch = patch(
            "frigate.util.services.is_go2rtc_arbitrary_exec_allowed",
            return_value=False,
        )
        self.mock_exec_allowed = exec_patch.start()
        self.addCleanup(exec_patch.stop)

    def test_var_expansion_source_is_restricted(self):
        for source in (
            "${NOPE:exec:touch /tmp/x}",
            "rtsp://host/${CAM}",
            "  ${NOPE:exec:id}",
        ):
            self.assertTrue(is_restricted_go2rtc_source(source), source)
            self.assertTrue(is_restricted_go2rtc_api_source(source), source)

    def test_plain_sources_are_not_restricted(self):
        for source in (
            "rtsp://user:pass@host/stream",
            "ffmpeg:front#video=h264#height=720",
        ):
            self.assertFalse(is_restricted_go2rtc_source(source), source)
            self.assertFalse(is_restricted_go2rtc_api_source(source), source)

    def test_var_expansion_allowed_when_override_set(self):
        self.mock_exec_allowed.return_value = True
        self.assertFalse(is_restricted_go2rtc_source("${NOPE:exec:id}"))


if __name__ == "__main__":
    unittest.main()
