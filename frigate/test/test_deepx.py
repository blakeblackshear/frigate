"""Tests for the DEEPX detector's per-format output decoding."""

import unittest

import numpy as np

from frigate.detectors.plugins.deepx import (
    ANCHOR_FORMATS,
    ANCHOR_FREE_FORMATS,
    NMS_IN_HEAD_FORMATS,
    PPU_ANCHORS,
    PPU_RECORD_SIZE,
    ModelFormatEnum,
    decode_yolo_ppu_anchor,
    decode_yolo_ppu_anchor_free,
    decode_yolo_raw_anchor,
    decode_yolo_raw_nms_in_head,
)


def build_ppu_record(
    box: tuple[float, float, float, float],
    grid_y: int,
    grid_x: int,
    anchor_idx: int,
    layer_idx: int,
    score: float,
    label: int,
) -> np.ndarray:
    """Build a single fixed-width detection record as the PPU emits it."""
    record = np.zeros(PPU_RECORD_SIZE, dtype=np.uint8)
    record[0:16] = np.array(box, dtype=np.float32).view(np.uint8)
    record[16:20] = [grid_y, grid_x, anchor_idx, layer_idx]
    record[20:24] = np.array([score], dtype=np.float32).view(np.uint8)
    record[24:28] = np.array([label], dtype=np.uint32).view(np.uint8)
    return record


class TestDeepxPpuDecode(unittest.TestCase):
    def test_decodes_a_single_detection(self):
        # stride 8 (layer 0) with the first anchor of that layer
        outputs = [
            build_ppu_record(
                box=(0.5, 0.5, 0.5, 0.5),
                grid_y=10,
                grid_x=10,
                anchor_idx=0,
                layer_idx=0,
                score=0.9,
                label=2,
            ).reshape(1, 1, PPU_RECORD_SIZE)
        ]

        detections = decode_yolo_ppu_anchor(outputs, 640, 640, 0.25, 0.45)

        anchor_w, anchor_h = PPU_ANCHORS[8][0]
        # center = (0.5 * 2 - 0.5 + 10) * 8, size = (0.5 ** 2 * 4) * anchor
        center = (0.5 * 2.0 - 0.5 + 10) * 8
        box_w = 0.5**2 * 4.0 * anchor_w
        box_h = 0.5**2 * 4.0 * anchor_h

        self.assertEqual(detections[0][0], 2)
        self.assertAlmostEqual(detections[0][1], 0.9, places=5)
        self.assertAlmostEqual(detections[0][2], (center - box_h / 2) / 640, places=5)
        self.assertAlmostEqual(detections[0][3], (center - box_w / 2) / 640, places=5)
        self.assertAlmostEqual(detections[0][4], (center + box_h / 2) / 640, places=5)
        self.assertAlmostEqual(detections[0][5], (center + box_w / 2) / 640, places=5)

        # remaining slots stay empty
        self.assertTrue(np.all(detections[1:] == 0))

    def test_uses_the_anchor_for_the_records_layer(self):
        # the same box on stride 32 (layer 2) must decode to a larger box
        def decode(layer_idx: int) -> np.ndarray:
            outputs = [
                build_ppu_record(
                    box=(0.5, 0.5, 0.5, 0.5),
                    grid_y=1,
                    grid_x=1,
                    anchor_idx=0,
                    layer_idx=layer_idx,
                    score=0.9,
                    label=0,
                ).reshape(1, 1, PPU_RECORD_SIZE)
            ]
            return decode_yolo_ppu_anchor(outputs, 640, 640, 0.25, 0.45)

        small = decode(0)
        large = decode(2)

        small_width = small[0][5] - small[0][3]
        large_width = large[0][5] - large[0][3]

        self.assertGreater(large_width, small_width)

    def test_drops_detections_below_the_score_threshold(self):
        outputs = [
            build_ppu_record(
                box=(0.5, 0.5, 0.5, 0.5),
                grid_y=10,
                grid_x=10,
                anchor_idx=0,
                layer_idx=0,
                score=0.1,
                label=2,
            ).reshape(1, 1, PPU_RECORD_SIZE)
        ]

        detections = decode_yolo_ppu_anchor(outputs, 640, 640, 0.25, 0.45)

        self.assertTrue(np.all(detections == 0))

    def test_caps_output_at_twenty_detections(self):
        records = np.stack(
            [
                build_ppu_record(
                    box=(0.5, 0.5, 0.5, 0.5),
                    grid_y=i,
                    grid_x=i,
                    anchor_idx=0,
                    layer_idx=0,
                    score=0.9,
                    label=1,
                )
                for i in range(40)
            ]
        )

        detections = decode_yolo_ppu_anchor(
            [records.reshape(1, 40, PPU_RECORD_SIZE)], 640, 640, 0.25, 0.45
        )

        self.assertEqual(detections.shape, (20, 6))

    def test_returns_empty_detections_for_no_output(self):
        self.assertTrue(np.all(decode_yolo_ppu_anchor([], 640, 640, 0.25, 0.45) == 0))

    def test_returns_empty_detections_for_an_unexpected_record_width(self):
        # a non-PPU model would produce a different record width
        outputs = [np.zeros((1, 4, 16), dtype=np.uint8)]

        self.assertTrue(
            np.all(decode_yolo_ppu_anchor(outputs, 640, 640, 0.25, 0.45) == 0)
        )


class TestDeepxModelFormats(unittest.TestCase):
    def test_every_format_belongs_to_exactly_one_family(self):
        families = [ANCHOR_FORMATS, ANCHOR_FREE_FORMATS, NMS_IN_HEAD_FORMATS]

        for fmt in ModelFormatEnum:
            matches = [family for family in families if fmt in family]
            self.assertEqual(
                len(matches), 1, f"{fmt.value} must be in exactly one family"
            )

    def test_families_do_not_overlap(self):
        self.assertFalse(ANCHOR_FORMATS & ANCHOR_FREE_FORMATS)
        self.assertFalse(ANCHOR_FORMATS & NMS_IN_HEAD_FORMATS)
        self.assertFalse(ANCHOR_FREE_FORMATS & NMS_IN_HEAD_FORMATS)


class TestDeepxPpuAnchorFreeDecode(unittest.TestCase):
    def test_reads_the_box_bytes_as_pixel_geometry(self):
        """An anchor-free PPU record holds cx, cy, w, h directly in pixels."""
        record = build_ppu_record(
            box=(320.0, 160.0, 64.0, 32.0),
            # grid columns carry no meaning for an anchor-free head, and must
            # not influence the result
            grid_y=7,
            grid_x=9,
            anchor_idx=2,
            layer_idx=2,
            score=0.9,
            label=0,
        )
        outputs = [record.reshape(1, 1, PPU_RECORD_SIZE)]

        detections = decode_yolo_ppu_anchor_free(outputs, 640, 640, 0.25, 0.45)

        # x: 320 +/- 32 -> 288..352, y: 160 +/- 16 -> 144..176
        self.assertAlmostEqual(detections[0][2], 144 / 640, places=5)
        self.assertAlmostEqual(detections[0][3], 288 / 640, places=5)
        self.assertAlmostEqual(detections[0][4], 176 / 640, places=5)
        self.assertAlmostEqual(detections[0][5], 352 / 640, places=5)

    def test_anchor_formula_would_blow_the_box_up(self):
        """Guards the bug this decoder exists to prevent."""
        record = build_ppu_record(
            box=(320.0, 160.0, 64.0, 32.0),
            grid_y=7,
            grid_x=9,
            anchor_idx=2,
            layer_idx=2,
            score=0.9,
            label=0,
        )
        outputs = [record.reshape(1, 1, PPU_RECORD_SIZE)]

        anchor_free = decode_yolo_ppu_anchor_free(outputs, 640, 640, 0.25, 0.45)
        anchor = decode_yolo_ppu_anchor(outputs, 640, 640, 0.25, 0.45)

        # the anchor decode squares the width, saturating the clip to the frame
        self.assertEqual(anchor[0][5], 1.0)
        self.assertLess(anchor_free[0][5], 1.0)


class TestDeepxRawAnchorDecode(unittest.TestCase):
    def build_raw_anchor_output(self, rows):
        """Build an (1, N, 5+C) tensor with 80 classes."""
        out = np.zeros((1, len(rows), 85), dtype=np.float32)

        for i, (cx, cy, w, h, obj, label, cls_score) in enumerate(rows):
            out[0, i, 0:4] = [cx, cy, w, h]
            out[0, i, 4] = obj
            out[0, i, 5 + label] = cls_score

        return [out]

    def test_confidence_is_objectness_times_class_score(self):
        outputs = self.build_raw_anchor_output(
            [(320.0, 320.0, 40.0, 80.0, 0.8, 3, 0.5)]
        )

        detections = decode_yolo_raw_anchor(outputs, 640, 640, 0.25, 0.45)

        self.assertEqual(detections[0][0], 3)
        self.assertAlmostEqual(detections[0][1], 0.4, places=5)

    def test_drops_rows_whose_combined_score_is_below_threshold(self):
        # 0.4 * 0.5 = 0.2, under a 0.25 threshold even though both parts are
        # individually above it
        outputs = self.build_raw_anchor_output(
            [(320.0, 320.0, 40.0, 80.0, 0.4, 3, 0.5)]
        )

        detections = decode_yolo_raw_anchor(outputs, 640, 640, 0.25, 0.45)

        self.assertTrue(np.all(detections == 0))

    def test_converts_center_form_to_normalized_corners(self):
        outputs = self.build_raw_anchor_output(
            [(320.0, 160.0, 64.0, 32.0, 1.0, 0, 1.0)]
        )

        detections = decode_yolo_raw_anchor(outputs, 640, 640, 0.25, 0.45)

        self.assertAlmostEqual(detections[0][2], 144 / 640, places=5)
        self.assertAlmostEqual(detections[0][3], 288 / 640, places=5)
        self.assertAlmostEqual(detections[0][4], 176 / 640, places=5)
        self.assertAlmostEqual(detections[0][5], 352 / 640, places=5)


class TestDeepxRawNmsInHeadDecode(unittest.TestCase):
    def test_reads_corner_records_without_running_nms(self):
        """Two heavily overlapping boxes both survive: the head already ran NMS."""
        out = np.array(
            [
                [
                    [100.0, 100.0, 200.0, 200.0, 0.9, 2.0],
                    [102.0, 102.0, 202.0, 202.0, 0.8, 2.0],
                ]
            ],
            dtype=np.float32,
        )

        detections = decode_yolo_raw_nms_in_head([out], 640, 640, 0.25)

        self.assertEqual(detections[0][0], 2)
        self.assertAlmostEqual(detections[0][1], 0.9, places=5)
        self.assertAlmostEqual(detections[0][3], 100 / 640, places=5)
        self.assertEqual(detections[1][0], 2)
        self.assertAlmostEqual(detections[1][1], 0.8, places=5)

    def test_applies_the_score_threshold(self):
        out = np.array(
            [
                [
                    [100.0, 100.0, 200.0, 200.0, 0.9, 2.0],
                    [300.0, 300.0, 400.0, 400.0, 0.1, 5.0],
                ]
            ],
            dtype=np.float32,
        )

        detections = decode_yolo_raw_nms_in_head([out], 640, 640, 0.25)

        self.assertAlmostEqual(detections[0][1], 0.9, places=5)
        self.assertTrue(np.all(detections[1] == 0))

    def test_returns_empty_detections_for_an_empty_output(self):
        out = np.zeros((1, 0, 6), dtype=np.float32)

        self.assertTrue(np.all(decode_yolo_raw_nms_in_head([out], 640, 640, 0.25) == 0))


if __name__ == "__main__":
    unittest.main()
