"""Test restream.py."""

from unittest import TestCase, main
from unittest.mock import patch

from frigate.config import FrigateConfig
from frigate.restream import RestreamApi


class TestRestream(TestCase):
    def setUp(self) -> None:
        """Setup the tests."""
        self.config = {
            "mqtt": {"host": "mqtt"},
            "restream": {"enabled": False},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect", "restream"],
                            },
                        ]
                    },
                    "restream": {
                        "enabled": True,
                        "audio_encoding": ["copy"],
                    },
                },
                "front": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "http://10.0.0.1:554/video/stream",
                                "roles": ["detect", "restream"],
                            },
                        ]
                    },
                    "restream": {
                        "enabled": True,
                    },
                },
            },
        }

    @patch("frigate.restream.requests")
    def test_rtsp_stream(
        self, mock_request
    ) -> None:  # need to ensure restream doesn't try to call API
        """Test that the normal rtsp stream is sent plainly."""
        frigate_config = FrigateConfig(**self.config)
        restream = RestreamApi(frigate_config)
        restream.add_cameras()
        assert restream.relays["back"].startswith("rtsp")

    @patch("frigate.restream.requests")
    def test_http_stream(
        self, mock_request
    ) -> None:  # need to ensure restream doesn't try to call API
        """Test that the http stream is sent via ffmpeg."""
        frigate_config = FrigateConfig(**self.config)
        restream = RestreamApi(frigate_config)
        restream.add_cameras()
        assert not restream.relays["front"].startswith("rtsp")

    @patch("frigate.restream.requests")
    def test_restream_codec_change(
        self, mock_request
    ) -> None:  # need to ensure restream doesn't try to call API
        """Test that the http stream is sent via ffmpeg."""
        self.config["cameras"]["front"]["restream"]["video_encoding"] = "h265"
        self.config["ffmpeg"] = {"hwaccel_args": "preset-nvidia-h264"}
        frigate_config = FrigateConfig(**self.config)
        restream = RestreamApi(frigate_config)
        restream.add_cameras()
        assert "#hardware=cuda" in restream.relays["front"]
        assert "#video=h265" in restream.relays["front"]


if __name__ == "__main__":
    main(verbosity=2)
