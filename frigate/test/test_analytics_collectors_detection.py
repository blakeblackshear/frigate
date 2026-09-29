"""Tests for the detection collector."""

import os
import tempfile
import unittest
from unittest.mock import patch

from frigate.analytics.collectors import detection
from frigate.analytics.schema import ModelSource
from frigate.detectors.detector_config import SceneEnum
from frigate.test.analytics_helpers import make_config, make_context


class TestDetectionCollector(unittest.TestCase):
    def test_reports_each_model_with_its_mean_inference_speed(self):
        config = make_config({"models": [{"devices": ["cpu", "cpu"]}]})
        stats = {
            "detectors": {
                "cpu": {"inference_speed": 10.0},
                "cpu#2": {"inference_speed": 20.0},
            },
            "detection_fps": 12.346,
            "skipped_fps": 0,
        }

        section = detection.collect(make_context(config, stats))

        model = section.models[SceneEnum.all]
        self.assertEqual(model.detector, "cpu")
        self.assertEqual(model.devices, 2)
        self.assertEqual(model.model_type, "ssd")
        self.assertEqual(model.input, "320x320")
        self.assertEqual(model.source, ModelSource.default)
        self.assertEqual(model.inference_ms, 15.0)
        self.assertEqual(section.detection_fps, 12.35)
        self.assertEqual(section.skipped_fps, 0.0)

    def test_inference_is_null_before_the_first_stats(self):
        section = detection.collect(make_context())

        self.assertIsNone(section.models[SceneEnum.all].inference_ms)

    def test_model_source(self):
        with tempfile.TemporaryDirectory() as cache:
            plus_model = os.path.join(cache, "abc123")
            open(f"{plus_model}.json", "w").close()

            with patch.object(detection, "MODEL_CACHE_DIR", cache):
                self.assertEqual(detection.model_source(plus_model), ModelSource.plus)
                self.assertEqual(
                    detection.model_source(os.path.join(cache, "no_info")),
                    ModelSource.custom,
                )

        self.assertEqual(detection.model_source(None), ModelSource.default)
        self.assertEqual(
            detection.model_source("/cpu_model.tflite"), ModelSource.default
        )
        self.assertEqual(
            detection.model_source("/config/yolo.onnx"), ModelSource.custom
        )
