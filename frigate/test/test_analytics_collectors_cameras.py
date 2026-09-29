"""Tests for the cameras collector."""

import unittest

from frigate.analytics.collectors import cameras
from frigate.analytics.schema import HeightBucket, HwaccelKey, RetainBucket
from frigate.test.analytics_helpers import make_config, make_context

MASK = {"coordinates": "0,0,1,0,1,1"}

CONFIG = {
    "record": {
        "enabled": True,
        "continuous": {"days": 3},
        "alerts": {"retain": {"days": 14}},
        "detections": {"retain": {"days": 45}},
    },
    "cameras": {
        "front": {
            "ffmpeg": {
                "hwaccel_args": "preset-vaapi",
                "inputs": [
                    {
                        "path": "rtsp://127.0.0.1:8554/front_sub",
                        "roles": ["detect"],
                        "input_args": "preset-rtsp-restream",
                    },
                    {"path": "rtsp://127.0.0.1:8554/front", "roles": ["record"]},
                ],
            },
            "detect": {"enabled": True, "height": 720, "width": 1280, "fps": 5},
            "zones": {"porch": MASK, "yard": MASK},
            "motion": {"mask": {"tree": MASK}},
            "objects": {
                "mask": {"sign": MASK},
                "filters": {"person": {"mask": {"bush": MASK}}},
            },
            "onvif": {"host": "10.0.0.9"},
        },
        "garage": {
            "enabled": False,
            "type": "lpr",
            "ffmpeg": {
                "hwaccel_args": ["-hwaccel", "vaapi"],
                "inputs": [
                    {"path": "rtsp://10.0.0.5/stream", "roles": ["detect", "record"]}
                ],
            },
            "detect": {"height": 2160, "width": 3840, "fps": 15},
            "record": {"enabled": False},
        },
        "_replay_front": {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.1/replay", "roles": ["detect"]}]
            },
            "detect": {"height": 1080, "width": 1920, "fps": 5},
        },
    },
}

STATS = {
    "cameras": {
        "front": {"connection_quality": "excellent"},
        "garage": {"connection_quality": "offline"},
        "_replay_front": {"connection_quality": "fair"},
    }
}


class TestCamerasCollector(unittest.TestCase):
    def test_aggregates_cameras_and_skips_replays(self):
        section = cameras.collect(make_context(make_config(CONFIG), STATS))

        self.assertEqual((section.total, section.enabled), (2, 1))
        self.assertEqual(section.types, {"generic": 1, "lpr": 1})
        self.assertEqual(section.detect_height, {"720": 1, "ge_2160": 1})
        self.assertEqual(section.detect_fps, {"le_5": 1, "gt_10": 1})
        self.assertEqual(section.hwaccel, {"vaapi": 1, "custom": 1})
        self.assertEqual(section.input_preset, {"rtsp-restream": 1, "rtsp-generic": 1})
        self.assertEqual(section.go2rtc_restream, 1)
        self.assertEqual(section.separate_detect_stream, 1)
        self.assertEqual((section.detect, section.record, section.onvif), (1, 1, 1))
        self.assertEqual((section.zones, section.cameras_with_zones), (2, 1))
        self.assertEqual((section.motion_masks, section.object_masks), (1, 2))
        self.assertEqual(section.connection_quality, {"excellent": 1})
        self.assertEqual(section.retain_days.continuous, {"1_7": 1})
        self.assertEqual(section.retain_days.motion, {"0": 1})
        self.assertEqual(section.retain_days.alerts, {"8_30": 1})
        self.assertEqual(section.retain_days.detections, {"gt_30": 1})

    def test_buckets(self):
        self.assertEqual(cameras.height_bucket(360), HeightBucket.le_360)
        self.assertEqual(cameras.height_bucket(361), HeightBucket.h480)
        self.assertEqual(cameras.height_bucket(1080), HeightBucket.h1080)
        self.assertEqual(cameras.height_bucket(1440), HeightBucket.h1440)
        self.assertEqual(cameras.height_bucket(2160), HeightBucket.ge_2160)
        self.assertEqual(cameras.retain_bucket(0.5), RetainBucket.d1_7)
        self.assertEqual(cameras.retain_bucket(0), RetainBucket.zero)

    def test_preset_key(self):
        self.assertEqual(cameras.preset_key([], HwaccelKey), "none")
        self.assertEqual(cameras.preset_key("", HwaccelKey), "none")
        self.assertEqual(cameras.preset_key("preset-bogus", HwaccelKey), "custom")
        self.assertEqual(cameras.preset_key("-hwaccel vaapi", HwaccelKey), "custom")
        self.assertEqual(cameras.preset_key("preset-nvidia", HwaccelKey), "nvidia")

    def test_is_restream(self):
        self.assertTrue(cameras.is_restream("rtsp://127.0.0.1:8554/front"))
        self.assertTrue(cameras.is_restream("rtsp://localhost:8554/front"))
        self.assertFalse(cameras.is_restream("rtsp://10.0.0.5:8554/front"))
        self.assertFalse(cameras.is_restream("rtsp://[bad"))
        self.assertFalse(cameras.is_restream("rtsp://127.0.0.1:notaport/x"))
