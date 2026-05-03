"""Tests for detection_runners session options and memory management helpers."""

import unittest
from unittest.mock import MagicMock, patch


class TestGetOrtSessionOptions(unittest.TestCase):
    def setUp(self):
        import onnxruntime as ort

        self.ort = ort

    def test_default_disables_cpu_mem_arena(self):
        from frigate.detectors.detection_runners import get_ort_session_options

        opts = get_ort_session_options()
        self.assertFalse(opts.enable_cpu_mem_arena)

    def test_default_keeps_mem_pattern_enabled(self):
        from frigate.detectors.detection_runners import get_ort_session_options

        opts = get_ort_session_options()
        self.assertTrue(opts.enable_mem_pattern)

    def test_variable_length_inputs_disables_mem_pattern(self):
        from frigate.detectors.detection_runners import get_ort_session_options

        opts = get_ort_session_options(variable_length_inputs=True)
        self.assertFalse(opts.enable_mem_pattern)
        self.assertFalse(opts.enable_cpu_mem_arena)

    def test_complex_model_sets_basic_optimization(self):
        from frigate.detectors.detection_runners import get_ort_session_options

        import onnxruntime as ort

        opts = get_ort_session_options(is_complex_model=True)
        self.assertEqual(
            opts.graph_optimization_level,
            ort.GraphOptimizationLevel.ORT_ENABLE_BASIC,
        )

    def test_always_returns_session_options(self):
        from frigate.detectors.detection_runners import get_ort_session_options

        import onnxruntime as ort

        self.assertIsInstance(get_ort_session_options(), ort.SessionOptions)
        self.assertIsInstance(
            get_ort_session_options(is_complex_model=True), ort.SessionOptions
        )
        self.assertIsInstance(
            get_ort_session_options(variable_length_inputs=True), ort.SessionOptions
        )


class TestHasVariableLengthInputs(unittest.TestCase):
    def test_jina_v1_is_variable(self):
        from frigate.detectors.detection_runners import ONNXModelRunner
        from frigate.embeddings.types import EnrichmentModelTypeEnum

        self.assertTrue(
            ONNXModelRunner.has_variable_length_inputs(
                EnrichmentModelTypeEnum.jina_v1.value
            )
        )

    def test_jina_v2_is_variable(self):
        from frigate.detectors.detection_runners import ONNXModelRunner
        from frigate.embeddings.types import EnrichmentModelTypeEnum

        self.assertTrue(
            ONNXModelRunner.has_variable_length_inputs(
                EnrichmentModelTypeEnum.jina_v2.value
            )
        )

    def test_paddleocr_is_variable(self):
        from frigate.detectors.detection_runners import ONNXModelRunner
        from frigate.embeddings.types import EnrichmentModelTypeEnum

        self.assertTrue(
            ONNXModelRunner.has_variable_length_inputs(
                EnrichmentModelTypeEnum.paddleocr.value
            )
        )

    def test_yolo_generic_is_fixed(self):
        from frigate.detectors.detection_runners import ONNXModelRunner
        from frigate.detectors.detector_config import ModelTypeEnum

        self.assertFalse(
            ONNXModelRunner.has_variable_length_inputs(ModelTypeEnum.yologeneric.value)
        )

    def test_none_is_fixed(self):
        from frigate.detectors.detection_runners import ONNXModelRunner

        self.assertFalse(ONNXModelRunner.has_variable_length_inputs(None))


class TestComputeCudaMemLimit(unittest.TestCase):
    @staticmethod
    def _fake_mem_get_info(free_value: int, total_value: int):
        def _impl(free_ptr, total_ptr):
            free_ptr._obj.value = free_value
            total_ptr._obj.value = total_value
            return 0  # cudaSuccess

        return _impl

    @patch("frigate.util.model.ctypes.CDLL")
    @patch("os.path.getsize", return_value=200 * 1024 * 1024)
    def test_respects_ceiling(self, _mock_getsize, mock_cdll):
        from frigate.util.model import compute_cuda_mem_limit

        total_vram = 24 * 1024**3
        mock_lib = MagicMock()
        mock_cdll.return_value = mock_lib
        mock_lib.cudaMemGetInfo.side_effect = self._fake_mem_get_info(
            total_vram, total_vram
        )

        limit = compute_cuda_mem_limit("/fake/model.onnx", cuda_graph=False)
        self.assertLessEqual(limit, int(total_vram * 0.80))

    @patch("frigate.util.model.ctypes.CDLL", side_effect=OSError("no cuda"))
    def test_returns_none_when_cuda_unavailable(self, _mock_cdll):
        # See compute_cuda_mem_limit docstring for the tradeoff: returning a
        # hardcoded fallback was wrong for low-VRAM devices (Jetson Nano, K620).
        from frigate.util.model import compute_cuda_mem_limit

        self.assertIsNone(compute_cuda_mem_limit("/fake/model.onnx"))

    @patch("frigate.util.model.ctypes.CDLL")
    @patch("os.path.getsize", return_value=50 * 1024 * 1024)
    def test_floor_is_at_least_2gb(self, _mock_getsize, mock_cdll):
        from frigate.util.model import compute_cuda_mem_limit

        total_vram = 24 * 1024**3
        mock_lib = MagicMock()
        mock_cdll.return_value = mock_lib
        mock_lib.cudaMemGetInfo.side_effect = self._fake_mem_get_info(
            total_vram, total_vram
        )

        limit = compute_cuda_mem_limit("/fake/model.onnx", cuda_graph=False)
        self.assertGreaterEqual(limit, 2 * 1024**3)

    @patch("frigate.util.model.ctypes.CDLL")
    @patch("os.path.getsize", return_value=200 * 1024 * 1024)
    def test_returns_none_when_cuda_returns_error_code(self, _mock_getsize, mock_cdll):
        # Bug #1: cudaMemGetInfo returning non-zero left both ptrs at 0,
        # producing gpu_mem_limit=0 and immediate session OOM. We now return
        # None so the caller omits gpu_mem_limit and ORT manages the arena.
        from frigate.util.model import compute_cuda_mem_limit

        mock_lib = MagicMock()
        mock_cdll.return_value = mock_lib
        mock_lib.cudaMemGetInfo.return_value = 2  # cudaErrorMemoryAllocation

        self.assertIsNone(compute_cuda_mem_limit("/fake/model.onnx", cuda_graph=False))

    @patch("frigate.util.model.ctypes.CDLL")
    @patch("os.path.getsize", return_value=200 * 1024 * 1024)
    def test_capped_by_free_vram_when_constrained(self, _mock_getsize, mock_cdll):
        # Bug #2: with 3 GB free of 24 GB, the limit must respect free × 0.9,
        # not 80% of total — co-resident embedding sessions would OOM otherwise.
        from frigate.util.model import compute_cuda_mem_limit

        mock_lib = MagicMock()
        mock_cdll.return_value = mock_lib
        mock_lib.cudaMemGetInfo.side_effect = self._fake_mem_get_info(
            3 * 1024**3, 24 * 1024**3
        )

        limit = compute_cuda_mem_limit("/fake/model.onnx", cuda_graph=False)
        self.assertLessEqual(limit, int(3 * 1024**3 * 0.90))


class TestOrtLeakFixRegression(unittest.TestCase):
    """Regression guards for the embeddings_manager ORT memory leak fix.

    These tests verify that the three leak vectors identified in GitHub Discussion
    #23007 remain fixed:

      1. ORT CPU BFC arena (enable_cpu_mem_arena) — must be False for all sessions
         so host-side GPU↔CPU staging buffers are not pooled indefinitely.

      2. ORT memory-pattern cache (enable_mem_pattern) — must be False for
         variable-length embedding models (Jina, PaddleOCR) to prevent one
         mmap-backed plan per unique sequence length from accumulating forever.
         Must remain True for fixed-size models (YOLO) to preserve buffer aliasing.

      3. mallopt(M_ARENA_MAX) — must be called from inside EmbeddingProcess.run()
         because forkserver spawn does not inherit Docker env vars, so setting
         MALLOC_ARENA_MAX in docker-compose has no effect on the child process.
    """

    def test_get_optimized_runner_passes_variable_length_for_jina(self):
        """get_optimized_runner must enable variable_length_inputs for Jina models."""
        from frigate.detectors.detection_runners import get_ort_session_options
        from frigate.embeddings.types import EnrichmentModelTypeEnum

        with patch(
            "frigate.detectors.detection_runners.get_ort_session_options",
            wraps=get_ort_session_options,
        ) as mock_opts, patch(
            "frigate.detectors.detection_runners.ort.InferenceSession"
        ), patch(
            "frigate.detectors.detection_runners.get_ort_providers",
            return_value=(["CPUExecutionProvider"], [{}]),
        ), patch(
            "frigate.detectors.detection_runners.is_rknn_compatible",
            return_value=False,
        ), patch(
            "os.path.getsize", return_value=100 * 1024 * 1024
        ):
            from frigate.detectors.detection_runners import get_optimized_runner

            get_optimized_runner(
                "/fake/jina.onnx",
                device="CPU",
                model_type=EnrichmentModelTypeEnum.jina_v2.value,
            )

        calls = mock_opts.call_args_list
        self.assertTrue(
            any(c.kwargs.get("variable_length_inputs") for c in calls),
            "get_ort_session_options must be called with variable_length_inputs=True "
            "for Jina models to prevent mmap plan cache growth",
        )

    def test_get_optimized_runner_does_not_set_variable_length_for_yolo(self):
        """get_optimized_runner must NOT set variable_length_inputs for YOLO.

        Disabling enable_mem_pattern on YOLO (fixed 640×640 input) prevents ORT
        from aliasing buffers between nodes, pushing peak GPU memory from ~1.8 GB
        to >4 GB and crashing CUDA graph capture.
        """
        from frigate.detectors.detection_runners import get_ort_session_options
        from frigate.detectors.detector_config import ModelTypeEnum

        with patch(
            "frigate.detectors.detection_runners.get_ort_session_options",
            wraps=get_ort_session_options,
        ) as mock_opts, patch(
            "frigate.detectors.detection_runners.ort.InferenceSession"
        ) as mock_session, patch(
            "frigate.detectors.detection_runners.get_ort_providers",
            return_value=(["CPUExecutionProvider"], [{}]),
        ), patch(
            "frigate.detectors.detection_runners.is_rknn_compatible",
            return_value=False,
        ), patch(
            "os.path.getsize", return_value=220 * 1024 * 1024
        ):
            mock_session.return_value.get_inputs.return_value = []
            mock_session.return_value.get_outputs.return_value = []
            from frigate.detectors.detection_runners import get_optimized_runner

            get_optimized_runner(
                "/fake/yolov9.onnx",
                device="CPU",
                model_type=ModelTypeEnum.yologeneric.value,
            )

        for call in mock_opts.call_args_list:
            self.assertFalse(
                call.kwargs.get("variable_length_inputs", False),
                "variable_length_inputs must not be True for YOLO — disabling "
                "enable_mem_pattern on fixed-size models causes CUDA graph crashes",
            )

    def test_all_sessions_disable_cpu_mem_arena(self):
        """enable_cpu_mem_arena must be False regardless of model type.

        With the arena enabled, ORT pools CPU-side staging buffers for GPU↔CPU
        transfers indefinitely, causing RSS growth of hundreds of MB per hour.
        """
        from frigate.detectors.detection_runners import get_ort_session_options
        from frigate.embeddings.types import EnrichmentModelTypeEnum

        for model_type in [
            None,
            EnrichmentModelTypeEnum.jina_v1.value,
            EnrichmentModelTypeEnum.jina_v2.value,
            EnrichmentModelTypeEnum.paddleocr.value,
        ]:
            with self.subTest(model_type=model_type):
                from frigate.detectors.detection_runners import ONNXModelRunner

                opts = get_ort_session_options(
                    variable_length_inputs=ONNXModelRunner.has_variable_length_inputs(
                        model_type
                    )
                )
                self.assertFalse(
                    opts.enable_cpu_mem_arena,
                    f"enable_cpu_mem_arena must be False for model_type={model_type}",
                )

    def test_embedding_process_calls_mallopt(self):
        """EmbeddingProcess.run() must call mallopt(M_ARENA_MAX) to cap glibc arenas.

        Forkserver spawn exec's a fresh Python interpreter that does not inherit
        Docker env vars.  MALLOC_ARENA_MAX set in docker-compose never reaches
        the child process, so mallopt() must be called explicitly from run().
        """
        import frigate.embeddings as emb_module

        # Make EmbeddingMaintainer raise immediately so run() exits after mallopt.
        with patch.object(
            emb_module, "EmbeddingMaintainer", side_effect=RuntimeError("stop")
        ), patch.object(
            emb_module.EmbeddingProcess, "pre_run_setup"
        ), patch(
            "ctypes.CDLL"
        ) as mock_cdll:
            mock_libc = MagicMock()
            mock_cdll.return_value = mock_libc

            process = emb_module.EmbeddingProcess.__new__(
                emb_module.EmbeddingProcess
            )
            process.config = MagicMock()
            process.metrics = MagicMock()
            process.stop_event = MagicMock(is_set=MagicMock(return_value=True))

            try:
                process.run()
            except RuntimeError:
                pass

            mock_cdll.assert_called_with("libc.so.6")
            mock_libc.mallopt.assert_called_once()
            args = mock_libc.mallopt.call_args[0]
            self.assertEqual(
                args[0],
                -8,  # M_ARENA_MAX
                "mallopt must be called with M_ARENA_MAX (-8)",
            )


class TestRunnerOmitsGpuMemLimitOnCudaQueryFailure(unittest.TestCase):
    """When compute_cuda_mem_limit returns None, get_optimized_runner must NOT
    inject gpu_mem_limit at all, leaving ORT's grow-as-needed default in place."""

    @patch("frigate.detectors.detection_runners.ort.InferenceSession")
    @patch(
        "frigate.detectors.detection_runners.get_ort_providers",
        return_value=(["CUDAExecutionProvider"], [{"device_id": 0}]),
    )
    @patch(
        "frigate.detectors.detection_runners.is_rknn_compatible",
        return_value=False,
    )
    @patch("frigate.util.model.ctypes.CDLL", side_effect=OSError("no cuda"))
    @patch("os.path.getsize", return_value=200 * 1024 * 1024)
    def test_no_gpu_mem_limit_key_when_cuda_query_fails(
        self, _gs, _cdll, _rknn, _gp, mock_session
    ):
        from frigate.detectors.detection_runners import get_optimized_runner
        from frigate.embeddings.types import EnrichmentModelTypeEnum

        mock_session.return_value.get_inputs.return_value = []
        mock_session.return_value.get_outputs.return_value = []

        get_optimized_runner(
            "/fake/jina.onnx",
            device="GPU",
            model_type=EnrichmentModelTypeEnum.jina_v2.value,
        )

        provider_opts = mock_session.call_args.kwargs["provider_options"]
        self.assertNotIn(
            "gpu_mem_limit",
            provider_opts[0],
            "Must omit (not set to 0, not set to a guess) when query fails",
        )


class TestCudaGraphFallbackLogsException(unittest.TestCase):
    @patch("frigate.detectors.detection_runners.ort.InferenceSession")
    @patch(
        "frigate.detectors.detection_runners.get_ort_providers",
        return_value=(["CUDAExecutionProvider"], [{"device_id": 0}]),
    )
    @patch(
        "frigate.detectors.detection_runners.is_rknn_compatible",
        return_value=False,
    )
    @patch("frigate.util.model.ctypes.CDLL", side_effect=OSError("no cuda"))
    @patch("os.path.getsize", return_value=200 * 1024 * 1024)
    def test_fallback_warning_includes_exception_text(
        self, _gs, _cdll, _rknn, _gp, mock_session
    ):
        # Concern #1: the bare `except Exception:` swallowed the underlying
        # ORT error (cudaErrorStreamCaptureUnsupported, missing libnvrtc, etc.),
        # turning a debuggable failure into an opaque "fell back to ONNX runner".
        from frigate.detectors.detection_runners import get_optimized_runner
        from frigate.detectors.detector_config import ModelTypeEnum

        mock_session.side_effect = [
            RuntimeError("cudaErrorStreamCaptureUnsupported"),
            MagicMock(get_inputs=lambda: [], get_outputs=lambda: []),
        ]

        with self.assertLogs(
            "frigate.detectors.detection_runners", level="WARNING"
        ) as captured:
            get_optimized_runner(
                "/m/yolo.onnx", "GPU", ModelTypeEnum.yologeneric.value
            )

        joined = "\n".join(captured.output)
        self.assertIn("CUDA graph capture failed", joined)
        self.assertIn("cudaErrorStreamCaptureUnsupported", joined)


if __name__ == "__main__":
    unittest.main()
