"""Tests for the go2rtc ffmpeg and ngrok options applied at startup."""

import os
import unittest
from unittest.mock import patch

from frigate.util.services import apply_go2rtc_ffmpeg_config

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


if __name__ == "__main__":
    unittest.main()
