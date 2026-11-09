"""Tests for the ONNX detector plugin."""

import unittest
from unittest.mock import patch

from frigate.detectors.plugins.onnx import ONNXDetector, ONNXDetectorConfig


class TestONNXDetectorRunner(unittest.TestCase):
    def _create(self, device: str):
        config = ONNXDetectorConfig(
            type="onnx",
            device=device,
            model={
                "path": "/config/model_cache/model.onnx",
                "model_type": "yolo-generic",
            },
        )
        with (
            patch(
                "frigate.detectors.plugins.onnx.get_optimized_runner"
            ) as get_optimized_runner,
            patch.object(ONNXDetector, "_warmup"),
        ):
            ONNXDetector(config)
        return get_optimized_runner

    def test_tensorrt_device_requests_fp16(self):
        runner = self._create("Tensorrt")

        runner.assert_called_once_with(
            "/config/model_cache/model.onnx",
            "Tensorrt",
            model_type="yolo-generic",
            requires_fp16=True,
        )

    def test_other_devices_do_not_request_fp16(self):
        for device in ("AUTO", "CPU", "GPU", "0"):
            with self.subTest(device=device):
                runner = self._create(device)

                self.assertFalse(runner.call_args.kwargs["requires_fp16"])


if __name__ == "__main__":
    unittest.main()
