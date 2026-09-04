"""Tests for the device each model runner reports after loading."""

import threading
import unittest
from unittest.mock import MagicMock, patch

from frigate.detectors import detection_runners
from frigate.detectors.detection_runners import (
    CudaGraphRunner,
    ONNXModelRunner,
    OpenVINOModelRunner,
    RKNNModelRunner,
    get_optimized_runner,
    loaded_devices,
    record_loaded_device,
    snapshot_loaded_devices,
)


class TestRunnerDeviceName(unittest.TestCase):
    def _onnx(self, providers: list[str]) -> ONNXModelRunner:
        session = MagicMock()
        session.get_providers.return_value = providers
        return ONNXModelRunner(session, "arcface")

    def test_onnx_provider_names(self):
        self.assertEqual(
            self._onnx(["CUDAExecutionProvider", "CPUExecutionProvider"]).device_name,
            "CUDA",
        )
        self.assertEqual(
            self._onnx(["TensorrtExecutionProvider"]).device_name, "TensorRT"
        )
        self.assertEqual(
            self._onnx(["MIGraphXExecutionProvider"]).device_name, "MIGraphX"
        )
        self.assertEqual(
            self._onnx(["OpenVINOExecutionProvider"]).device_name, "OpenVINO"
        )
        self.assertEqual(self._onnx(["CPUExecutionProvider"]).device_name, "CPU")
        self.assertEqual(self._onnx(["ROCMExecutionProvider"]).device_name, "ROCM")
        self.assertEqual(self._onnx([]).device_name, "CPU")

    def test_cuda_graph_runner(self):
        runner = CudaGraphRunner(MagicMock(), 0)
        self.assertEqual(runner.device_name, "CUDA")

    def test_openvino_reports_compiled_device(self):
        runner = OpenVINOModelRunner.__new__(OpenVINOModelRunner)
        runner.compiled_device = "GPU"
        runner.compiled_model = MagicMock()
        self.assertEqual(runner.device_name, "OpenVINO GPU")

    def test_openvino_auto_resolves_execution_device(self):
        runner = OpenVINOModelRunner.__new__(OpenVINOModelRunner)
        runner.compiled_device = "AUTO"
        runner.compiled_model = MagicMock()
        runner.compiled_model.get_property.return_value = ["GPU.0"]
        self.assertEqual(runner.device_name, "OpenVINO GPU.0")
        runner.compiled_model.get_property.side_effect = RuntimeError("no prop")
        self.assertEqual(runner.device_name, "OpenVINO AUTO")

    def test_rknn(self):
        runner = RKNNModelRunner.__new__(RKNNModelRunner)
        self.assertEqual(runner.device_name, "RKNN")


class TestLoadRegistry(unittest.TestCase):
    def setUp(self):
        loaded_devices.clear()

    def test_get_optimized_runner_records_device(self):
        session = MagicMock()
        session.get_providers.return_value = ["CPUExecutionProvider"]

        with (
            patch.object(detection_runners, "is_rknn_compatible", return_value=False),
            patch.object(
                detection_runners,
                "get_ort_providers",
                return_value=(["CPUExecutionProvider"], [{}]),
            ),
            patch.object(
                detection_runners, "is_openvino_gpu_npu_available", return_value=False
            ),
            patch.object(
                detection_runners.ort, "InferenceSession", return_value=session
            ),
            patch.object(
                detection_runners, "get_ort_session_options", return_value=None
            ),
        ):
            runner = get_optimized_runner("/models/arcface.onnx", "GPU", "arcface")

        self.assertIsInstance(runner, ONNXModelRunner)
        self.assertEqual(loaded_devices["/models/arcface.onnx"], ("arcface", "CPU"))


class TestLoadedDeviceSnapshot(unittest.TestCase):
    def setUp(self):
        loaded_devices.clear()

    def test_record_and_snapshot_copy(self):
        record_loaded_device("/m/a.onnx", "arcface", "CUDA")

        snapshot = snapshot_loaded_devices()
        self.assertEqual(snapshot, {"/m/a.onnx": ("arcface", "CUDA")})

        # a copy, so a load on another thread cannot disturb a fold in progress
        record_loaded_device("/m/b.onnx", "jina_v1", "CPU")
        self.assertNotIn("/m/b.onnx", snapshot)
        self.assertIn("/m/b.onnx", loaded_devices)

    def test_snapshot_survives_concurrent_inserts(self):
        stop = threading.Event()

        def writer() -> None:
            i = 0
            while not stop.is_set():
                record_loaded_device(f"/m/{i}.onnx", "paddleocr", "CPU")
                i += 1

        thread = threading.Thread(target=writer, daemon=True)
        thread.start()
        try:
            for _ in range(200):
                for _entry in snapshot_loaded_devices().values():
                    pass
        finally:
            stop.set()
            thread.join(timeout=5)
