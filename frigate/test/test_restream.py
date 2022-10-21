"""Test restream.py."""

from unittest import TestCase, main

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
                }
            },
        }

    def test_rtsp_stream(self) -> None:
        """Test that the normal rtsp stream is sent plainly."""
        frigate_config = FrigateConfig(**self.config)
        restream = RestreamApi(frigate_config)
        restream.add_cameras()
        assert restream.relays["back"].startswith("rtsp")

    def test_http_stream(self) -> None:
        """Test that the http stream is sent via ffmpeg."""
        frigate_config = FrigateConfig(**self.config)
        restream = RestreamApi(frigate_config)
        restream.add_cameras()
        assert not restream.relays["front"].startswith("rtsp")


if __name__ == "__main__":
    main(verbosity=2)
