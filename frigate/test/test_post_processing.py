"""Tests for detector post-processing NMS box format handling.

cv2.dnn.NMSBoxes expects boxes as [x, y, width, height]. Passing corner
coordinates [x1, y1, x2, y2] makes OpenCV treat x2/y2 as width/height,
inflating every box toward the bottom-right by its distance from the origin.
Two well separated objects far from the origin then appear to overlap and the
lower scoring one is silently suppressed.

The regression geometry used throughout: two boxes with zero true overlap,
A = (393, 499, 484, 620) and B = (527, 499, 618, 620) in a 640x640 input
(43 px gap). Misread as [x, y, w, h] their IoU is 0.465, above the 0.4 NMS
threshold, so the buggy format drops the lower scoring box while correct
conversion keeps both.
"""

import math
import unittest
from queue import Queue

import numpy as np

from frigate.detectors.plugins.memryx import MemryXDetector
from frigate.util.model import (
    post_process_dfine,
    post_process_rfdetr,
    post_process_yolo,
    post_process_yolox,
)

WIDTH = 640
HEIGHT = 640

# box A: xyxy (393, 499, 484, 620) as center format
A_CX, A_CY, A_W, A_H = 438.5, 559.5, 91.0, 121.0
# box B: xyxy (527, 499, 618, 620) as center format
B_CX, B_CY, B_W, B_H = 572.5, 559.5, 91.0, 121.0

# expected normalized output rows: [class_id, conf, y1, x1, y2, x2]
A_ROW = [499 / 640, 393 / 640, 620 / 640, 484 / 640]
B_ROW = [499 / 640, 527 / 640, 620 / 640, 618 / 640]


def kept(detections: np.ndarray) -> np.ndarray:
    """Rows of the padded (20, 6) output that hold real detections."""
    return detections[detections[:, 1] > 0]


class TestYoloNmsPostProcess(unittest.TestCase):
    def _single_output(self, rows: list[list[float]]) -> list[np.ndarray]:
        """Build a single-tensor YOLO output (1, attrs, anchors) from
        [cx, cy, w, h, class scores...] rows, padded with empty anchors."""
        anchors = np.zeros((10, len(rows[0])), dtype=np.float32)
        anchors[: len(rows)] = np.array(rows, dtype=np.float32)
        return [anchors.T[np.newaxis, ...]]

    def test_keeps_separated_objects_far_from_origin(self):
        output = self._single_output(
            [
                [A_CX, A_CY, A_W, A_H, 0.90, 0.0],
                [B_CX, B_CY, B_W, B_H, 0.0, 0.85],
            ]
        )

        detections = kept(post_process_yolo(output, WIDTH, HEIGHT))

        self.assertEqual(len(detections), 2)
        np.testing.assert_allclose(detections[0], [0, 0.90, *A_ROW], atol=2e-3)
        np.testing.assert_allclose(detections[1], [1, 0.85, *B_ROW], atol=2e-3)

    def test_still_suppresses_true_duplicates(self):
        # same object twice, shifted 4 px: true IoU 0.92, must dedupe to one
        output = self._single_output(
            [
                [A_CX, A_CY, A_W, A_H, 0.90, 0.0],
                [A_CX + 4, A_CY, A_W, A_H, 0.85, 0.0],
            ]
        )

        detections = kept(post_process_yolo(output, WIDTH, HEIGHT))

        self.assertEqual(len(detections), 1)
        np.testing.assert_allclose(detections[0], [0, 0.90, *A_ROW], atol=2e-3)


class TestYoloEndToEndPostProcess(unittest.TestCase):
    def test_converts_pixel_xyxy_output(self):
        output = np.zeros((1, 300, 6), dtype=np.float32)
        output[0, 0] = [393, 499, 484, 620, 0.90, 0]
        output[0, 1] = [527, 499, 618, 620, 0.85, 1]

        detections = kept(post_process_yolo([output], WIDTH, HEIGHT))

        self.assertEqual(len(detections), 2)
        np.testing.assert_allclose(detections[0], [0, 0.90, *A_ROW], atol=2e-3)
        np.testing.assert_allclose(detections[1], [1, 0.85, *B_ROW], atol=2e-3)

    def test_filters_and_sorts_detections(self):
        output = np.zeros((1, 300, 6), dtype=np.float32)
        output[0, 0] = [393, 499, 484, 620, 0.50, 0]
        output[0, 1] = [527, 499, 618, 620, 0.90, 1]
        output[0, 2] = [100, 100, 200, 200, 0.40, 2]

        detections = kept(post_process_yolo([output], WIDTH, HEIGHT))

        self.assertEqual(len(detections), 2)
        self.assertEqual(detections[0, 0], 1)
        self.assertEqual(detections[1, 0], 0)


class TestMultipartYoloPostProcess(unittest.TestCase):
    def _multipart_output(self) -> list[np.ndarray]:
        """Build a 3-scale anchor-based YOLO output containing boxes A and B,
        both decoded through anchor 0 of the stride-32 scale."""
        outputs = [
            np.zeros((1, 255, 80, 80), dtype=np.float32),
            np.zeros((1, 255, 40, 40), dtype=np.float32),
            np.zeros((1, 255, 20, 20), dtype=np.float32),
        ]
        stride, (anchor_w, anchor_h) = 32, (142, 110)

        for cx, cy, w, h, conf, class_channel in [
            (A_CX, A_CY, A_W, A_H, 0.95, 5),  # class 0
            (B_CX, B_CY, B_W, B_H, 0.90, 6),  # class 1
        ]:
            cell_x, cell_y = int(cx // stride), int(cy // stride)
            dx = (cx / stride - cell_x + 0.5) / 2
            dy = (cy / stride - cell_y + 0.5) / 2
            dw = math.sqrt(w / anchor_w) / 2
            dh = math.sqrt(h / anchor_h) / 2
            # anchor 0 occupies channels 0-84 of the 255 channel tensor
            outputs[2][0, 0:4, cell_y, cell_x] = [dx, dy, dw, dh]
            outputs[2][0, 4, cell_y, cell_x] = conf
            outputs[2][0, class_channel, cell_y, cell_x] = 1.0

        return outputs

    def test_keeps_separated_objects_far_from_origin(self):
        detections = kept(post_process_yolo(self._multipart_output(), WIDTH, HEIGHT))

        self.assertEqual(len(detections), 2)
        np.testing.assert_allclose(detections[0], [0, 0.95, *A_ROW], atol=2e-3)
        np.testing.assert_allclose(detections[1], [1, 0.90, *B_ROW], atol=2e-3)

    def test_empty_output_returns_no_detections(self):
        outputs = [
            np.zeros((1, 255, 80, 80), dtype=np.float32),
            np.zeros((1, 255, 40, 40), dtype=np.float32),
            np.zeros((1, 255, 20, 20), dtype=np.float32),
        ]

        detections = kept(post_process_yolo(outputs, WIDTH, HEIGHT))

        self.assertEqual(len(detections), 0)


class TestYoloxPostProcess(unittest.TestCase):
    def test_keeps_separated_objects_far_from_origin(self):
        # with zero grids and unit strides the decode reduces to
        # cx = raw cx and w = exp(raw w)
        rows = np.zeros((10, 7), dtype=np.float32)
        rows[0] = [A_CX, A_CY, math.log(A_W), math.log(A_H), 1.0, 0.90, 0.0]
        rows[1] = [B_CX, B_CY, math.log(B_W), math.log(B_H), 1.0, 0.0, 0.85]
        predictions = rows[np.newaxis, ...]
        grids = np.zeros((1, 10, 2), dtype=np.float32)
        expanded_strides = np.ones((1, 10, 1), dtype=np.float32)

        detections = kept(
            post_process_yolox(predictions, WIDTH, HEIGHT, grids, expanded_strides)
        )

        self.assertEqual(len(detections), 2)
        np.testing.assert_allclose(detections[0], [0, 0.90, *A_ROW], atol=2e-3)
        np.testing.assert_allclose(detections[1], [1, 0.85, *B_ROW], atol=2e-3)


class TestDfinePostProcess(unittest.TestCase):
    def test_keeps_separated_objects_far_from_origin(self):
        # D-FINE emits absolute pixel xyxy boxes alongside labels and scores
        labels = np.zeros((1, 10), dtype=np.int64)
        labels[0, 1] = 1
        boxes = np.zeros((1, 10, 4), dtype=np.float32)
        boxes[0, 0] = [393, 499, 484, 620]
        boxes[0, 1] = [527, 499, 618, 620]
        scores = np.zeros((1, 10), dtype=np.float32)
        scores[0, 0] = 0.90
        scores[0, 1] = 0.85

        detections = kept(post_process_dfine([labels, boxes, scores], WIDTH, HEIGHT))

        self.assertEqual(len(detections), 2)
        np.testing.assert_allclose(detections[0], [0, 0.90, *A_ROW], atol=2e-3)
        np.testing.assert_allclose(detections[1], [1, 0.85, *B_ROW], atol=2e-3)


class TestRfdetrPostProcess(unittest.TestCase):
    def test_keeps_separated_objects_far_from_origin(self):
        # RF-DETR emits normalized center format boxes and class logits where
        # logit index 0 is the background class
        boxes = np.zeros((1, 10, 4), dtype=np.float32)
        boxes[0, 0] = [A_CX / WIDTH, A_CY / HEIGHT, A_W / WIDTH, A_H / HEIGHT]
        boxes[0, 1] = [B_CX / WIDTH, B_CY / HEIGHT, B_W / WIDTH, B_H / HEIGHT]
        # background heavy logits everywhere, then two confident objects
        logits = np.tile(np.array([10.0, 0.0, 0.0], dtype=np.float32), (1, 10, 1))
        logits[0, 0] = [0.0, 4.0, 0.0]  # class 0 after background offset
        logits[0, 1] = [0.0, 0.0, 3.5]  # class 1 after background offset

        detections = kept(post_process_rfdetr([boxes, logits]))

        conf_a = math.exp(4.0) / (math.exp(4.0) + 2)
        conf_b = math.exp(3.5) / (math.exp(3.5) + 2)
        self.assertEqual(len(detections), 2)
        np.testing.assert_allclose(detections[0], [0, conf_a, *A_ROW], atol=2e-3)
        np.testing.assert_allclose(detections[1], [1, conf_b, *B_ROW], atol=2e-3)


class TestMemryxSsdlitePostProcess(unittest.TestCase):
    def test_keeps_separated_objects_far_from_origin(self):
        # the NMS math runs on the host CPU, so the real method is testable
        # without MemryX hardware; it only needs the model dimensions and
        # the output queue
        detector = object.__new__(MemryXDetector)
        detector.memx_model_width = WIDTH
        detector.memx_model_height = HEIGHT
        detector.output_queue = Queue()

        # this path uses a 0.5 NMS threshold, so use a tighter pair: zero
        # true overlap (10 px gap), IoU 0.69 when misread as [x, y, w, h]
        dets = np.zeros((1, 10, 5), dtype=np.float32)
        dets[0, 0] = [480, 500, 540, 620, 0.90]
        dets[0, 1] = [550, 500, 610, 620, 0.85]
        labels = np.zeros((1, 10), dtype=np.float32)
        labels[0, 1] = 1

        detector.post_process_ssdlite([dets, labels])
        detections = kept(detector.output_queue.get())

        self.assertEqual(len(detections), 2)
        np.testing.assert_allclose(
            detections[0],
            [0, 0.90, 500 / 640, 480 / 640, 620 / 640, 540 / 640],
            atol=2e-3,
        )
        np.testing.assert_allclose(
            detections[1],
            [1, 0.85, 500 / 640, 550 / 640, 620 / 640, 610 / 640],
            atol=2e-3,
        )


if __name__ == "__main__":
    unittest.main()
