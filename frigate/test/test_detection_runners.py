"""Tests for ONNX Runtime session option selection."""

import unittest
from unittest.mock import MagicMock, patch

import numpy as np
import onnxruntime as ort

from frigate.detectors import detection_runners
from frigate.detectors.detection_runners import (
    CU_CTX_SCHED_BLOCKING_SYNC,
    CudaGraphRunner,
    enable_cuda_blocking_sync,
    get_ort_session_options,
)
from frigate.detectors.detector_config import ModelTypeEnum
from frigate.embeddings.types import EnrichmentModelTypeEnum


class TestGetOrtSessionOptions(unittest.TestCase):
    def test_jina_v2_uses_extended(self):
        """jina-clip-v2 returns an identical vector for every image on the CUDA
        execution provider at anything below EXTENDED."""
        options = get_ort_session_options(EnrichmentModelTypeEnum.jina_v2.value)

        self.assertIsNotNone(options)
        self.assertEqual(
            options.graph_optimization_level,
            ort.GraphOptimizationLevel.ORT_ENABLE_EXTENDED,
        )

    def test_jina_v1_uses_basic(self):
        options = get_ort_session_options(EnrichmentModelTypeEnum.jina_v1.value)

        self.assertIsNotNone(options)
        self.assertEqual(
            options.graph_optimization_level,
            ort.GraphOptimizationLevel.ORT_ENABLE_BASIC,
        )

    def test_cpu_enrichment_models_disable_spinning(self):
        for model_type in EnrichmentModelTypeEnum:
            with self.subTest(model_type=model_type):
                options = get_ort_session_options(model_type.value, cpu=True)

                self.assertEqual(
                    options.get_session_config_entry("session.intra_op.allow_spinning"),
                    "0",
                )

    def test_gpu_enrichment_models_keep_spinning(self):
        options = get_ort_session_options(EnrichmentModelTypeEnum.arcface.value)

        with self.assertRaises(RuntimeError):
            options.get_session_config_entry("session.intra_op.allow_spinning")

    def test_arcface_keeps_default_optimization(self):
        options = get_ort_session_options(EnrichmentModelTypeEnum.arcface.value)

        self.assertEqual(
            options.graph_optimization_level,
            ort.GraphOptimizationLevel.ORT_ENABLE_ALL,
        )

    def test_detector_models_use_defaults(self):
        for model_type in [None, ModelTypeEnum.rfdetr.value]:
            with self.subTest(model_type=model_type):
                self.assertIsNone(get_ort_session_options(model_type, cpu=True))


class TestCudaGraphRunner(unittest.TestCase):
    """CUDA graph capture fails if the arena has to allocate during capture, so
    the session is warmed up with capture disabled before the first real run."""

    def setUp(self):
        self.session = MagicMock()
        self.session.get_outputs.return_value = [MagicMock(name="output")]
        self.io_binding = self.session.io_binding.return_value
        self.input = {"images": np.zeros((1, 3, 320, 320), np.float32)}

    def _annotations(self) -> list[str | None]:
        """Graph annotation id passed with each run, None when unset."""
        annotations = []

        for call in self.session.run_with_iobinding.call_args_list:
            try:
                annotations.append(call.args[1].get_run_config_entry("gpu_graph_id"))
            except RuntimeError:
                annotations.append(None)

        return annotations

    def test_first_run_warms_up_with_capture_disabled(self):
        with patch.object(ort.OrtValue, "ortvalue_from_numpy"):
            CudaGraphRunner(self.session, 0).run(self.input)

        self.assertEqual(
            self._annotations(),
            ["-1"] * CudaGraphRunner.GRAPH_FREE_WARMUP_RUNS + [None],
        )

    def test_later_runs_allow_capture(self):
        with patch.object(ort.OrtValue, "ortvalue_from_numpy"):
            runner = CudaGraphRunner(self.session, 0)
            runner.run(self.input)
            self.session.run_with_iobinding.reset_mock()
            runner.run(self.input)

        self.assertEqual(self._annotations(), [None])
        runner._input_ortvalue.update_inplace.assert_called_once()


class TestEnableCudaBlockingSync(unittest.TestCase):
    """The CUDA driver spins a CPU core while waiting on the GPU unless the
    primary context is switched to blocking sync before the session uses it."""

    def setUp(self):
        detection_runners._cuda_blocking_sync_devices.clear()
        self.addCleanup(detection_runners._cuda_blocking_sync_devices.clear)

    def _libcuda(self, current_flags: int = 0, set_flags_result: int = 0):
        libcuda = MagicMock()
        libcuda.cuInit.return_value = 0
        libcuda.cuDeviceGet.return_value = 0

        def get_state(device, flags, active):
            flags._obj.value = current_flags
            active._obj.value = 0
            return 0

        libcuda.cuDevicePrimaryCtxGetState.side_effect = get_state
        libcuda.cuDevicePrimaryCtxSetFlags_v2.return_value = set_flags_result
        return libcuda

    def _set_flags(self, libcuda: MagicMock) -> int:
        return libcuda.cuDevicePrimaryCtxSetFlags_v2.call_args.args[1]

    def test_sets_blocking_sync_on_the_device(self):
        libcuda = self._libcuda()

        with patch.object(detection_runners.ctypes, "CDLL", return_value=libcuda):
            self.assertTrue(enable_cuda_blocking_sync(1))

        self.assertEqual(libcuda.cuDeviceGet.call_args.args[1], 1)
        self.assertEqual(self._set_flags(libcuda), CU_CTX_SCHED_BLOCKING_SYNC)

    def test_replaces_scheduling_but_keeps_other_flags(self):
        # CU_CTX_SCHED_SPIN | CU_CTX_LMEM_RESIZE_TO_MAX
        libcuda = self._libcuda(current_flags=0x01 | 0x10)

        with patch.object(detection_runners.ctypes, "CDLL", return_value=libcuda):
            enable_cuda_blocking_sync(0)

        self.assertEqual(self._set_flags(libcuda), CU_CTX_SCHED_BLOCKING_SYNC | 0x10)

    def test_only_applies_once_per_device(self):
        libcuda = self._libcuda()

        with patch.object(
            detection_runners.ctypes, "CDLL", return_value=libcuda
        ) as cdll:
            enable_cuda_blocking_sync(0)
            enable_cuda_blocking_sync(0)
            enable_cuda_blocking_sync(1)

        self.assertEqual(cdll.call_count, 2)

    def test_missing_driver_is_ignored(self):
        with patch.object(
            detection_runners.ctypes, "CDLL", side_effect=OSError("not found")
        ):
            self.assertFalse(enable_cuda_blocking_sync(0))

    def test_driver_errors_skip_setting_flags(self):
        libcuda = self._libcuda()
        libcuda.cuInit.return_value = 100  # CUDA_ERROR_NO_DEVICE

        with patch.object(detection_runners.ctypes, "CDLL", return_value=libcuda):
            self.assertFalse(enable_cuda_blocking_sync(0))

        libcuda.cuDevicePrimaryCtxSetFlags_v2.assert_not_called()

    def test_failure_warns_and_retries_next_time(self):
        libcuda = self._libcuda(set_flags_result=1)

        with (
            patch.object(detection_runners.ctypes, "CDLL", return_value=libcuda),
            self.assertLogs(detection_runners.logger, level="WARNING"),
        ):
            self.assertFalse(enable_cuda_blocking_sync(0))

        libcuda.cuDevicePrimaryCtxSetFlags_v2.return_value = 0

        with patch.object(detection_runners.ctypes, "CDLL", return_value=libcuda):
            self.assertTrue(enable_cuda_blocking_sync(0))

    def test_disabled_by_env_var(self):
        libcuda = self._libcuda()

        for value in ("false", "False", "0", "no", "off"):
            with (
                self.subTest(value=value),
                patch.dict(detection_runners.os.environ, {"CUDA_BLOCKING_SYNC": value}),
                patch.object(detection_runners.ctypes, "CDLL", return_value=libcuda),
            ):
                self.assertFalse(enable_cuda_blocking_sync(0))

        libcuda.cuDevicePrimaryCtxSetFlags_v2.assert_not_called()

    def test_disabled_by_use_cuda_blocking_sync(self):
        libcuda = self._libcuda()

        with (
            patch.dict(
                detection_runners.os.environ,
                {"USE_CUDA_BLOCKING_SYNC": "false"},
                clear=False,
            ),
            patch.object(detection_runners.ctypes, "CDLL", return_value=libcuda),
        ):
            detection_runners.os.environ.pop("CUDA_BLOCKING_SYNC", None)
            self.assertFalse(enable_cuda_blocking_sync(0))

        libcuda.cuDevicePrimaryCtxSetFlags_v2.assert_not_called()

    def test_enabled_by_env_var(self):
        libcuda = self._libcuda()

        for value in ("true", "True", "1", "yes", "on"):
            with (
                self.subTest(value=value),
                patch.dict(detection_runners.os.environ, {"CUDA_BLOCKING_SYNC": value}),
                patch.object(detection_runners.ctypes, "CDLL", return_value=libcuda),
            ):
                self.assertTrue(enable_cuda_blocking_sync(0))
                detection_runners._cuda_blocking_sync_devices.clear()
