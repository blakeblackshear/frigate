"""Tests for the TFLite detection model shared by the TFLite detectors."""

import unittest

import numpy as np

from frigate.detectors.detector_config import ModelConfig, ModelTypeEnum
from frigate.detectors.detector_utils import TFLiteDetectionModel


class FakeInterpreter:
    """Stands in for a TFLite interpreter with fixed output tensors."""

    def __init__(self, outputs, input_dtype=np.uint8, allocate_error=None):
        self.outputs = {}
        self.output_details = []
        self.allocate_error = allocate_error
        self.input_details = [
            {"index": 0, "dtype": input_dtype, "shape": np.array([1, 320, 320, 3])}
        ]
        self.input = None

        for i, (tensor, quantization) in enumerate(outputs, start=1):
            self.outputs[i] = tensor
            self.output_details.append(
                {
                    "index": i,
                    "dtype": tensor.dtype,
                    "shape": np.array(tensor.shape),
                    "quantization": quantization,
                }
            )

    def allocate_tensors(self):
        if self.allocate_error:
            raise self.allocate_error

    def get_input_details(self):
        return self.input_details

    def get_output_details(self):
        return self.output_details

    def set_tensor(self, index, value):
        self.input = value

    def invoke(self):
        pass

    def tensor(self, index):
        return lambda: self.outputs[index]

    def get_tensor(self, index):
        return self.outputs[index]


def model_with_type(model_type) -> ModelConfig:
    return ModelConfig(
        path="/config/model.tflite",
        model_type=model_type,
        labelmap_path=None,
        labelmap={0: "person"},
        width=320,
        height=320,
    )


def ssd_outputs(scores, count=None):
    num = len(scores)
    boxes = np.tile(np.array([0.1, 0.2, 0.3, 0.4], np.float32), (1, num, 1))
    class_ids = np.arange(num, dtype=np.float32).reshape(1, num)
    scores = np.array(scores, np.float32).reshape(1, num)
    count = np.array([num if count is None else count], np.float32)
    return [
        (boxes, (0.0, 0)),
        (class_ids, (0.0, 0)),
        (scores, (0.0, 0)),
        (count, (0.0, 0)),
    ]


# 320x320 YOLO heads at strides 8, 16 and 32 have 40*40 + 20*20 + 10*10 anchors
YOLO_ANCHORS = 2100
YOLO_CLASSES = 3
SCORES_SCALE = 1 / 32
BOXES_SCALE = 0.1


def yolo_outputs(candidates, dtype=np.int8):
    """Build quantized YOLO outputs.

    Args:
        candidates: (anchor index, class id, logit, ltrb distances in strides)
        dtype: The output tensors' type

    Returns:
        The class score and DFL box tensors with their quantization
    """
    scores = np.full((1, YOLO_ANCHORS, YOLO_CLASSES), -128, dtype)
    boxes = np.full((1, YOLO_ANCHORS, 4, 16), -100, dtype)

    for anchor, class_id, logit, distances in candidates:
        scores[0, anchor, class_id] = round(logit / SCORES_SCALE)

        # a single hot bin per side decodes to that bin's distance
        for side, distance in enumerate(distances):
            boxes[0, anchor, side, distance] = 100

    boxes = boxes.reshape(1, YOLO_ANCHORS, 64)

    if np.issubdtype(dtype, np.floating):
        return [(scores, (0.0, 0)), (boxes, (0.0, 0))]

    return [(scores, (SCORES_SCALE, 0)), (boxes, (BOXES_SCALE, 0))]


class TestTFLiteDetectionModel(unittest.TestCase):
    def test_ssd_returns_detections_above_min_score(self):
        interpreter = FakeInterpreter(ssd_outputs([0.9, 0.5, 0.3, 0.8]))
        model = TFLiteDetectionModel(
            interpreter, model_with_type(ModelTypeEnum.ssd), "cpu"
        )

        detections = model.detect_raw(np.zeros((1, 320, 320, 3), np.uint8))

        # stops at the first score under the minimum, as SSD scores are sorted
        np.testing.assert_allclose(
            detections[:2],
            [[0, 0.9, 0.1, 0.2, 0.3, 0.4], [1, 0.5, 0.1, 0.2, 0.3, 0.4]],
            rtol=1e-6,
        )
        self.assertFalse(detections[2:].any())

    def test_ssd_caps_detections_at_twenty(self):
        interpreter = FakeInterpreter(ssd_outputs([0.9] * 25))
        model = TFLiteDetectionModel(
            interpreter, model_with_type(ModelTypeEnum.ssd), "cpu"
        )

        detections = model.detect_raw(np.zeros((1, 320, 320, 3), np.uint8))

        self.assertEqual(detections.shape, (20, 6))
        self.assertTrue((detections[:, 1] == np.float32(0.9)).all())

    def test_ssd_model_without_four_outputs_is_rejected(self):
        interpreter = FakeInterpreter(yolo_outputs([]))

        with self.assertRaisesRegex(ValueError, "yolo-generic"):
            TFLiteDetectionModel(interpreter, model_with_type(ModelTypeEnum.ssd), "cpu")

    def test_int8_input_is_shifted_from_uint8(self):
        interpreter = FakeInterpreter(ssd_outputs([0.9], count=0), np.int8)
        model = TFLiteDetectionModel(
            interpreter, model_with_type(ModelTypeEnum.ssd), "cpu"
        )
        frame = np.zeros((1, 320, 320, 3), np.uint8)
        frame[0, 0, 0] = [0, 128, 255]

        model.detect_raw(frame)

        self.assertEqual(interpreter.input.dtype, np.int8)
        self.assertEqual(interpreter.input[0, 0, 0].tolist(), [-128, 0, 127])

    def test_yolo_decodes_quantized_outputs(self):
        # anchor 420 is row 10, column 20 of the stride 8 head, centered on
        # (20.5, 10.5) strides. Its neighbor overlaps it and should be removed
        # by NMS as it has a lower score.
        interpreter = FakeInterpreter(
            yolo_outputs([(420, 2, 2.0, (2, 3, 4, 5)), (421, 1, 1.0, (2, 3, 4, 5))])
        )
        model = TFLiteDetectionModel(
            interpreter, model_with_type(ModelTypeEnum.yologeneric), "cpu"
        )

        detections = model.detect_raw(np.zeros((1, 320, 320, 3), np.uint8))

        # box corners are (20.5 - 2, 10.5 - 3) and (20.5 + 4, 10.5 + 5) strides
        np.testing.assert_allclose(
            detections[0],
            [2, 1 / (1 + np.exp(-2.0)), 60 / 320, 148 / 320, 124 / 320, 196 / 320],
            rtol=1e-4,
        )
        self.assertFalse(detections[1:].any())

    def test_yolo_without_candidates_returns_no_detections(self):
        interpreter = FakeInterpreter(yolo_outputs([]))
        model = TFLiteDetectionModel(
            interpreter, model_with_type(ModelTypeEnum.yologeneric), "cpu"
        )

        detections = model.detect_raw(np.zeros((1, 320, 320, 3), np.uint8))

        self.assertFalse(detections.any())

    def test_yolo_model_with_float_outputs_is_rejected(self):
        interpreter = FakeInterpreter(yolo_outputs([], np.float32))

        with self.assertRaisesRegex(ValueError, "int8 quantized"):
            TFLiteDetectionModel(
                interpreter, model_with_type(ModelTypeEnum.yologeneric), "cpu"
            )

    def test_unsupported_model_type_is_rejected(self):
        interpreter = FakeInterpreter(ssd_outputs([0.9]))

        with self.assertRaisesRegex(ValueError, "yolox is currently not supported"):
            TFLiteDetectionModel(
                interpreter, model_with_type(ModelTypeEnum.yolox), "cpu"
            )

    def test_edgetpu_compiled_model_is_explained(self):
        interpreter = FakeInterpreter(
            ssd_outputs([0.9]),
            allocate_error=RuntimeError(
                "Encountered unresolved custom op: edgetpu-custom-op."
            ),
        )

        with (
            self.assertLogs("frigate.detectors.detector_utils", "ERROR") as logs,
            self.assertRaises(RuntimeError),
        ):
            TFLiteDetectionModel(interpreter, model_with_type(ModelTypeEnum.ssd), "cpu")

        self.assertIn("compiled for the EdgeTPU", logs.output[0])


if __name__ == "__main__":
    unittest.main(verbosity=2)
