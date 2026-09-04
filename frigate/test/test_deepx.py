"""Tests for the DEEPX detector's per-format output decoding."""

import os
import sys
import unittest
from unittest.mock import patch

import numpy as np
from pydantic import ValidationError

from frigate.detectors.detector_config import ModelTypeEnum
from frigate.detectors.plugins.deepx import (
    ANCHOR_FORMATS,
    ANCHOR_FREE_FORMATS,
    DEEPX_MANIFEST,
    DXRT_IPC_ENDPOINT_ENV,
    DXRT_IPC_SOCKET,
    DXRT_VERSION,
    NMS_IN_HEAD_FORMATS,
    PPU_ANCHOR_LAYERS,
    PPU_RECORD_SIZE,
    DeepxDetector,
    DeepxDetectorConfig,
    DeepxModelTypeEnum,
    ModelFormatEnum,
    decode_damoyolo_raw,
    decode_ppu_anchor,
    decode_ppu_anchor_free,
    decode_raw_anchor,
    decode_raw_anchor_free,
    decode_raw_nms_in_head,
    parse_anchors,
    resolve_device,
    satisfy_service_check,
    service_is_visible,
)
from frigate.util.runtime_deps import ArtifactKind

# Deliberately not any published model's anchor table: a decoder that fell back
# to a built-in set instead of reading the configured one would not match these.
TEST_ANCHOR_STRING = "11,17,23,29,31,37;41,47,53,59,61,67;71,73,79,83,89,97"
TEST_ANCHORS = parse_anchors(TEST_ANCHOR_STRING)


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

        detections = decode_ppu_anchor(outputs, TEST_ANCHORS, 640, 640, 0.25, 0.45)

        anchor_w, anchor_h = TEST_ANCHORS[8][0]
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
            return decode_ppu_anchor(outputs, TEST_ANCHORS, 640, 640, 0.25, 0.45)

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

        detections = decode_ppu_anchor(outputs, TEST_ANCHORS, 640, 640, 0.25, 0.45)

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
            [records.reshape(1, 40, PPU_RECORD_SIZE)],
            TEST_ANCHORS,
            640,
            640,
            0.25,
            0.45,
        )

        self.assertEqual(detections.shape, (20, 6))

    def test_returns_empty_detections_for_no_output(self):
        self.assertTrue(
            np.all(decode_ppu_anchor([], TEST_ANCHORS, 640, 640, 0.25, 0.45) == 0)
        )

    def test_returns_empty_detections_for_an_unexpected_record_width(self):
        # a non-PPU model would produce a different record width
        outputs = [np.zeros((1, 4, 16), dtype=np.uint8)]

        self.assertTrue(
            np.all(decode_ppu_anchor(outputs, TEST_ANCHORS, 640, 640, 0.25, 0.45) == 0)
        )


class TestDeepxAnchors(unittest.TestCase):
    """The anchor table comes from the model, not from this file. A PPU record
    names its anchor by index alone, and that index means different box sizes
    for different models, so there is nothing safe to default to."""

    def test_parses_a_group_per_stride_keyed_by_stride(self):
        table = parse_anchors("11,17,23,29;41,47,53,59;71,73,79,83")

        self.assertEqual(sorted(table), [8, 16, 32])
        np.testing.assert_array_equal(table[8], [[11, 17], [23, 29]])
        np.testing.assert_array_equal(table[32], [[71, 73], [79, 83]])

    def test_accepts_the_nested_list_a_model_config_declares(self):
        config = DeepxDetectorConfig(
            type="deepx",
            ppu=True,
            model_format=ModelFormatEnum.anchor,
            anchors=[[11, 17, 23, 29], [41, 47, 53, 59], [71, 73, 79, 83]],
        )

        np.testing.assert_array_equal(
            parse_anchors(config.anchors)[8], [[11, 17], [23, 29]]
        )

    def test_accepts_explicit_pairs(self):
        config = DeepxDetectorConfig(
            type="deepx",
            ppu=True,
            model_format=ModelFormatEnum.anchor,
            anchors=[[[11, 17], [23, 29]], [[41, 47], [53, 59]], [[71, 73], [79, 83]]],
        )

        np.testing.assert_array_equal(
            parse_anchors(config.anchors)[8], [[11, 17], [23, 29]]
        )

    def test_anchor_ppu_without_anchors_is_rejected(self):
        """Guessing the table silently rescales every box, so refuse to."""
        with self.assertRaises(ValidationError):
            DeepxDetectorConfig(
                type="deepx", ppu=True, model_format=ModelFormatEnum.anchor
            )

    def test_anchors_on_a_decode_that_ignores_them_is_rejected(self):
        for kwargs in (
            dict(ppu=True, model_format=ModelFormatEnum.anchor_free),
            dict(model_format=ModelFormatEnum.anchor),
            dict(),
        ):
            with self.subTest(**kwargs):
                with self.assertRaises(ValidationError):
                    DeepxDetectorConfig(
                        type="deepx", anchors=TEST_ANCHOR_STRING, **kwargs
                    )

    def test_a_group_per_stride_is_required(self):
        with self.assertRaises(ValidationError):
            DeepxDetectorConfig(
                type="deepx",
                ppu=True,
                model_format=ModelFormatEnum.anchor,
                anchors="11,17;41,47",
            )

    def test_groups_must_hold_equal_length_pairs(self):
        for bad in ("11,17,23;41,47,53;71,73,79", "11,17;41,47,53,59;71,73"):
            with self.subTest(anchors=bad):
                with self.assertRaises(ValidationError):
                    DeepxDetectorConfig(
                        type="deepx",
                        ppu=True,
                        model_format=ModelFormatEnum.anchor,
                        anchors=bad,
                    )

    def test_decode_uses_the_supplied_table(self):
        """Two tables over one record must give two different box sizes."""
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

        narrow = decode_ppu_anchor(
            outputs, parse_anchors("4,4;8,8;16,16"), 640, 640, 0.25, 0.45
        )
        wide = decode_ppu_anchor(
            outputs, parse_anchors("40,40;80,80;160,160"), 640, 640, 0.25, 0.45
        )

        self.assertGreater(wide[0][5] - wide[0][3], narrow[0][5] - narrow[0][3])

    def test_an_out_of_range_index_skips_the_frame(self):
        """Both indices come off the wire, and reading past the table would
        take the detection process down rather than drop one frame."""
        for anchor_idx, layer_idx in ((9, 0), (0, PPU_ANCHOR_LAYERS)):
            with self.subTest(anchor_idx=anchor_idx, layer_idx=layer_idx):
                outputs = [
                    build_ppu_record(
                        box=(0.5, 0.5, 0.5, 0.5),
                        grid_y=10,
                        grid_x=10,
                        anchor_idx=anchor_idx,
                        layer_idx=layer_idx,
                        score=0.9,
                        label=2,
                    ).reshape(1, 1, PPU_RECORD_SIZE)
                ]

                detections = decode_ppu_anchor(
                    outputs, TEST_ANCHORS, 640, 640, 0.25, 0.45
                )

                self.assertTrue(np.all(detections == 0))


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


class TestDeepxDeviceSelection(unittest.TestCase):
    def test_a_pcie_device_string_resolves_to_its_index(self):
        self.assertEqual(resolve_device("PCIe:1"), 1)

    def test_a_bare_index_is_accepted(self):
        self.assertEqual(resolve_device("2"), 2)

    def test_an_empty_device_is_the_first_npu(self):
        self.assertEqual(resolve_device(""), 0)

    def test_a_non_numeric_device_is_rejected(self):
        with self.assertRaises(ValueError):
            resolve_device("PCIe:the-fast-one")

    def test_a_comma_separated_list_is_no_longer_accepted(self):
        with self.assertRaises(ValidationError):
            DeepxDetectorConfig(type="deepx", device="0,1")

    def test_the_old_multi_device_field_is_gone(self):
        self.assertNotIn("device_ids", DeepxDetectorConfig.model_fields)

    def test_the_device_string_lands_on_the_device_field(self):
        # inherited from BaseDetectorConfig; asserted so a rename is caught here
        self.assertEqual(DeepxDetectorConfig.device_spec_field, "device")
        self.assertIn("device", DeepxDetectorConfig.model_fields)


class TestDeepxRuntimeManifest(unittest.TestCase):
    def test_the_detector_declares_a_manifest(self):
        self.assertIs(DeepxDetector.runtime_manifest, DEEPX_MANIFEST)

    def test_one_wheel_per_supported_machine(self):
        machines = sorted(m for a in DEEPX_MANIFEST.artifacts for m in a.machines)
        self.assertEqual(machines, ["aarch64", "x86_64"])

    def test_every_artifact_is_a_pinned_wheel(self):
        for artifact in DEEPX_MANIFEST.artifacts:
            with self.subTest(url=artifact.url):
                self.assertEqual(artifact.kind, ArtifactKind.wheel)
                self.assertEqual(len(artifact.sha256), 64)
                self.assertTrue(artifact.url.endswith(".whl"))

    def test_the_wheels_match_the_container_interpreter(self):
        for artifact in DEEPX_MANIFEST.artifacts:
            with self.subTest(url=artifact.url):
                self.assertIn("cp311", artifact.url)

    def test_every_url_carries_the_pinned_version(self):
        """A PyPI path holds a per-file digest, so a version bump has to rewrite
        the whole URL rather than only the version constant."""
        self.assertEqual(DEEPX_MANIFEST.version, DXRT_VERSION)

        for artifact in DEEPX_MANIFEST.artifacts:
            with self.subTest(url=artifact.url):
                self.assertIn(f"dx_engine-{DXRT_VERSION}-", artifact.url)

    def test_no_library_preloading_is_needed(self):
        # the wheel is auditwheel-repaired and resolves its own libs by RPATH
        self.assertEqual(DEEPX_MANIFEST.preload, ())
        self.assertFalse(DEEPX_MANIFEST.needs_ld_library_path)


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
        anchor = decode_ppu_anchor(outputs, TEST_ANCHORS, 640, 640, 0.25, 0.45)

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


class TestDeepxRawAnchorFreeDecode(unittest.TestCase):
    def build_raw_anchor_free_output(self, rows, num_classes=3, total_rows=10):
        """Build an (1, N, 4+C) tensor -- already row-per-box -- with no
        objectness column, padded with all-zero rows so N comfortably
        outnumbers the channel count (4+C).

        The decoder tells a channel-major export apart from a row-major one
        purely by comparing those two sizes, the same way it would on a real
        grid of thousands of anchors -- and that comparison only comes out
        right when boxes outnumber channels, so a test with too few rows
        would trip the same ambiguity `auto` accepts by design.
        """
        total_rows = max(total_rows, len(rows))
        out = np.zeros((1, total_rows, 4 + num_classes), dtype=np.float32)

        for i, (cx, cy, w, h, label, cls_score) in enumerate(rows):
            out[0, i, 0:4] = [cx, cy, w, h]
            out[0, i, 4 + label] = cls_score

        return [out]

    def test_keeps_a_detection_between_the_deepx_and_frigate_default_thresholds(self):
        """Regression test: post_process_yolo hardcodes a 0.4 score
        threshold, which would silently drop this 0.3-confidence detection
        even though it clears the DEEPX decoder's own 0.25 default."""
        outputs = self.build_raw_anchor_free_output(
            [(320.0, 320.0, 40.0, 80.0, 2, 0.3)]
        )

        detections = decode_raw_anchor_free(outputs, 640, 640, 0.25, 0.45)

        self.assertEqual(detections[0][0], 2)
        self.assertAlmostEqual(detections[0][1], 0.3, places=5)

    def test_drops_detections_below_the_score_threshold(self):
        outputs = self.build_raw_anchor_free_output(
            [(320.0, 320.0, 40.0, 80.0, 2, 0.1)]
        )

        detections = decode_raw_anchor_free(outputs, 640, 640, 0.25, 0.45)

        self.assertTrue(np.all(detections == 0))

    def test_transposes_a_channel_major_output(self):
        """DX-COM may export (4+C, N) instead of (N, 4+C); both must decode
        to the same result."""
        row_major = self.build_raw_anchor_free_output(
            [(320.0, 320.0, 40.0, 80.0, 2, 0.9)]
        )
        channel_major = [np.transpose(row_major[0], (0, 2, 1))]

        row_major_detections = decode_raw_anchor_free(row_major, 640, 640, 0.25, 0.45)
        channel_major_detections = decode_raw_anchor_free(
            channel_major, 640, 640, 0.25, 0.45
        )

        np.testing.assert_array_almost_equal(
            row_major_detections, channel_major_detections
        )

    def test_converts_center_form_to_normalized_corners(self):
        outputs = self.build_raw_anchor_free_output(
            [(320.0, 160.0, 64.0, 32.0, 0, 1.0)]
        )

        detections = decode_raw_anchor_free(outputs, 640, 640, 0.25, 0.45)

        self.assertAlmostEqual(detections[0][2], 144 / 640, places=5)
        self.assertAlmostEqual(detections[0][3], 288 / 640, places=5)
        self.assertAlmostEqual(detections[0][4], 176 / 640, places=5)
        self.assertAlmostEqual(detections[0][5], 352 / 640, places=5)

    def test_returns_empty_detections_for_no_output(self):
        out = np.zeros((1, 0, 84), dtype=np.float32)

        self.assertTrue(
            np.all(decode_raw_anchor_free([out], 640, 640, 0.25, 0.45) == 0)
        )


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
        """Frigate's own model_type default is ssd, which this detector has no
        decoder for, so the detector needs a default of its own."""
        config = DeepxDetectorConfig(type="deepx")

        self.assertIs(config.model_type, DeepxModelTypeEnum.yologeneric)

    def test_ssd_is_not_an_accepted_model_type(self):
        """The ModelZoo's SSD models are Pascal VOC, whose label names none of
        Frigate's COCO-based object config would ever match, so the type is
        rejected at config load rather than decoded into a wrong label map."""
        with self.assertRaises(ValidationError):
            DeepxDetectorConfig(type="deepx", model_type="ssd")

    def test_model_type_values_match_frigate_model_types(self):
        """The detector writes its choice back onto model.model_type, so every
        value has to round-trip through ModelTypeEnum."""
        for value in DeepxModelTypeEnum:
            with self.subTest(value=value):
                self.assertEqual(ModelTypeEnum(value.value).value, value.value)


class TestDeepxIpcEndpoint(unittest.TestCase):
    """dxrtd listens on an abstract and a filesystem socket; only the second
    one is reachable from a container, so the detector names it up front."""

    def _construct(self):
        # dx_engine is not installed in the test environment, and forcing the
        # import to fail keeps this test honest on a machine where it is
        with patch.dict(sys.modules, {"dx_engine": None}):
            with self.assertRaises(ImportError):
                DeepxDetector(DeepxDetectorConfig(type="deepx"))

    def test_the_filesystem_socket_is_named_when_nothing_else_is(self):
        with patch.dict(os.environ):
            os.environ.pop(DXRT_IPC_ENDPOINT_ENV, None)
            self._construct()
            self.assertEqual(os.environ[DXRT_IPC_ENDPOINT_ENV], DXRT_IPC_SOCKET)

    def test_an_operator_supplied_endpoint_is_left_alone(self):
        with patch.dict(os.environ, {DXRT_IPC_ENDPOINT_ENV: "/run/dxrt/custom.sock"}):
            self._construct()
            self.assertEqual(os.environ[DXRT_IPC_ENDPOINT_ENV], "/run/dxrt/custom.sock")


class TestDeepxServiceCheck(unittest.TestCase):
    """DX-RT scans /proc for a dxrtd process to decide the daemon is up, which
    a container cannot satisfy from the host. See satisfy_service_check."""

    def setUp(self):
        deepx = sys.modules["frigate.detectors.plugins.deepx"]
        self.deepx = deepx
        deepx._SERVICE_PLACEHOLDER = None
        self.addCleanup(setattr, deepx, "_SERVICE_PLACEHOLDER", None)

    def test_nothing_is_started_when_a_daemon_is_already_visible(self):
        with patch.object(self.deepx, "service_is_visible", return_value=True):
            with patch.object(self.deepx.subprocess, "Popen") as popen:
                satisfy_service_check("/tmp/dxrt_dynamic_ipc.sock")

        popen.assert_not_called()

    def test_nothing_is_started_when_the_socket_is_absent(self):
        # a genuinely stopped daemon must still report itself
        with patch.object(self.deepx, "service_is_visible", return_value=False):
            with patch.object(self.deepx.subprocess, "Popen") as popen:
                satisfy_service_check("/nonexistent/dxrt.sock")

        popen.assert_not_called()

    def test_a_placeholder_named_dxrtd_is_started_otherwise(self):
        with patch.object(self.deepx, "service_is_visible", return_value=False):
            with patch.object(self.deepx.os.path, "exists", return_value=True):
                with patch.object(self.deepx.subprocess, "Popen") as popen:
                    popen.return_value.poll.return_value = None
                    satisfy_service_check("/tmp/dxrt_dynamic_ipc.sock")

        args, kwargs = popen.call_args
        self.assertEqual(args[0][0], "dxrtd")
        self.assertEqual(kwargs["executable"], "/bin/sleep")

    def test_the_scan_matches_the_runtime_own_check(self):
        # our own cmdline does not name dxrtd, so a bare test run sees none
        self.assertIsInstance(service_is_visible(), bool)
