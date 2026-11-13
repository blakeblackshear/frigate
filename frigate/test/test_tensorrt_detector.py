"""Tests for TensorRT detector initialization and CUDA context scheduling."""

import os
import unittest
from unittest.mock import MagicMock, patch

from frigate.detectors.plugins import tensorrt as trt_plugin
from frigate.detectors.plugins.tensorrt import TensorRtDetector, TensorRTDetectorConfig


class TestTensorRtDetectorContext(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._orig_del = TensorRtDetector.__del__
        TensorRtDetector.__del__ = lambda self: None

    @classmethod
    def tearDownClass(cls):
        TensorRtDetector.__del__ = cls._orig_del

    def _create_detector(self, env: dict[str, str]):
        mock_cuda = MagicMock()
        mock_cuda.CUresult.CUDA_SUCCESS = 0
        mock_cuda.cuInit.return_value = (0,)
        mock_cuda.cuDeviceGetCount.return_value = (0, 1)
        mock_cuda.cuCtxCreate.return_value = (0, MagicMock())
        mock_cuda.cuStreamCreate.return_value = (0, MagicMock())
        mock_cuda.CUctx_flags.CU_CTX_MAP_HOST = 0x08
        mock_cuda.CUctx_flags.CU_CTX_SCHED_BLOCKING_SYNC = 0x04

        mock_engine = MagicMock()
        mock_engine.create_execution_context.return_value = MagicMock()

        config = TensorRTDetectorConfig(
            type="tensorrt",
            device=0,
            model={"path": "/config/model_cache/tensorrt/yolov7-320.trt"},
        )

        with (
            patch.dict(os.environ, env, clear=False),
            patch.object(trt_plugin.platform, "machine", return_value="aarch64"),
            patch.object(trt_plugin, "TRT_SUPPORT", True),
            patch.object(trt_plugin, "TRT_VERSION", 8, create=True),
            patch.object(trt_plugin, "cuda", mock_cuda, create=True),
            patch.object(trt_plugin, "TrtLogger", MagicMock(), create=True),
            patch.object(TensorRtDetector, "_load_engine", return_value=mock_engine),
            patch.object(
                TensorRtDetector, "_get_input_shape", return_value=(1, 3, 320, 320)
            ),
            patch.object(
                TensorRtDetector, "_allocate_buffers", return_value=([], [], [])
            ),
            patch.object(TensorRtDetector, "__del__", return_value=None),
        ):
            if "CUDA_BLOCKING_SYNC" not in env:
                os.environ.pop("CUDA_BLOCKING_SYNC", None)
            if "USE_CUDA_BLOCKING_SYNC" not in env:
                os.environ.pop("USE_CUDA_BLOCKING_SYNC", None)

            detector = TensorRtDetector(config)

        flags = mock_cuda.cuCtxCreate.call_args[0][0]
        device = mock_cuda.cuCtxCreate.call_args[0][1]
        return flags, device, detector

    def test_default_uses_blocking_sync(self):
        flags, device, _ = self._create_detector({})
        self.assertEqual(device, 0)
        self.assertEqual(flags, 0x08 | 0x04)

    def test_env_var_disables_blocking_sync(self):
        for value in ("false", "False", "0", "no", "off"):
            with self.subTest(value=value):
                flags, _, _ = self._create_detector({"CUDA_BLOCKING_SYNC": value})
                self.assertEqual(flags, 0x08)

    def test_use_cuda_blocking_sync_disables_blocking_sync(self):
        flags, _, _ = self._create_detector({"USE_CUDA_BLOCKING_SYNC": "false"})
        self.assertEqual(flags, 0x08)

    def test_env_var_enables_blocking_sync(self):
        for value in ("true", "True", "1", "yes", "on"):
            with self.subTest(value=value):
                flags, _, _ = self._create_detector({"CUDA_BLOCKING_SYNC": value})
                self.assertEqual(flags, 0x08 | 0x04)
