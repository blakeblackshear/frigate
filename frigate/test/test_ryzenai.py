"""Tests for the Ryzen AI detectors (vitisai, cpu_yolo) and the shared GPU providers."""

import json
import os
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import numpy as np

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import ModelConfig
from frigate.detectors.detector_types import api_types, config_types
from frigate.detectors.device import parse_device
from frigate.detectors.plugins import cpu_yolo, vitisai
from frigate.detectors.plugins.cpu_yolo import CPUYoloDetector, CPUYoloDetectorConfig
from frigate.detectors.plugins.vitisai import VitisAIDetector, VitisAIDetectorConfig
from frigate.util import model as model_util

SIZE = 640
LOGIT_ON = 10.0
LOGIT_OFF = -10.0

# a cell in the middle of the finest level, and the box it decodes to
ROW = COL = 40
CELL = ROW * 80 + COL


def model() -> ModelConfig:
    return ModelConfig(
        path="/config/models/yolov8s_xint8_c200.onnx",
        labelmap_path=None,
        labelmap={79: "toothbrush"},
        width=SIZE,
        height=SIZE,
    )


def decoder(family: str, cls=VitisAIDetector) -> VitisAIDetector:
    """A detector with its decode state set up and no session."""
    detector = object.__new__(cls)
    detector.family = family
    detector.conf = 0.4
    detector.iou = 0.5
    detector.width = detector.height = SIZE
    detector._build_anchors()
    return detector


def v8_outputs(class_id: int, bin_index: int) -> list[np.ndarray]:
    box = np.zeros((1, 64, 8400), dtype=np.float32)
    cls = np.full((1, 80, 8400), LOGIT_OFF, dtype=np.float32)

    for side in range(4):
        box[0, side * 16 + bin_index, CELL] = 30.0

    cls[0, class_id, CELL] = LOGIT_ON
    return [box, cls]


def nas_outputs(class_id: int, bin_index: int) -> list[np.ndarray]:
    outputs = []

    for size in (80, 40, 20):
        cls = np.full((1, 80, size, size), LOGIT_OFF, dtype=np.float32)
        reg = np.zeros((1, 68, size, size), dtype=np.float32)

        if size == 80:
            cls[0, class_id, ROW, COL] = LOGIT_ON

            for side in range(4):
                reg[0, side * 17 + bin_index, ROW, COL] = 30.0

        outputs += [cls, reg]

    return outputs


class TestRegistration(unittest.TestCase):
    def test_every_detector_is_registered(self):
        for key, cls in (
            ("vitisai", VitisAIDetector),
            ("cpu_yolo", CPUYoloDetector),
        ):
            self.assertIs(api_types[key], cls)
            self.assertIn(key, config_types)

    def test_cpu_yolo_lists_the_detection_api_as_a_base(self):
        # the registry only scans direct subclasses of DetectionApi
        self.assertIn(DetectionApi, CPUYoloDetector.__bases__)

    def test_the_device_strings_parse(self):
        for device in ("vitisai", "cpu_yolo"):
            self.assertEqual(parse_device(device).detector, device)


class TestDecode(unittest.TestCase):
    def test_the_dfl_expectation_is_the_peak_bin(self):
        logits = np.full((4, 16, 1), -20.0, dtype=np.float32)
        logits[:, 5, 0] = 20.0

        result = VitisAIDetector._softmax_expect(logits, 16)

        np.testing.assert_allclose(result, np.full((4, 1), 5.0), atol=1e-3)

    def test_a_yolov8_head_becomes_normalized_corners(self):
        detector = decoder("v8")
        detector.ort = MagicMock()
        detector.ort.run.return_value = v8_outputs(class_id=16, bin_index=3)
        detector.input_name = "images"

        detections = detector.detect_raw(np.zeros((1, 3, SIZE, SIZE), np.float32))

        # centre 40.5 cells at stride 8, three cells to each side
        low, high = (40.5 - 3) * 8 / SIZE, (40.5 + 3) * 8 / SIZE
        self.assertEqual(detections.shape, (20, 6))
        self.assertEqual(detections[0][0], 16)
        self.assertGreater(detections[0][1], 0.99)
        np.testing.assert_allclose(detections[0][2:], [low] * 2 + [high] * 2, atol=1e-5)
        self.assertFalse(detections[1:].any())

    def test_a_yolo_nas_head_becomes_normalized_corners(self):
        detector = decoder("nas")
        detector.ort = MagicMock()
        detector.ort.run.return_value = nas_outputs(class_id=2, bin_index=2)
        detector.input_name = "images"

        detections = detector.detect_raw(np.zeros((1, 3, SIZE, SIZE), np.float32))

        # distances are in pixels of the level, so bin 2 is 16 pixels at stride 8
        low, high = (40.5 * 8 - 16) / SIZE, (40.5 * 8 + 16) / SIZE
        self.assertEqual(detections[0][0], 2)
        np.testing.assert_allclose(detections[0][2:], [low] * 2 + [high] * 2, atol=1e-5)

    def test_scores_under_the_threshold_give_no_detections(self):
        detector = decoder("v8")
        detector.ort = MagicMock()
        detector.ort.run.return_value = [
            np.zeros((1, 64, 8400), np.float32),
            np.full((1, 80, 8400), LOGIT_OFF, np.float32),
        ]
        detector.input_name = "images"

        detections = detector.detect_raw(np.zeros((1, 3, SIZE, SIZE), np.float32))

        self.assertFalse(detections.any())


class TestFamily(unittest.TestCase):
    def resolve(self, family: str, heads: int) -> str:
        detector = object.__new__(VitisAIDetector)
        detector.family = family
        detector.output_names = [f"out{index}" for index in range(heads)]
        detector._resolve_family()
        return detector.family

    def test_the_output_count_picks_the_head_layout(self):
        self.assertEqual(self.resolve("auto", 6), "nas")
        self.assertEqual(self.resolve("auto", 2), "v8")

    def test_an_explicit_family_is_kept(self):
        self.assertEqual(self.resolve("nas", 2), "nas")

    def test_an_unknown_layout_is_refused(self):
        with self.assertRaises(ValueError):
            self.resolve("auto", 3)


class TestDispatchCheck(unittest.TestCase):
    def check(self, devices: list[dict], require_npu: bool) -> None:
        object.__new__(VitisAIDetector)._check_dispatch(
            {"deviceStat": devices}, require_npu
        )

    def test_conv_nodes_on_the_npu_pass(self):
        self.check(
            [
                {"name": "all", "nodeNum": 10},
                {"name": "NPU", "nodeNum": 9, "supportedOpType": ["Conv:"]},
            ],
            True,
        )

    def test_a_silent_cpu_fallback_stops_startup(self):
        with self.assertRaises(RuntimeError):
            self.check([{"name": "all", "nodeNum": 10}], True)

    def test_a_fallback_is_only_logged_when_the_npu_is_not_required(self):
        with self.assertLogs(vitisai.logger, level="ERROR"):
            self.check([{"name": "all", "nodeNum": 10}], False)

    def test_no_report_is_a_fallback(self):
        with self.assertRaises(RuntimeError):
            object.__new__(VitisAIDetector)._check_dispatch(None, True)

    def test_an_npu_partition_without_conv_is_a_fallback(self):
        with self.assertRaises(RuntimeError):
            self.check(
                [
                    {"name": "all", "nodeNum": 10},
                    {"name": "NPU", "nodeNum": 3, "supportedOpType": ["Concat:"]},
                ],
                True,
            )


NPU_REPORT = {
    "deviceStat": [
        {"name": "all", "nodeNum": 10},
        {"name": "NPU", "nodeNum": 9, "supportedOpType": ["Conv:"]},
    ]
}


class TestReportCache(unittest.TestCase):
    """The EP writes a partition report only when it compiles, not on a cache hit."""

    def start(self, cache: str, compiles: list[bool]) -> MagicMock:
        def create(*args, **kwargs):
            options = kwargs["provider_options"][0]
            path = os.path.join(options["cache_dir"], options["cache_key"])

            if compiles.pop(0):
                os.makedirs(path, exist_ok=True)
                with open(os.environ["XLNX_ONNX_EP_REPORT_FILE"], "w") as f:
                    json.dump(NPU_REPORT, f)

            return fake_session(2)

        with patch.object(vitisai.ort, "InferenceSession") as session:
            session.side_effect = create
            VitisAIDetector(
                VitisAIDetectorConfig(type="vitisai", model=model(), cache_dir=cache)
            )

        return session

    def saved_report(self, cache: str) -> str:
        return os.path.join(cache, "yolov8s_xint8_c200", vitisai.SAVED_REPORT)

    def test_a_fresh_compile_keeps_its_report(self):
        with tempfile.TemporaryDirectory() as cache:
            self.start(cache, [True])

            with open(self.saved_report(cache)) as f:
                self.assertEqual(json.load(f), NPU_REPORT)

    def test_a_cache_hit_is_checked_with_the_kept_report(self):
        with tempfile.TemporaryDirectory() as cache:
            self.start(cache, [True])
            session = self.start(cache, [False])

        self.assertEqual(session.call_count, 1)

    def test_a_cache_without_a_kept_report_is_recompiled(self):
        with tempfile.TemporaryDirectory() as cache:
            os.makedirs(os.path.join(cache, "yolov8s_xint8_c200"))
            session = self.start(cache, [False, True])

            self.assertEqual(session.call_count, 2)
            self.assertTrue(os.path.exists(self.saved_report(cache)))


def fake_session(heads: int) -> MagicMock:
    session = MagicMock()
    session.get_inputs.return_value = [SimpleNamespace(name="images")]
    session.get_outputs.return_value = [
        SimpleNamespace(name=f"out{index}") for index in range(heads)
    ]
    session.run.return_value = v8_outputs(0, 3)[:1] + [
        np.full((1, 80, 8400), LOGIT_OFF, np.float32)
    ]
    return session


class TestSessions(unittest.TestCase):
    def test_vitisai_gets_only_the_npu_provider(self):
        with (
            tempfile.TemporaryDirectory() as cache,
            patch.object(vitisai.ort, "InferenceSession") as session,
            patch.object(VitisAIDetector, "_check_dispatch"),
        ):
            session.return_value = fake_session(2)
            detector = VitisAIDetector(
                VitisAIDetectorConfig(type="vitisai", model=model(), cache_dir=cache)
            )

        kwargs = session.call_args.kwargs
        self.assertEqual(kwargs["providers"], ["VitisAIExecutionProvider"])
        options = kwargs["provider_options"][0]
        self.assertEqual(options["target"], "X1")
        self.assertEqual(options["xclbin"], "/opt/xilinx/xclbins/phoenix/4x4.xclbin")
        self.assertEqual(options["xlnx_enable_py3_round"], 0)
        self.assertEqual(detector.family, "v8")

    def test_cpu_yolo_gets_only_the_cpu_provider(self):
        with patch.object(cpu_yolo.ort, "InferenceSession") as session:
            session.return_value = fake_session(2)
            detector = CPUYoloDetector(
                CPUYoloDetectorConfig(type="cpu_yolo", model=model())
            )

        self.assertEqual(
            session.call_args.kwargs["providers"], ["CPUExecutionProvider"]
        )
        self.assertEqual(detector.family, "v8")


class TestSharedProviders(unittest.TestCase):
    def test_vitisai_is_left_out_of_the_shared_gpu_session(self):
        # MIGraphX and VitisAI in one session abort, so the onnx detector and
        # the enrichment models must not get the NPU provider
        available = [
            "MIGraphXExecutionProvider",
            "VitisAIExecutionProvider",
            "CPUExecutionProvider",
        ]

        with (
            patch.object(model_util.ort, "get_available_providers") as providers,
            patch.object(model_util.os, "makedirs"),
        ):
            providers.return_value = available
            chosen, options = model_util.get_ort_providers()

        self.assertEqual(chosen, ["MIGraphXExecutionProvider", "CPUExecutionProvider"])
        self.assertEqual(len(options), 2)


if __name__ == "__main__":
    unittest.main()
