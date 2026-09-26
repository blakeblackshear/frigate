"""Tests for Frigate-managed go2rtc live streams."""

import unittest
from unittest.mock import MagicMock, call, patch

import requests
from pydantic import ValidationError

from frigate.config import FrigateConfig
from frigate.util.live_streams import (
    DEFAULT_TRANSCODE_QUALITIES,
    default_transcode_source,
    generated_transcode_streams,
    is_transcode_stream_name,
    measure_stream_bitrate,
    raw_transcode_streams,
    sync_transcode_streams,
    transcode_stream_name,
    transcode_stream_source,
)


class TestTranscodeNaming(unittest.TestCase):
    def test_stream_name(self):
        self.assertEqual(transcode_stream_name("front", 720), "front_transcode_720p")

    def test_is_transcode_stream_name(self):
        self.assertTrue(is_transcode_stream_name("front", "front_transcode_480p"))
        self.assertFalse(is_transcode_stream_name("front", "front_sub"))
        self.assertFalse(is_transcode_stream_name("front", "back_transcode_480p"))
        self.assertFalse(is_transcode_stream_name("front", "front_transcode_480"))

    def test_source_gives_each_ffmpeg_token_its_own_raw_param(self):
        self.assertEqual(
            transcode_stream_source("front", 480, 500),
            "ffmpeg:front#video=h264#height=480#hardware#audio=copy"
            "#raw=-b:v#raw=500k#raw=-maxrate#raw=500k#raw=-bufsize#raw=1000k",
        )

    def test_default_source_skips_transcoded_streams(self):
        streams = {"Low": "front_transcode_360p", "Main": "front_main"}
        self.assertEqual(default_transcode_source("front", streams), "front_main")
        self.assertIsNone(default_transcode_source("front", {}))


class TestRawTranscodeStreams(unittest.TestCase):
    def test_defaults_to_camera_stream_and_default_qualities(self):
        config = {"cameras": {"front": {"live": {"transcode": {"enabled": True}}}}}
        streams = raw_transcode_streams(config)

        self.assertEqual(
            list(streams),
            [
                transcode_stream_name("front", q["height"])
                for q in DEFAULT_TRANSCODE_QUALITIES
            ],
        )
        self.assertTrue(streams["front_transcode_720p"].startswith("ffmpeg:front#"))

    def test_uses_first_live_stream_and_explicit_qualities(self):
        config = {
            "cameras": {
                "front": {
                    "live": {
                        "streams": {"Main": "front_main", "Sub": "front_sub"},
                        "transcode": {
                            "enabled": True,
                            "qualities": [{"height": 540, "bitrate": 800}],
                        },
                    }
                }
            }
        }

        self.assertEqual(
            raw_transcode_streams(config),
            {"front_transcode_540p": transcode_stream_source("front_main", 540, 800)},
        )

    def test_explicit_source_wins(self):
        config = {
            "cameras": {
                "front": {
                    "live": {
                        "streams": {"Main": "front_main"},
                        "transcode": {
                            "enabled": True,
                            "source": "front_sub",
                            "qualities": [{"height": 360, "bitrate": 250}],
                        },
                    }
                }
            }
        }

        self.assertEqual(
            raw_transcode_streams(config)["front_transcode_360p"],
            transcode_stream_source("front_sub", 360, 250),
        )

    def test_malformed_qualities_are_skipped(self):
        config = {
            "cameras": {
                "front": {
                    "live": {
                        "transcode": {
                            "enabled": True,
                            "qualities": [
                                {"height": 720},
                                "480",
                                {"height": 360, "bitrate": 250},
                            ],
                        }
                    }
                },
                "back": {
                    "live": {"transcode": {"enabled": True, "qualities": {"a": 1}}}
                },
            }
        }

        self.assertEqual(list(raw_transcode_streams(config)), ["front_transcode_360p"])

    def test_disabled_or_missing_generates_nothing(self):
        self.assertEqual(raw_transcode_streams({}), {})
        self.assertEqual(
            raw_transcode_streams({"cameras": {"front": {"live": {}}}}), {}
        )
        self.assertEqual(
            raw_transcode_streams(
                {"cameras": {"front": {"live": {"transcode": {"enabled": False}}}}}
            ),
            {},
        )


def camera_config(live: dict | None = None, go2rtc: dict | None = None) -> dict:
    config = {
        "mqtt": {"host": "mqtt"},
        "go2rtc": {
            "streams": go2rtc
            or {
                "front": ["rtsp://10.0.0.1:554/main"],
                "front_sub": ["rtsp://10.0.0.1:554/sub"],
            }
        },
        "cameras": {
            "front": {
                "ffmpeg": {
                    "inputs": [
                        {"path": "rtsp://10.0.0.1:554/main", "roles": ["detect"]}
                    ]
                },
                "detect": {"height": 1080, "width": 1920, "fps": 5},
            }
        },
    }

    if live is not None:
        config["cameras"]["front"]["live"] = live

    return config


class TestLiveTranscodeConfig(unittest.TestCase):
    def streams(self, live: dict, go2rtc: dict | None = None) -> dict[str, str]:
        config = FrigateConfig(**camera_config(live, go2rtc))
        return config.cameras["front"].live.streams

    def test_global_transcode_is_ignored(self):
        config = camera_config()
        config["live"] = {"transcode": {"enabled": True}}

        streams = FrigateConfig(**config).cameras["front"].live.streams
        self.assertEqual(streams, {"front": "front"})

    def test_disabled_leaves_streams_alone(self):
        self.assertEqual(self.streams({}), {"front": "front"})

    def test_enabled_appends_default_qualities(self):
        streams = self.streams({"transcode": {"enabled": True}})

        self.assertEqual(
            list(streams.items()),
            [
                ("front", "front"),
                ("720p", "front_transcode_720p"),
                ("480p", "front_transcode_480p"),
                ("360p", "front_transcode_360p"),
            ],
        )

    def test_source_resolves_to_first_live_stream(self):
        config = FrigateConfig(
            **camera_config(
                {
                    "streams": {"Sub": "front_sub", "Main": "front"},
                    "transcode": {"enabled": True},
                }
            )
        )

        self.assertEqual(config.cameras["front"].live.transcode.source, "front_sub")

    def test_placed_entries_keep_position_and_label(self):
        streams = self.streams(
            {
                "streams": {
                    "Main": "front",
                    "Low": "front_transcode_480p",
                    "Sub": "front_sub",
                },
                "transcode": {"enabled": True},
            }
        )

        self.assertEqual(
            list(streams.items()),
            [
                ("Main", "front"),
                ("Low", "front_transcode_480p"),
                ("Sub", "front_sub"),
                ("720p", "front_transcode_720p"),
                ("360p", "front_transcode_360p"),
            ],
        )

    def test_disabling_drops_transcoded_entries(self):
        streams = self.streams(
            {
                "streams": {"Main": "front", "720p": "front_transcode_720p"},
                "transcode": {"enabled": False},
            }
        )

        self.assertEqual(streams, {"Main": "front"})

    def test_changed_height_drops_the_old_entry(self):
        streams = self.streams(
            {
                "streams": {"Main": "front", "720p": "front_transcode_720p"},
                "transcode": {
                    "enabled": True,
                    "qualities": [{"height": 540, "bitrate": 800}],
                },
            }
        )

        self.assertEqual(streams, {"Main": "front", "540p": "front_transcode_540p"})

    def test_real_go2rtc_stream_with_transcode_name_is_kept(self):
        streams = self.streams(
            {"streams": {"Main": "front", "Odd": "front_transcode_720p"}},
            go2rtc={
                "front": ["rtsp://10.0.0.1:554/main"],
                "front_transcode_720p": ["rtsp://10.0.0.1:554/odd"],
            },
        )

        self.assertEqual(streams, {"Main": "front", "Odd": "front_transcode_720p"})

    def test_generated_name_colliding_with_go2rtc_stream_fails(self):
        with self.assertRaises(ValidationError):
            self.streams(
                {"transcode": {"enabled": True}},
                go2rtc={
                    "front": ["rtsp://10.0.0.1:554/main"],
                    "front_transcode_720p": ["rtsp://10.0.0.1:554/odd"],
                },
            )

    def test_source_must_be_a_go2rtc_stream(self):
        with self.assertRaises(ValidationError):
            self.streams({"transcode": {"enabled": True, "source": "missing"}})

    def test_duplicate_heights_fail(self):
        with self.assertRaises(ValidationError):
            self.streams(
                {
                    "transcode": {
                        "enabled": True,
                        "qualities": [
                            {"height": 480, "bitrate": 500},
                            {"height": 480, "bitrate": 600},
                        ],
                    }
                }
            )

    def test_label_collision_fails(self):
        with self.assertRaises(ValidationError):
            self.streams(
                {
                    "streams": {"Main": "front", "720p": "front_sub"},
                    "transcode": {"enabled": True},
                }
            )


class TestGeneratedTranscodeStreams(unittest.TestCase):
    def test_collects_enabled_cameras(self):
        config = FrigateConfig(
            **camera_config(
                {
                    "transcode": {
                        "enabled": True,
                        "qualities": [{"height": 480, "bitrate": 500}],
                    }
                }
            )
        )

        self.assertEqual(
            generated_transcode_streams(config),
            {"front_transcode_480p": transcode_stream_source("front", 480, 500)},
        )

    def test_disabled_is_empty(self):
        self.assertEqual(
            generated_transcode_streams(FrigateConfig(**camera_config())), {}
        )


class TestSyncTranscodeStreams(unittest.TestCase):
    @patch("frigate.util.live_streams.requests.request")
    def test_puts_added_and_changed_and_deletes_removed(self, mock_request):
        mock_request.return_value = MagicMock(ok=True)

        ok = sync_transcode_streams(
            {"a": "src-a", "b": "src-b", "c": "src-c"},
            {"a": "src-a", "b": "src-b2", "d": "src-d"},
        )

        self.assertTrue(ok)
        url = "http://127.0.0.1:1984/api/streams"
        self.assertCountEqual(
            mock_request.call_args_list,
            [
                call("put", url, params={"name": "b", "src": "src-b2"}, timeout=5),
                call("put", url, params={"name": "d", "src": "src-d"}, timeout=5),
                call("delete", url, params={"src": "c"}, timeout=5),
            ],
        )

    @patch("frigate.util.live_streams.requests.request")
    def test_unchanged_makes_no_calls(self, mock_request):
        self.assertTrue(sync_transcode_streams({"a": "x"}, {"a": "x"}))
        mock_request.assert_not_called()

    @patch("frigate.util.live_streams.requests.request")
    def test_failure_returns_false_and_keeps_going(self, mock_request):
        mock_request.side_effect = [
            requests.ConnectionError("down"),
            MagicMock(ok=True),
        ]

        self.assertFalse(sync_transcode_streams({}, {"a": "x", "b": "y"}))
        self.assertEqual(mock_request.call_count, 2)


class TestMeasureStreamBitrate(unittest.TestCase):
    @patch("frigate.util.live_streams.time.monotonic")
    @patch("frigate.util.live_streams.requests.get")
    def test_skips_warmup_and_averages(self, mock_get, mock_monotonic):
        response = MagicMock(ok=True)
        response.iter_content.return_value = [b"x" * 1000] * 6
        mock_get.return_value.__enter__.return_value = response
        # first byte, warmup, window start, then counted chunks up to 6 s
        mock_monotonic.side_effect = [0.0, 0.5, 1.0, 2.0, 4.0, 7.0]

        kbps = measure_stream_bitrate("front", duration=6.0, warmup=1.0)

        self.assertAlmostEqual(kbps, 3000 * 8 / 1000 / 6.0)
        mock_get.assert_called_once_with(
            "http://127.0.0.1:1984/api/stream.mp4",
            params={"src": "front"},
            stream=True,
            timeout=5,
        )

    @patch("frigate.util.live_streams.requests.get")
    def test_no_data_returns_none(self, mock_get):
        response = MagicMock(ok=True)
        response.iter_content.return_value = []
        mock_get.return_value.__enter__.return_value = response

        self.assertIsNone(measure_stream_bitrate("front"))

    @patch("frigate.util.live_streams.requests.get")
    def test_request_error_returns_none(self, mock_get):
        mock_get.side_effect = requests.ReadTimeout("slow")

        self.assertIsNone(measure_stream_bitrate("front"))


if __name__ == "__main__":
    unittest.main()
