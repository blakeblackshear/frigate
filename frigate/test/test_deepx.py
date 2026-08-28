"""Tests for the DEEPX detector's per-format output decoding."""

import unittest

import numpy as np
from pydantic import ValidationError

from frigate.detectors.detector_config import ModelTypeEnum
from frigate.detectors.plugins.deepx import (
    ANCHOR_FORMATS,
    ANCHOR_FREE_FORMATS,
    DEVICE_IDS_AUTO,
    NMS_IN_HEAD_FORMATS,
    PPU_ANCHORS,
    PPU_RECORD_SIZE,
    DeepxDetectorConfig,
    DeepxModelTypeEnum,
    ModelFormatEnum,
    decode_damoyolo_raw,
    decode_ppu_anchor,
    decode_ppu_anchor_free,
    decode_raw_anchor,
    decode_raw_nms_in_head,
    decode_ssd_raw,
    parse_device_ids,
    resolve_devices,
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

        detections = decode_ppu_anchor(outputs, 640, 640, 0.25, 0.45)

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
            return decode_ppu_anchor(outputs, 640, 640, 0.25, 0.45)

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

        detections = decode_ppu_anchor(outputs, 640, 640, 0.25, 0.45)

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

        detections = decode_ppu_anchor(
            [records.reshape(1, 40, PPU_RECORD_SIZE)], 640, 640, 0.25, 0.45
        )

        self.assertEqual(detections.shape, (20, 6))

    def test_returns_empty_detections_for_no_output(self):
        self.assertTrue(np.all(decode_ppu_anchor([], 640, 640, 0.25, 0.45) == 0))

    def test_returns_empty_detections_for_an_unexpected_record_width(self):
        # a non-PPU model would produce a different record width
        outputs = [np.zeros((1, 4, 16), dtype=np.uint8)]

        self.assertTrue(np.all(decode_ppu_anchor(outputs, 640, 640, 0.25, 0.45) == 0))


class TestDeepxModelFormats(unittest.TestCase):
    def test_every_yolo_format_belongs_to_exactly_one_family(self):
        families = [ANCHOR_FORMATS, ANCHOR_FREE_FORMATS, NMS_IN_HEAD_FORMATS]
        yolo_formats = ANCHOR_FORMATS | ANCHOR_FREE_FORMATS | NMS_IN_HEAD_FORMATS

        for fmt in ModelFormatEnum:
            if fmt not in yolo_formats:
                continue

            matches = [family for family in families if fmt in family]
            self.assertEqual(
                len(matches), 1, f"{fmt.value} must be in exactly one family"
            )

    def test_families_do_not_overlap(self):
        self.assertFalse(ANCHOR_FORMATS & ANCHOR_FREE_FORMATS)
        self.assertFalse(ANCHOR_FORMATS & NMS_IN_HEAD_FORMATS)
        self.assertFalse(ANCHOR_FREE_FORMATS & NMS_IN_HEAD_FORMATS)

    def test_every_format_belongs_to_a_yolo_family(self):
        # apart from the `auto` sentinel, every ModelFormatEnum member is a
        # yolo-generic head shape -- nothing should be unclassified
        yolo_formats = ANCHOR_FORMATS | ANCHOR_FREE_FORMATS | NMS_IN_HEAD_FORMATS

        for fmt in ModelFormatEnum:
            if fmt is ModelFormatEnum.auto:
                continue

            self.assertIn(fmt, yolo_formats, f"{fmt.value} is not classified")

    def test_auto_is_in_no_family(self):
        """`auto` means "no explicit layout", so every decode branch keyed off
        a family must fall through to shape-based inference."""
        self.assertNotIn(ModelFormatEnum.auto, ANCHOR_FORMATS)
        self.assertNotIn(ModelFormatEnum.auto, ANCHOR_FREE_FORMATS)
        self.assertNotIn(ModelFormatEnum.auto, NMS_IN_HEAD_FORMATS)


class TestDeepxDetectorConfig(unittest.TestCase):
    def test_ppu_without_model_format_is_rejected(self):
        """PPU records are fixed-width regardless of variant, so an unset
        model_format can't be inferred and must not silently fall back to the
        anchor decoder."""
        with self.assertRaises(ValidationError):
            DeepxDetectorConfig(type="deepx", ppu=True)

    def test_ppu_with_anchor_free_model_format_is_accepted(self):
        config = DeepxDetectorConfig(
            type="deepx", ppu=True, model_format=ModelFormatEnum.anchor_free
        )

        self.assertEqual(config.model_format, ModelFormatEnum.anchor_free)

    def test_raw_without_model_format_is_still_accepted(self):
        # the raw path falls back to shape-based inference, so this remains
        # optional when ppu is not set
        config = DeepxDetectorConfig(type="deepx")

        self.assertIs(config.model_format, ModelFormatEnum.auto)

    def test_an_omitted_model_format_folds_to_auto(self):
        """The config form round-trips a value for every field, so a blank or
        null entry has to land on the sentinel rather than stay None."""
        for value in (None, "", "  "):
            with self.subTest(value=value):
                config = DeepxDetectorConfig(type="deepx", model_format=value)

                self.assertIs(config.model_format, ModelFormatEnum.auto)

    def test_ppu_with_damoyolo_model_type_is_rejected(self):
        """No confirmed PPU record layout exists for DAMO-YOLO yet."""
        with self.assertRaises(ValidationError):
            DeepxDetectorConfig(
                type="deepx",
                ppu=True,
                model_format=ModelFormatEnum.anchor_free,
                model_type=DeepxModelTypeEnum.damoyolo,
            )

    def test_ssd_model_type_takes_no_model_format(self):
        """SSD's layout is fixed: DX-COM keeps the softmax and prior decode
        inside the .dxnn, so no backbone has to be named."""
        config = DeepxDetectorConfig(type="deepx", model_type=DeepxModelTypeEnum.ssd)

        self.assertIs(config.model_format, ModelFormatEnum.auto)

    def test_ssd_model_type_rejects_a_model_format(self):
        with self.assertRaises(ValidationError):
            DeepxDetectorConfig(
                type="deepx",
                model_format=ModelFormatEnum.anchor_free,
                model_type=DeepxModelTypeEnum.ssd,
            )

    def test_damoyolo_model_type_rejects_a_model_format(self):
        with self.assertRaises(ValidationError):
            DeepxDetectorConfig(
                type="deepx",
                model_format=ModelFormatEnum.anchor_free,
                model_type=DeepxModelTypeEnum.damoyolo,
            )

    def test_damoyolo_model_type_without_model_format_is_accepted(self):
        config = DeepxDetectorConfig(
            type="deepx",
            model_type=DeepxModelTypeEnum.damoyolo,
        )

        self.assertIs(config.model_format, ModelFormatEnum.auto)


class TestDeepxDeviceIds(unittest.TestCase):
    def test_a_comma_separated_string_is_kept(self):
        config = DeepxDetectorConfig(type="deepx", device_ids="0,1")

        self.assertEqual(config.device_ids, "0,1")
        self.assertEqual(resolve_devices(config.device_ids), [0, 1])

    def test_a_yaml_list_is_accepted(self):
        """A bare list is the natural thing to hand-write, so it is folded
        into the same comma-separated form the config UI writes."""
        config = DeepxDetectorConfig(type="deepx", device_ids=[0, 1])

        self.assertEqual(config.device_ids, "0,1")
        self.assertEqual(resolve_devices(config.device_ids), [0, 1])

    def test_a_single_index_is_accepted(self):
        config = DeepxDetectorConfig(type="deepx", device_ids=1)

        self.assertEqual(config.device_ids, "1")
        self.assertEqual(resolve_devices(config.device_ids), [1])

    def test_surrounding_whitespace_is_tolerated(self):
        config = DeepxDetectorConfig(type="deepx", device_ids=" 0 , 1 ")

        self.assertEqual(resolve_devices(config.device_ids), [0, 1])

    def test_an_unparsable_value_is_rejected_at_config_load(self):
        with self.assertRaises(ValidationError):
            DeepxDetectorConfig(type="deepx", device_ids="gpu0")

    def test_unset_leaves_device_selection_to_auto_detection(self):
        config = DeepxDetectorConfig(type="deepx")

        self.assertEqual(config.device_ids, DEVICE_IDS_AUTO)
        self.assertEqual(parse_device_ids(config.device_ids), [])

    def test_a_blank_entry_folds_to_auto(self):
        """The config form round-trips a value for every field, so a blank or
        null entry has to land on the sentinel rather than stay None."""
        for value in (None, "", "  ", []):
            with self.subTest(value=value):
                config = DeepxDetectorConfig(type="deepx", device_ids=value)

                self.assertEqual(config.device_ids, DEVICE_IDS_AUTO)

    def test_auto_is_case_insensitive(self):
        config = DeepxDetectorConfig(type="deepx", device_ids="AUTO")

        self.assertEqual(parse_device_ids(config.device_ids), [])


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

        detections = decode_ppu_anchor_free(outputs, 640, 640, 0.25, 0.45)

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

        anchor_free = decode_ppu_anchor_free(outputs, 640, 640, 0.25, 0.45)
        anchor = decode_ppu_anchor(outputs, 640, 640, 0.25, 0.45)

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

        detections = decode_raw_anchor(outputs, 640, 640, 0.25, 0.45)

        self.assertEqual(detections[0][0], 3)
        self.assertAlmostEqual(detections[0][1], 0.4, places=5)

    def test_drops_rows_whose_combined_score_is_below_threshold(self):
        # 0.4 * 0.5 = 0.2, under a 0.25 threshold even though both parts are
        # individually above it
        outputs = self.build_raw_anchor_output(
            [(320.0, 320.0, 40.0, 80.0, 0.4, 3, 0.5)]
        )

        detections = decode_raw_anchor(outputs, 640, 640, 0.25, 0.45)

        self.assertTrue(np.all(detections == 0))

    def test_converts_center_form_to_normalized_corners(self):
        outputs = self.build_raw_anchor_output(
            [(320.0, 160.0, 64.0, 32.0, 1.0, 0, 1.0)]
        )

        detections = decode_raw_anchor(outputs, 640, 640, 0.25, 0.45)

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

        detections = decode_raw_nms_in_head([out], 640, 640, 0.25)

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

        detections = decode_raw_nms_in_head([out], 640, 640, 0.25)

        self.assertAlmostEqual(detections[0][1], 0.9, places=5)
        self.assertTrue(np.all(detections[1] == 0))

    def test_returns_empty_detections_for_an_empty_output(self):
        out = np.zeros((1, 0, 6), dtype=np.float32)

        self.assertTrue(np.all(decode_raw_nms_in_head([out], 640, 640, 0.25) == 0))


class TestDeepxSsdDecode(unittest.TestCase):
    """The .dxnn emits final boxes and probabilities, so these feed the
    decoder what a real compiled SSD produces: corner-form boxes normalized
    to [0, 1] and post-softmax confidences with background at column 0."""

    def build_ssd_output(self, box_index, box, class_id, prob, num_boxes=3000):
        num_classes = 21  # 20 VOC classes + background

        boxes = np.zeros((1, num_boxes, 4), dtype=np.float32)
        boxes[0, box_index] = box

        # every other box is background, as the model would report it
        scores = np.zeros((1, num_boxes, num_classes), dtype=np.float32)
        scores[0, :, 0] = 1.0
        scores[0, box_index, 0] = 1.0 - prob
        scores[0, box_index, class_id] = prob

        return [boxes, scores]

    def test_decodes_an_already_decoded_box(self):
        outputs = self.build_ssd_output(
            box_index=7, box=(0.1, 0.2, 0.5, 0.8), class_id=5, prob=0.9
        )

        detections = decode_ssd_raw(outputs, 300, 300, 0.25, 0.45)

        # boxes pass through untouched apart from the corner reorder, and
        # the background class is dropped so labels shift down by one
        self.assertEqual(detections[0][0], 4)
        self.assertAlmostEqual(float(detections[0][1]), 0.9, places=5)
        self.assertAlmostEqual(float(detections[0][2]), 0.2, places=5)  # y_min
        self.assertAlmostEqual(float(detections[0][3]), 0.1, places=5)  # x_min
        self.assertAlmostEqual(float(detections[0][4]), 0.8, places=5)  # y_max
        self.assertAlmostEqual(float(detections[0][5]), 0.5, places=5)  # x_max

    def test_confidences_are_not_softmaxed_again(self):
        """A second softmax over 21 already-normalized probabilities pulls
        every score toward 1/21, which is what silently dropped every real
        detection under the default threshold."""
        outputs = self.build_ssd_output(
            box_index=0, box=(0.1, 0.1, 0.4, 0.4), class_id=15, prob=0.6
        )

        detections = decode_ssd_raw(outputs, 300, 300, 0.25, 0.45)

        self.assertAlmostEqual(float(detections[0][1]), 0.6, places=5)

    def test_any_box_count_is_accepted(self):
        """3000 for the MobileNet backbones, 8732 for VGG16 -- the decoder
        reads whatever the model emits rather than a per-backbone table."""
        for num_boxes in (3000, 8732):
            with self.subTest(num_boxes=num_boxes):
                outputs = self.build_ssd_output(
                    box_index=num_boxes - 1,
                    box=(0.0, 0.0, 1.0, 1.0),
                    class_id=1,
                    prob=0.8,
                    num_boxes=num_boxes,
                )

                detections = decode_ssd_raw(outputs, 300, 300, 0.25, 0.45)

                self.assertEqual(detections[0][0], 0)
                self.assertAlmostEqual(float(detections[0][1]), 0.8, places=5)

    def test_output_order_does_not_matter(self):
        boxes, scores = self.build_ssd_output(
            box_index=1, box=(0.2, 0.2, 0.6, 0.6), class_id=3, prob=0.7
        )

        forward = decode_ssd_raw([boxes, scores], 300, 300, 0.25, 0.45)
        reversed_ = decode_ssd_raw([scores, boxes], 300, 300, 0.25, 0.45)

        np.testing.assert_array_equal(forward, reversed_)

    def test_low_confidence_detection_is_dropped(self):
        outputs = self.build_ssd_output(
            box_index=0, box=(0.1, 0.1, 0.4, 0.4), class_id=3, prob=0.05
        )

        detections = decode_ssd_raw(outputs, 300, 300, 0.5, 0.45)

        self.assertTrue(np.all(detections == 0))

    def test_returns_empty_detections_when_outputs_cannot_be_told_apart(self):
        # two tensors that both look class-shaped (last dim != 4)
        outputs = [
            np.zeros((1, 10, 21), dtype=np.float32),
            np.zeros((1, 10, 21), dtype=np.float32),
        ]

        detections = decode_ssd_raw(outputs, 300, 300, 0.25, 0.45)

        self.assertTrue(np.all(detections == 0))

    def test_returns_empty_detections_when_box_and_class_counts_disagree(self):
        boxes = np.zeros((1, 10, 4), dtype=np.float32)
        scores = np.zeros((1, 12, 21), dtype=np.float32)

        detections = decode_ssd_raw([boxes, scores], 300, 300, 0.25, 0.45)

        self.assertTrue(np.all(detections == 0))


class TestDeepxDamoyoloDecode(unittest.TestCase):
    def total_priors(self, width, height, strides):
        return sum((height // s) * (width // s) for s in strides)

    def test_decodes_a_detection_from_already_decoded_boxes(self):
        """box_output shaped (1, N, 4): DX-COM's export is assumed to have
        already applied the full distance-to-box decode, so these are final
        (x_min, y_min, x_max, y_max) pixel coordinates, used as-is."""
        width = height = 640
        num_priors = 100
        prior_index = 5

        cls_scores = np.zeros((1, num_priors, 80), dtype=np.float32)
        cls_scores[0, prior_index, 7] = 0.9

        box_output = np.zeros((1, num_priors, 4), dtype=np.float32)
        box_output[0, prior_index] = [100.0, 120.0, 140.0, 160.0]

        detections = decode_damoyolo_raw(
            [cls_scores, box_output], width, height, 0.25, 0.45
        )

        self.assertEqual(detections[0][0], 7)
        self.assertAlmostEqual(detections[0][1], 0.9, places=5)
        self.assertAlmostEqual(detections[0][2], 120 / height, places=5)
        self.assertAlmostEqual(detections[0][3], 100 / width, places=5)
        self.assertAlmostEqual(detections[0][4], 160 / height, places=5)
        self.assertAlmostEqual(detections[0][5], 140 / width, places=5)

    def test_decodes_a_detection_from_a_dfl_distribution(self):
        """box_output shaped (1, N, 4, bins): a raw per-side DFL histogram,
        needing softmax + integral + stride-scaled distance-to-box here."""
        width = height = 640
        strides = (8, 16, 32)
        grid_w = width // 8
        prior_row, prior_col = 10, 10
        prior_index = prior_row * grid_w + prior_col
        num_priors = self.total_priors(width, height, strides)

        cls_scores = np.zeros((1, num_priors, 80), dtype=np.float32)
        cls_scores[0, prior_index, 9] = 0.8

        # reg_max=1 (2 bins): put ~all softmax mass on bin index 1, so the
        # integral (weighted sum against [0, 1]) comes out to ~1.0 stride
        # unit on every side
        box_output = np.zeros((1, num_priors, 4, 2), dtype=np.float32)
        box_output[0, prior_index, :, 0] = -30.0
        box_output[0, prior_index, :, 1] = 30.0

        detections = decode_damoyolo_raw(
            [cls_scores, box_output], width, height, 0.25, 0.45, strides
        )

        # stride-8 grid cell (10, 10) centers at pixel (80, 80); ~1
        # stride-unit distance on every side -> an 8px box around it
        self.assertEqual(detections[0][0], 9)
        self.assertAlmostEqual(detections[0][1], 0.8, places=5)
        self.assertAlmostEqual(detections[0][2], 72 / height, places=3)
        self.assertAlmostEqual(detections[0][3], 72 / width, places=3)
        self.assertAlmostEqual(detections[0][4], 88 / height, places=3)
        self.assertAlmostEqual(detections[0][5], 88 / width, places=3)

    def test_returns_empty_detections_below_score_threshold(self):
        num_priors = 10
        cls_scores = np.zeros((1, num_priors, 80), dtype=np.float32)
        cls_scores[0, 0, 1] = 0.1

        box_output = np.zeros((1, num_priors, 4), dtype=np.float32)
        box_output[0, 0] = [10.0, 10.0, 20.0, 20.0]

        detections = decode_damoyolo_raw([cls_scores, box_output], 640, 640, 0.5, 0.45)

        self.assertTrue(np.all(detections == 0))

    def test_returns_empty_detections_when_dfl_prior_count_does_not_match_the_grid(
        self,
    ):
        # a DFL-shaped box output with far fewer priors than the (8, 16, 32)
        # strides actually produce for a 640x640 input
        num_priors = 5
        cls_scores = np.zeros((1, num_priors, 80), dtype=np.float32)
        cls_scores[0, 0, 1] = 0.9
        box_output = np.zeros((1, num_priors, 4, 2), dtype=np.float32)

        detections = decode_damoyolo_raw(
            [cls_scores, box_output], 640, 640, 0.25, 0.45, (8, 16, 32)
        )

        self.assertTrue(np.all(detections == 0))

    def test_returns_empty_detections_when_box_and_class_counts_disagree(self):
        cls_scores = np.zeros((1, 10, 80), dtype=np.float32)
        cls_scores[0, 0, 1] = 0.9
        box_output = np.zeros((1, 7, 4), dtype=np.float32)

        detections = decode_damoyolo_raw([cls_scores, box_output], 640, 640, 0.25, 0.45)

        self.assertTrue(np.all(detections == 0))

    def test_returns_empty_detections_for_wrong_output_count(self):
        outputs = [np.zeros((1, 10, 80), dtype=np.float32)]

        detections = decode_damoyolo_raw(outputs, 640, 640, 0.25, 0.45, (8, 16, 32))

        self.assertTrue(np.all(detections == 0))


if __name__ == "__main__":
    unittest.main()


class TestDeepxModelType(unittest.TestCase):
    def test_model_type_defaults_to_yolo_generic(self):
        """Frigate's own model_type default is ssd, which silently picked the
        SSD decoder for anyone who left it unset."""
        config = DeepxDetectorConfig(type="deepx")

        self.assertIs(config.model_type, DeepxModelTypeEnum.yologeneric)

    def test_model_type_values_match_frigate_model_types(self):
        """The detector writes its choice back onto model.model_type, so every
        value has to round-trip through ModelTypeEnum."""
        for value in DeepxModelTypeEnum:
            with self.subTest(value=value):
                self.assertEqual(ModelTypeEnum(value.value).value, value.value)
