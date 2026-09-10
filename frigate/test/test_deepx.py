"""Tests for the DEEPX detector."""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

import numpy as np
from pydantic import ValidationError

from frigate.detectors.detector_config import ModelConfig, ModelTypeEnum
from frigate.detectors.plugins.deepx import (
    DEEPX_MANIFEST,
    DXRT_IPC_ENDPOINT_ENV,
    DXRT_IPC_SOCKET,
    DXRT_VERSION,
    PPU_RECORD_SIZE,
    DeepxDetector,
    DeepxDetectorConfig,
    YoloLayout,
    class_count,
    decode_damoyolo_raw,
    decode_ppu,
    decode_raw_anchor,
    decode_raw_nms_in_head,
    infer_yolo_layout,
    resolve_device,
    rows_with_columns,
    validate_damoyolo_outputs,
)
from frigate.util.runtime_deps import ArtifactKind


def model_with_type(model_type) -> ModelConfig:
    """The root model block a device is validated against. model_type lives
    here rather than on the detector, so every check that keys off it has to
    be exercised through a model. The label map is left unset so the test does
    not depend on the image's /labelmap.txt."""
    return ModelConfig(model_type=model_type, labelmap_path=None)


def build_ppu_record(box, score=0.9, label=0, grid=(7, 9, 2, 2)) -> np.ndarray:
    """One fixed-width record as the PPU emits it, in a (1, 1, 32) output."""
    record = np.zeros(PPU_RECORD_SIZE, dtype=np.uint8)
    record[0:16] = np.array(box, dtype=np.float32).view(np.uint8)
    record[16:20] = grid
    record[20:24] = np.array([score], dtype=np.float32).view(np.uint8)
    record[24:28] = np.array([label], dtype=np.uint32).view(np.uint8)
    return record.reshape(1, 1, PPU_RECORD_SIZE)


def build_ppu_records(*records: np.ndarray) -> np.ndarray:
    """Several single records, as build_ppu_record makes them, stacked into
    one (1, N, 32) output."""
    return np.concatenate(records, axis=1)


class TestDeepxPpuDecode(unittest.TestCase):
    def test_reads_anchor_free_box_bytes_as_pixel_geometry(self):
        """The grid columns carry no meaning for an anchor-free head and must
        not influence the result."""
        detections = decode_ppu(
            [build_ppu_record((320.0, 160.0, 64.0, 32.0), label=3)],
            640,
            640,
            0.25,
            0.45,
        )

        self.assertEqual(detections[0][0], 3)
        self.assertAlmostEqual(detections[0][1], 0.9, places=5)
        # x: 320 +/- 32 -> 288..352, y: 160 +/- 16 -> 144..176
        self.assertAlmostEqual(detections[0][2], 144 / 640, places=5)
        self.assertAlmostEqual(detections[0][3], 288 / 640, places=5)
        self.assertAlmostEqual(detections[0][4], 176 / 640, places=5)
        self.assertAlmostEqual(detections[0][5], 352 / 640, places=5)

    def test_reads_anchor_based_box_bytes_through_the_grid_and_anchors(self):
        """An anchor-based head leaves ratios in the box fields, which the
        grid columns and the anchor table turn back into pixels."""
        detections = decode_ppu(
            [build_ppu_record((0.6, 0.4, 0.3, 0.7), label=5)], 640, 640, 0.25, 0.45
        )

        # layer 2 is stride 32 and box 2 is the 373x326 anchor, so the centre
        # is (9.7, 7.3) cells out and the box is 134.28 x 638.96
        self.assertEqual(detections[0][0], 5)
        self.assertAlmostEqual(detections[0][2], 0.0, places=5)
        self.assertAlmostEqual(detections[0][3], 0.380094, places=5)
        self.assertAlmostEqual(detections[0][4], 0.864187, places=5)
        self.assertAlmostEqual(detections[0][5], 0.589906, places=5)

    def test_reads_anchor_free_grid_regression_bytes_through_the_grid_and_stride(
        self,
    ):
        """YOLOX's classic anchor-free head leaves its box regression
        relative to the grid cell it was predicted at, unlike anchor-based
        heads, which the PPU decodes to pixels outright; more than
        one layer present in the frame is what tells the two apart. A
        second, low-scoring record on another layer is what proves that."""
        detections = decode_ppu(
            [
                build_ppu_records(
                    build_ppu_record((1.2, 0.5, 1.0, 0.5), grid=(9, 10, 0, 2), label=7),
                    build_ppu_record(
                        (0.2, 0.3, 0.1, 0.4), grid=(3, 4, 0, 0), score=0.1
                    ),
                )
            ],
            640,
            640,
            0.25,
            0.45,
        )

        # layer 2 of 3 is stride 32: centre (10+1.2, 9+0.5)*32 = (358.4, 304),
        # size exp(1.0)*32 x exp(0.5)*32 = 86.985 x 52.759
        self.assertEqual(detections[0][0], 7)
        self.assertAlmostEqual(detections[0][1], 0.9, places=5)
        self.assertAlmostEqual(detections[0][2], 0.433782, places=5)
        self.assertAlmostEqual(detections[0][3], 0.492043, places=5)
        self.assertAlmostEqual(detections[0][4], 0.516218, places=5)
        self.assertAlmostEqual(detections[0][5], 0.627957, places=5)

    def test_a_single_layer_anchor_free_frame_still_reads_as_pixel_geometry(self):
        """A frame that only ever shows one layer cannot prove the grid and
        layer fields are meaningful, so it falls back to the pixel-geometry
        reading, same as an actual pixel-decoded head would need."""
        detections = decode_ppu(
            [build_ppu_record((320.0, 160.0, 64.0, 32.0), grid=(7, 9, 0, 1))],
            640,
            640,
            0.25,
            0.45,
        )

        self.assertAlmostEqual(detections[0][2], 144 / 640, places=5)
        self.assertAlmostEqual(detections[0][3], 288 / 640, places=5)

    def test_drops_records_the_anchor_table_cannot_place(self):
        """A record naming a level or box the table does not carry is left
        out rather than decoded against the wrong anchor."""
        detections = decode_ppu(
            [build_ppu_record((0.6, 0.4, 0.3, 0.7), grid=(7, 9, 2, 5))],
            640,
            640,
            0.25,
            0.45,
        )

        self.assertTrue(np.all(detections == 0))

    def test_a_two_scale_head_reads_the_tiny_anchor_table_and_stride(self):
        """A head with only two scales numbers its layers 0
        and 1, but layer 0 is stride 16 there, not stride 8 as it would be
        in a three-scale head; scale_count picks the matching table."""
        detections = decode_ppu(
            [build_ppu_record((0.6, 0.4, 0.3, 0.7), grid=(7, 9, 1, 0))],
            640,
            640,
            0.25,
            0.45,
            scale_count=2,
        )

        # layer 0 of 2 is stride 16 and box 1 is the 37x58 anchor, so the
        # centre is (9.7, 7.3) cells out and the box is 13.32 x 113.68
        self.assertAlmostEqual(detections[0][2], 0.093688, places=5)
        self.assertAlmostEqual(detections[0][3], 0.232094, places=5)
        self.assertAlmostEqual(detections[0][4], 0.271313, places=5)
        self.assertAlmostEqual(detections[0][5], 0.252906, places=5)

    def test_scale_count_defaults_to_the_three_scale_table(self):
        """With no scale_count given, a frame that only ever shows layer 0
        cannot tell a two-scale head from the first layer of a three-scale
        one, so it falls back to the three-scale table."""
        detections = decode_ppu(
            [build_ppu_record((0.6, 0.4, 0.3, 0.7), grid=(7, 9, 1, 0))],
            640,
            640,
            0.25,
            0.45,
        )

        # layer 0 of 3 is stride 8 and box 1 is the 16x30 anchor, so the
        # centre is (9.7, 7.3) cells out and the box is 5.76 x 58.8
        self.assertAlmostEqual(detections[0][2], 0.045313, places=5)
        self.assertAlmostEqual(detections[0][3], 0.116750, places=5)
        self.assertAlmostEqual(detections[0][4], 0.137188, places=5)
        self.assertAlmostEqual(detections[0][5], 0.125750, places=5)

    def test_anchor_based_records_with_an_unsupported_scale_count_are_dropped(self):
        """A scale_count with no anchor table must drop the records rather
        than guess against the wrong table."""
        detections = decode_ppu(
            [build_ppu_record((0.6, 0.4, 0.3, 0.7))],
            640,
            640,
            0.25,
            0.45,
            scale_count=4,
        )

        self.assertTrue(np.all(detections == 0))

    def test_needs_grid_decode_true_is_kept_for_a_single_layer_frame(self):
        """A caller that already proved the head needs grid decoding must
        not have that overridden by a frame that, alone, looks ambiguous."""
        detections = decode_ppu(
            [build_ppu_record((1.2, 0.5, 1.0, 0.5), grid=(9, 10, 0, 2))],
            640,
            640,
            0.25,
            0.45,
            needs_grid_decode=True,
        )

        # layer 2 of 3 is stride 32: centre (10+1.2, 9+0.5)*32 = (358.4, 304),
        # size exp(1.0)*32 x exp(0.5)*32 = 86.985 x 52.759
        self.assertAlmostEqual(detections[0][3], 0.492043, places=5)

    def test_drops_records_below_the_score_threshold(self):
        detections = decode_ppu(
            [build_ppu_record((320.0, 160.0, 64.0, 32.0), score=0.1)],
            640,
            640,
            0.25,
            0.45,
        )

        self.assertTrue(np.all(detections == 0))

    def test_returns_empty_detections_for_no_records(self):
        # a frame with no surviving candidate comes back with an empty
        # leading axis, as seen on hardware
        for shape in ((1, 0, PPU_RECORD_SIZE), (0, PPU_RECORD_SIZE), (0,)):
            with self.subTest(shape=shape):
                out = np.zeros(shape, dtype=np.uint8)

                self.assertTrue(np.all(decode_ppu([out], 640, 640, 0.25, 0.45) == 0))

    def test_returns_empty_detections_for_an_unexpected_record_width(self):
        out = np.zeros((1, 3, 16), dtype=np.uint8)

        self.assertTrue(np.all(decode_ppu([out], 640, 640, 0.25, 0.45) == 0))


def layout_of(shapes, num_classes, ppu=False, dynamic_output=False) -> YoloLayout:
    return infer_yolo_layout(shapes, num_classes, ppu, dynamic_output).layout


class TestDeepxLayoutInference(unittest.TestCase):
    """The output layout is read off the model rather than configured, so
    every head DX-COM can compile has to be told apart from the others."""

    def test_ppu_wins_over_every_shape(self):
        self.assertIs(layout_of([(8400,)], 80, ppu=True), YoloLayout.ppu)

    def test_an_anchor_free_head_has_four_columns_ahead_of_the_classes(self):
        for shape in ((1, 84, 8400), (1, 8400, 84)):
            with self.subTest(shape=shape):
                output = infer_yolo_layout([shape], 80, False, False)

                self.assertIs(output.layout, YoloLayout.anchor_free)
                self.assertEqual(output.columns, 84)

    def test_an_anchor_based_head_has_an_objectness_column(self):
        for shape in ((1, 25200, 85), (1, 85, 25200)):
            with self.subTest(shape=shape):
                output = infer_yolo_layout([shape], 80, False, False)

                self.assertIs(output.layout, YoloLayout.anchor)
                self.assertEqual(output.columns, 85)

    def test_a_six_column_or_dynamic_output_ran_nms_in_the_head(self):
        self.assertIs(layout_of([(1, 300, 6)], 80), YoloLayout.nms_in_head)
        self.assertIs(
            layout_of([(1, -1, 6)], 80, dynamic_output=True), YoloLayout.nms_in_head
        )

    def test_the_label_map_settles_anchor_against_anchor_free(self):
        # 85 columns is anchor-free with 81 classes and anchor-based with 80;
        # only the label map can tell
        shape = [(1, 8400, 85)]
        self.assertIs(layout_of(shape, 81), YoloLayout.anchor_free)
        self.assertIs(layout_of(shape, 80), YoloLayout.anchor)

    def test_six_columns_on_a_small_model_is_told_apart_by_row_count(self):
        """One class puts an anchor-based head at 6 columns and two classes
        put an anchor-free one there, both the width of an nms-in-head
        output. A raw head has thousands of rows, NMS in the head a few
        hundred."""
        self.assertIs(layout_of([(1, 25200, 6)], 1), YoloLayout.anchor)
        self.assertIs(layout_of([(1, 8400, 6)], 2), YoloLayout.anchor_free)
        self.assertIs(layout_of([(1, 300, 6)], 1), YoloLayout.nms_in_head)
        self.assertIs(layout_of([(1, 300, 6)], 2), YoloLayout.nms_in_head)

    def test_a_shape_matching_two_layouts_on_different_axes_is_refused(self):
        # 84 rows by 6 columns fits anchor-free transposed and nms-in-head
        with self.assertRaisesRegex(ValueError, "fits two layouts"):
            layout_of([(1, 84, 6)], 80)

    def test_a_small_label_map_still_reads_an_unambiguous_shape(self):
        # 2 classes: 7 columns is only anchor-based
        self.assertIs(layout_of([(1, 8400, 7)], 2), YoloLayout.anchor)

    def test_a_mismatched_label_map_is_reported(self):
        # the image's default 91-class label map against an 80-class model
        with self.assertRaisesRegex(ValueError, "labelmap_path"):
            layout_of([(1, 8400, 84)], 91)

    def test_a_missing_output_is_reported(self):
        with self.assertRaisesRegex(ValueError, "no output tensor"):
            layout_of([], 80)


class TestDeepxMultipartInference(unittest.TestCase):
    """The shared multipart decoder reads one exact layout, so anything else
    with several outputs has to fail at load rather than on the first frame."""

    def test_three_nchw_maps_with_255_channels_are_feature_maps(self):
        shapes = [(1, 255, 80, 80), (1, 255, 40, 40), (1, 255, 20, 20)]

        self.assertIs(layout_of(shapes, 80), YoloLayout.multipart)

    def test_nhwc_maps_are_refused(self):
        shapes = [(1, 80, 80, 255), (1, 40, 40, 255), (1, 20, 20, 255)]

        with self.assertRaisesRegex(ValueError, "255 channels"):
            layout_of(shapes, 80)

    def test_a_damoyolo_pair_under_yolo_generic_is_pointed_at_damo_yolo(self):
        with self.assertRaisesRegex(ValueError, "damo-yolo"):
            layout_of([(1, 8400, 80), (1, 8400, 4)], 80)

    def test_a_non_coco_class_count_is_refused(self):
        shapes = [(1, 24, 80, 80), (1, 24, 40, 40), (1, 24, 20, 20)]

        with self.assertRaisesRegex(ValueError, "80-class"):
            layout_of(shapes, 3)


class TestDeepxDamoyoloValidation(unittest.TestCase):
    def test_the_modelzoo_pair_passes_in_either_order(self):
        validate_damoyolo_outputs([(1, 8400, 80), (1, 8400, 4)], 80)
        validate_damoyolo_outputs([(1, 8400, 4), (1, 8400, 80)], 80)

    def test_a_wrong_class_count_names_the_label_map(self):
        with self.assertRaisesRegex(ValueError, "labelmap_path"):
            validate_damoyolo_outputs([(1, 8400, 80), (1, 8400, 4)], 91)

    def test_a_single_yolo_tensor_names_yolo_generic(self):
        with self.assertRaisesRegex(ValueError, "yolo-generic"):
            validate_damoyolo_outputs([(1, 84, 8400)], 80)

    def test_mismatched_row_counts_are_refused(self):
        with self.assertRaises(ValueError):
            validate_damoyolo_outputs([(1, 8400, 80), (1, 8000, 4)], 80)


class TestDeepxClassCount(unittest.TestCase):
    def test_the_highest_id_bounds_the_count(self):
        self.assertEqual(class_count({0: "person", 79: "toothbrush"}), 80)

    def test_an_empty_label_map_is_reported(self):
        with self.assertRaisesRegex(ValueError, "labelmap_path"):
            class_count({})


class TestDeepxRowOrientation(unittest.TestCase):
    def test_a_channel_major_tensor_is_transposed_by_its_column_count(self):
        tensor = np.arange(2 * 85).reshape(1, 85, 2).astype(np.float32)

        rows = rows_with_columns(tensor, 85)

        self.assertEqual(rows.shape, (2, 85))
        np.testing.assert_array_equal(rows[1], tensor[0, :, 1])

    def test_a_row_major_tensor_is_left_alone(self):
        tensor = np.zeros((1, 300, 6), np.float32)

        self.assertEqual(rows_with_columns(tensor, 6).shape, (300, 6))

    def test_an_empty_dynamic_output_keeps_its_columns(self):
        self.assertEqual(rows_with_columns(np.zeros((1, 0, 6)), 6).shape, (0, 6))


class TestDeepxRawAnchorDecode(unittest.TestCase):
    def test_a_channel_major_export_is_read_by_column_count(self):
        """A (1, 85, N) export decodes the same as (1, N, 85) once the
        decoder is told the row width, instead of reading N-wide rows."""
        rows = np.zeros((2, 85), np.float32)
        rows[0, :5] = [320.0, 160.0, 64.0, 32.0, 1.0]
        rows[0, 5 + 3] = 0.9
        detections = decode_raw_anchor(
            [rows.T[np.newaxis]], 640, 640, 0.25, 0.45, columns=85
        )

        self.assertEqual(detections[0][0], 3)
        self.assertAlmostEqual(detections[0][3], 288 / 640, places=5)

    def test_at_most_twenty_detections_are_returned(self):
        # 25 well separated confident boxes, all of which survive NMS
        rows = np.zeros((25, 85), np.float32)
        for i in range(25):
            rows[i, :5] = [20.0 + 24 * i, 320.0, 16.0, 16.0, 1.0]
            rows[i, 5 + (i % 80)] = 0.9

        detections = decode_raw_anchor([rows[np.newaxis]], 640, 640, 0.25, 0.45)

        self.assertEqual(detections.shape, (20, 6))
        self.assertEqual(int((detections[:, 1] > 0).sum()), 20)

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


class TestDeepxDamoyoloDecode(unittest.TestCase):
    """DX-COM emits (1, N, C) sigmoid scores and (1, N, 4) pixel corners, as
    the compiled ModelZoo models report."""

    def build_output(self, rows, num_classes=80, boxes_first=False):
        scores = np.zeros((1, len(rows), num_classes), dtype=np.float32)
        boxes = np.zeros((1, len(rows), 4), dtype=np.float32)

        for i, (x_min, y_min, x_max, y_max, label, score) in enumerate(rows):
            boxes[0, i] = [x_min, y_min, x_max, y_max]
            scores[0, i, label] = score

        return [boxes, scores] if boxes_first else [scores, boxes]

    def test_decodes_a_detection_in_either_output_order(self):
        rows = [(288.0, 144.0, 352.0, 176.0, 3, 0.9)]

        for boxes_first in (False, True):
            with self.subTest(boxes_first=boxes_first):
                detections = decode_damoyolo_raw(
                    self.build_output(rows, boxes_first=boxes_first),
                    640,
                    640,
                    0.25,
                    0.45,
                )

                self.assertEqual(detections[0][0], 3)
                self.assertAlmostEqual(detections[0][1], 0.9, places=5)
                self.assertAlmostEqual(detections[0][2], 144 / 640, places=5)
                self.assertAlmostEqual(detections[0][3], 288 / 640, places=5)
                self.assertAlmostEqual(detections[0][4], 176 / 640, places=5)
                self.assertAlmostEqual(detections[0][5], 352 / 640, places=5)

    def test_clips_boxes_that_run_off_the_frame(self):
        # DX-COM's decoded corners can fall outside the input
        detections = decode_damoyolo_raw(
            self.build_output([(-40.0, 10.0, 700.0, 100.0, 0, 0.9)]),
            640,
            640,
            0.25,
            0.45,
        )

        self.assertEqual(detections[0][3], 0.0)
        self.assertEqual(detections[0][5], 1.0)

    def test_returns_empty_detections_below_score_threshold(self):
        detections = decode_damoyolo_raw(
            self.build_output([(288.0, 144.0, 352.0, 176.0, 3, 0.1)]),
            640,
            640,
            0.25,
            0.45,
        )

        self.assertTrue(np.all(detections == 0))

    def test_a_box_class_count_mismatch_is_reported_not_read_as_empty(self):
        """A structural mismatch stays wrong on every later frame, so it comes
        back as None and the caller reports it, rather than looking like a
        frame in which nothing cleared the threshold."""
        scores = np.zeros((1, 5, 80), dtype=np.float32)
        boxes = np.zeros((1, 4, 4), dtype=np.float32)

        self.assertIsNone(decode_damoyolo_raw([scores, boxes], 640, 640, 0.25, 0.45))

    def test_a_wrong_output_count_is_reported_not_read_as_empty(self):
        out = np.zeros((1, 8400, 84), dtype=np.float32)

        self.assertIsNone(decode_damoyolo_raw([out], 640, 640, 0.25, 0.45))


class TestDeepxCompiledModelShapes(unittest.TestCase):
    """The output shapes DX-RT 3.4 reports for the compiled 640x640, 80-class
    models in the DEEPX ModelZoo, each pinned to the decoder it has to land
    on. Named by the head that produced them, since every model compiled from
    the same head reports the same shape and the decoder only sees the shape.
    """

    def test_modelzoo_shapes(self):
        cases = {
            "anchor-based, three scales flattened into one tensor": (
                [(1, 25200, 85)],
                YoloLayout.anchor,
            ),
            "anchor-free, channel-major, no objectness column": (
                [(1, 84, 8400)],
                YoloLayout.anchor_free,
            ),
            "NMS in the head, a fixed run of corner records": (
                [(1, 300, 6)],
                YoloLayout.nms_in_head,
            ),
        }

        for head, (shapes, layout) in cases.items():
            with self.subTest(head=head):
                self.assertIs(layout_of(shapes, 80), layout)


class TestDeepxModelType(unittest.TestCase):
    def test_a_model_type_with_no_decoder_is_rejected(self):
        """Frigate defaults model_type to ssd, and every unsupported type
        would otherwise be decoded as YOLO and return nonsense rather than
        an error."""
        for model_type in (ModelTypeEnum.ssd, ModelTypeEnum.dfine):
            with (
                self.subTest(model_type=model_type),
                self.assertRaises(ValidationError),
            ):
                DeepxDetectorConfig(type="deepx", model=model_with_type(model_type))

    def test_supported_model_types_are_accepted(self):
        for model_type in (ModelTypeEnum.yologeneric, ModelTypeEnum.damoyolo):
            with self.subTest(model_type=model_type):
                config = DeepxDetectorConfig(
                    type="deepx", model=model_with_type(model_type)
                )

                self.assertEqual(config.model.model_type, model_type)

    def test_an_unresolved_model_defers_the_check(self):
        """A device string is validated on its own before any model is
        attached, so an absent model must not fail."""
        DeepxDetectorConfig(type="deepx")


class TestDeepxIpcEndpoint(unittest.TestCase):
    """dxrtd listens on an abstract and a filesystem socket; only the second
    one is reachable from a container, so the detector names it up front."""

    def _construct(self):
        # dx_engine is not installed in the test environment, and forcing the
        # import to fail keeps this test honest on a machine where it is
        with (
            patch.dict(sys.modules, {"dx_engine": None}),
            self.assertRaises(ImportError),
        ):
            DeepxDetector(DeepxDetectorConfig(type="deepx"))

    def test_the_filesystem_socket_is_named_when_nothing_else_is(self):
        with patch.dict(os.environ):
            os.environ.pop(DXRT_IPC_ENDPOINT_ENV, None)
            self._construct()
            self.assertEqual(os.environ[DXRT_IPC_ENDPOINT_ENV], DXRT_IPC_SOCKET)

    def test_a_blank_endpoint_counts_as_unset(self):
        # an empty variable would otherwise be handed to DX-RT as the path
        with patch.dict(os.environ, {DXRT_IPC_ENDPOINT_ENV: ""}):
            self._construct()
            self.assertEqual(os.environ[DXRT_IPC_ENDPOINT_ENV], DXRT_IPC_SOCKET)

    def test_an_abstract_endpoint_has_no_file_to_check(self):
        with (
            patch.dict(os.environ, {DXRT_IPC_ENDPOINT_ENV: "@dxrt_dynamic_ipc.sock"}),
            self.assertNoLogs("frigate.detectors.plugins.deepx", level="WARNING"),
        ):
            self._construct()

    def test_an_operator_supplied_endpoint_is_left_alone(self):
        with patch.dict(os.environ, {DXRT_IPC_ENDPOINT_ENV: "/run/dxrt/custom.sock"}):
            self._construct()
            self.assertEqual(os.environ[DXRT_IPC_ENDPOINT_ENV], "/run/dxrt/custom.sock")

    def test_a_missing_socket_is_named_before_the_runtime_buries_it(self):
        """DX-RT reports an absent socket as a bare connect error several
        layers down, with nothing saying which path it tried."""
        with (
            patch.dict(os.environ, {DXRT_IPC_ENDPOINT_ENV: "/run/dxrt/absent.sock"}),
            self.assertLogs("frigate.detectors.plugins.deepx", level="WARNING") as logs,
        ):
            self._construct()

        self.assertTrue(
            any("/run/dxrt/absent.sock" in r.getMessage() for r in logs.records)
        )

    def test_the_socket_lives_in_a_mountable_directory(self):
        # a single socket file bind-mounted on its own pins the inode dxrtd
        # had at container start, so the directory has to be what is mounted
        self.assertEqual(os.path.dirname(DXRT_IPC_SOCKET), "/run/dxrt")


class TestDeepxServiceCheck(unittest.TestCase):
    """DX-RT scans /proc for a dxrtd process to decide the daemon is up, which
    a container cannot satisfy from the host. The runtime's own SERVICE toggle
    turns that scan off, and the IPC client keeps using the socket."""

    def test_the_process_scan_is_disabled_before_the_model_is_loaded(self):
        dx_engine = MagicMock()
        dx_engine.Configuration.ITEM.SERVICE = object()
        order = []
        dx_engine.Configuration.return_value.set_enable.side_effect = lambda *a: (
            order.append("set_enable")
        )
        session = MagicMock()
        session.get_output_tensors_info.return_value = [
            {"shape": [1, 8400, 80]},
            {"shape": [1, 8400, 4]},
        ]
        session.is_ppu.return_value = False

        def engine(*args):
            order.append("engine")
            return session

        dx_engine.InferenceEngine.side_effect = engine

        config = DeepxDetectorConfig(
            type="deepx",
            model=ModelConfig(
                model_type=ModelTypeEnum.damoyolo,
                labelmap_path=None,
                labelmap={79: "toothbrush"},
            ),
        )
        config.model.path = "/nonexistent/model.dxnn"

        with (
            patch.dict(sys.modules, {"dx_engine": dx_engine}),
            patch.object(DeepxDetector, "activate_dependencies"),
            patch("os.path.isfile", return_value=True),
        ):
            DeepxDetector(config)

        dx_engine.Configuration.return_value.set_enable.assert_called_once_with(
            dx_engine.Configuration.ITEM.SERVICE, False
        )
        self.assertEqual(order, ["set_enable", "engine"])


class TestDeepxDetectorLayout(unittest.TestCase):
    """The detector asks the runtime about the loaded model and keeps the
    answer; the per-frame decode only dispatches on it."""

    def _detector(self, model_type, outputs_info, ppu=False, dynamic=False):
        dx_engine = MagicMock()
        dx_engine.Configuration.ITEM.SERVICE = object()
        session = dx_engine.InferenceEngine.return_value
        session.get_output_tensors_info.return_value = outputs_info
        session.is_ppu.return_value = ppu
        session.has_dynamic_output.return_value = dynamic

        config = DeepxDetectorConfig(
            type="deepx",
            model=ModelConfig(
                model_type=model_type, labelmap_path=None, labelmap={79: "toothbrush"}
            ),
        )
        config.model.path = "/nonexistent/model.dxnn"

        with (
            patch.dict(sys.modules, {"dx_engine": dx_engine}),
            patch.object(DeepxDetector, "activate_dependencies"),
            patch("os.path.isfile", return_value=True),
        ):
            return DeepxDetector(config), dx_engine

    def test_the_layout_is_read_from_the_model_at_load(self):
        detector, _ = self._detector(
            ModelTypeEnum.yologeneric, [{"shape": [1, 84, 8400]}]
        )

        self.assertIs(detector.output.layout, YoloLayout.anchor_free)
        self.assertEqual(detector.output.columns, 84)

    def test_a_ppu_model_is_recognized_by_the_runtime_flag(self):
        # the shape DX-RT 3.4 reports for the compiled PPU model
        detector, _ = self._detector(
            ModelTypeEnum.yologeneric, [{"shape": [8400]}], ppu=True
        )

        self.assertIs(detector.output.layout, YoloLayout.ppu)

    def test_an_anchor_based_ppu_model_decodes(self):
        detector, _ = self._detector(
            ModelTypeEnum.yologeneric, [{"shape": [8400]}], ppu=True
        )
        detector.session.run.return_value = [
            build_ppu_record((0.6, 0.4, 0.3, 0.7), label=5)
        ]
        detector.width, detector.height = 640, 640

        detections = detector.detect_raw(np.zeros((1, 640, 640, 3), np.uint8))

        self.assertEqual(detections[0][0], 5)
        self.assertAlmostEqual(detections[0][3], 0.380094, places=5)
        self.assertAlmostEqual(detections[0][5], 0.589906, places=5)

    def test_anchor_free_is_kept_once_proven(self):
        """A later frame whose boxes all happen to fall within 1.0 must not
        re-open the question and start dropping detections."""
        detector, _ = self._detector(
            ModelTypeEnum.yologeneric, [{"shape": [8400]}], ppu=True
        )
        detector.width, detector.height = 640, 640
        detector.session.run.return_value = [
            build_ppu_record((320.0, 160.0, 64.0, 32.0), label=3)
        ]

        first = detector.detect_raw(np.zeros((1, 640, 640, 3), np.uint8))
        self.assertTrue(detector.ppu_anchor_free)

        detector.session.run.return_value = [build_ppu_record((0.6, 0.4, 0.3, 0.7))]
        second = detector.detect_raw(np.zeros((1, 640, 640, 3), np.uint8))

        self.assertEqual(first[0][0], 3)
        # still read as pixels, which is a sub-pixel box in the corner
        self.assertAlmostEqual(second[0][1], 0.9, places=5)

    def test_an_anchor_based_verdict_is_not_kept(self):
        """An anchor-free model whose first record is a sub-pixel box in the
        corner looks anchor-based for that frame only; the next normal box
        decodes and settles the head."""
        detector, _ = self._detector(
            ModelTypeEnum.yologeneric, [{"shape": [8400]}], ppu=True
        )
        detector.width, detector.height = 640, 640

        detector.session.run.return_value = [build_ppu_record((0.6, 0.4, 0.3, 0.7))]
        first = detector.detect_raw(np.zeros((1, 640, 640, 3), np.uint8))
        self.assertAlmostEqual(first[0][3], 0.380094, places=5)
        self.assertFalse(detector.ppu_anchor_free)

        detector.session.run.return_value = [
            build_ppu_record((320.0, 160.0, 64.0, 32.0), label=3)
        ]
        second = detector.detect_raw(np.zeros((1, 640, 640, 3), np.uint8))

        self.assertEqual(second[0][0], 3)
        self.assertTrue(detector.ppu_anchor_free)

    def test_ppu_scale_count_is_kept_once_a_coarser_layer_is_seen(self):
        """A frame that only shows layer 0 cannot tell a two-scale head from
        a three-scale one and falls back to three; once a frame proves
        layer 1 exists, that head has only two scales and every later
        layer-0-only frame must use the two-scale table instead."""
        detector, _ = self._detector(
            ModelTypeEnum.yologeneric, [{"shape": [8400]}], ppu=True
        )
        detector.width, detector.height = 640, 640

        detector.session.run.return_value = [
            build_ppu_record((0.6, 0.4, 0.3, 0.7), grid=(7, 9, 1, 0))
        ]
        first = detector.detect_raw(np.zeros((1, 640, 640, 3), np.uint8))
        # layer 0 read against the three-scale default: stride 8, anchor 16x30
        self.assertAlmostEqual(first[0][3], 0.116750, places=5)

        detector.session.run.return_value = [
            build_ppu_record((0.5, 0.5, 0.4, 0.4), grid=(3, 4, 0, 1))
        ]
        second = detector.detect_raw(np.zeros((1, 640, 640, 3), np.uint8))
        # layer 1 of 2 is stride 32 and box 0 is the 81x82 anchor
        self.assertAlmostEqual(second[0][3], 0.1845, places=5)
        self.assertEqual(detector.ppu_scale_count, 2)

        detector.session.run.return_value = [
            build_ppu_record((0.6, 0.4, 0.3, 0.7), grid=(7, 9, 1, 0))
        ]
        third = detector.detect_raw(np.zeros((1, 640, 640, 3), np.uint8))
        # the same layer-0 record as the first frame, now read against the
        # two-scale table proven by the second frame: stride 16, anchor 37x58
        self.assertAlmostEqual(third[0][3], 0.232094, places=5)

    def test_needs_grid_decode_is_kept_once_proven(self):
        """A frame proving a YOLOX-style grid-relative head must not fall
        back to reading raw pixels just because a later frame holds only
        one detection at one layer."""
        detector, _ = self._detector(
            ModelTypeEnum.yologeneric, [{"shape": [8400]}], ppu=True
        )
        detector.width, detector.height = 640, 640

        detector.session.run.return_value = [
            build_ppu_records(
                build_ppu_record((1.2, 0.5, 1.0, 0.5), grid=(9, 10, 0, 2), label=7),
                build_ppu_record((0.2, 0.3, 0.1, 0.4), grid=(3, 4, 0, 0), score=0.1),
            )
        ]
        first = detector.detect_raw(np.zeros((1, 640, 640, 3), np.uint8))
        self.assertAlmostEqual(first[0][3], 0.492043, places=5)
        self.assertTrue(detector.ppu_needs_grid_decode)

        detector.session.run.return_value = [
            build_ppu_record((1.2, 0.5, 1.0, 0.5), grid=(9, 10, 0, 2), label=7)
        ]
        second = detector.detect_raw(np.zeros((1, 640, 640, 3), np.uint8))

        # still decoded through the grid and stride, not as raw pixels
        self.assertAlmostEqual(second[0][3], 0.492043, places=5)

    def test_an_unsupported_ppu_scale_count_is_reported_once(self):
        """An anchor-based head with a scale count Frigate has no anchor
        table for logs once and drops the frame instead of guessing."""
        detector, _ = self._detector(
            ModelTypeEnum.yologeneric, [{"shape": [8400]}], ppu=True
        )
        detector.width, detector.height = 640, 640
        detector.session.run.return_value = [
            build_ppu_record((0.6, 0.4, 0.3, 0.7), grid=(7, 9, 2, 3))
        ]

        with self.assertLogs("frigate.detectors.plugins.deepx", level="ERROR") as logs:
            first = detector.detect_raw(np.zeros((1, 640, 640, 3), np.uint8))
            second = detector.detect_raw(np.zeros((1, 640, 640, 3), np.uint8))

        self.assertTrue(np.all(first == 0) and np.all(second == 0))
        self.assertEqual(len([r for r in logs.records if r.levelname == "ERROR"]), 1)

    def test_an_empty_or_all_zero_ppu_frame_proves_nothing(self):
        """Only a box value above 1 (anchor-free) or a frame of values
        strictly inside 0..1 (anchor-based) is evidence; an empty frame or a
        degenerate all-zero record is neither."""
        detector, _ = self._detector(
            ModelTypeEnum.yologeneric, [{"shape": [8400]}], ppu=True
        )
        detector.width, detector.height = 640, 640

        for frame in (
            np.zeros((1, 0, PPU_RECORD_SIZE), np.uint8),
            build_ppu_record((0.0, 0.0, 0.0, 0.0)),
        ):
            detector.session.run.return_value = [frame]
            detections = detector.detect_raw(np.zeros((1, 640, 640, 3), np.uint8))

            self.assertTrue(np.all(detections == 0))
            self.assertFalse(detector.ppu_anchor_free)

    def test_damoyolo_is_checked_against_the_model_at_load(self):
        """A YOLO model or a wrong label map under damo-yolo fails at load
        with the reason, rather than returning nothing on every frame."""
        with self.assertRaisesRegex(ValueError, "yolo-generic"):
            self._detector(ModelTypeEnum.damoyolo, [{"shape": [1, 84, 8400]}])

        with self.assertRaisesRegex(ValueError, "PPU"):
            self._detector(
                ModelTypeEnum.damoyolo,
                [{"shape": [1, 8400, 80]}, {"shape": [1, 8400, 4]}],
                ppu=True,
            )

    def test_damoyolo_frames_that_lose_the_expected_pair_are_reported_once(self):
        """The load-time check passed; a frame that still does not carry
        the pair says so once rather than only under debug logging."""
        detector, _ = self._detector(
            ModelTypeEnum.damoyolo, [{"shape": [1, 8400, 80]}, {"shape": [1, 8400, 4]}]
        )
        detector.width, detector.height = 640, 640
        detector.session.run.return_value = [np.zeros((1, 8400, 84), dtype=np.float32)]

        with self.assertLogs("frigate.detectors.plugins.deepx", level="ERROR") as logs:
            first = detector.detect_raw(np.zeros((1, 640, 640, 3), np.uint8))
            second = detector.detect_raw(np.zeros((1, 640, 640, 3), np.uint8))

        self.assertTrue(np.all(first == 0) and np.all(second == 0))
        self.assertEqual(len([r for r in logs.records if r.levelname == "ERROR"]), 1)

    def test_damoyolo_needs_no_layout(self):
        detector, _ = self._detector(
            ModelTypeEnum.damoyolo,
            [{"shape": [1, 8400, 80]}, {"shape": [1, 8400, 4]}],
        )

        self.assertIsNone(detector.output)

    def test_an_empty_label_map_fails_at_load_with_the_deepx_context(self):
        dx_engine = MagicMock()
        dx_engine.Configuration.ITEM.SERVICE = object()
        dx_engine.InferenceEngine.return_value.get_output_tensors_info.return_value = [
            {"shape": [1, 84, 8400]}
        ]
        config = DeepxDetectorConfig(
            type="deepx",
            model=ModelConfig(model_type=ModelTypeEnum.yologeneric, labelmap_path=None),
        )
        config.model.path = "/nonexistent/model.dxnn"

        with (
            patch.dict(sys.modules, {"dx_engine": dx_engine}),
            patch.object(DeepxDetector, "activate_dependencies"),
            patch("os.path.isfile", return_value=True),
            self.assertRaisesRegex(
                ValueError, "Cannot decode DEEPX model.*labelmap_path"
            ),
        ):
            DeepxDetector(config)

    def test_the_tensor_layout_is_logged_before_the_first_decode(self):
        """A decode that raises must still leave the runtime shapes in the
        log, which is what tells a wrong layout guess apart afterwards."""
        detector, _ = self._detector(
            ModelTypeEnum.yologeneric, [{"shape": [1, 84, 8400]}]
        )
        detector.width, detector.height = 640, 640
        detector.session.run.return_value = [np.zeros((1, 84, 8400), np.float32)]

        with (
            patch.object(detector, "decode", side_effect=RuntimeError("boom")),
            self.assertLogs("frigate.detectors.plugins.deepx", level="INFO") as logs,
            self.assertRaises(RuntimeError),
        ):
            detector.detect_raw(np.zeros((1, 640, 640, 3), np.uint8))

        self.assertTrue(
            any(
                "output[0]: shape=(1, 84, 8400)" in r.getMessage() for r in logs.records
            )
        )

    def test_an_undecodable_model_fails_at_load(self):
        with self.assertRaisesRegex(ValueError, "Cannot decode DEEPX model"):
            self._detector(ModelTypeEnum.yologeneric, [{"shape": [1, 8400, 7]}])

    def test_detect_raw_runs_the_model_output_through_the_detected_layout(self):
        """End to end on a mocked session: a compiled channel-major
        anchor-free shape is oriented by its column count and handed to the
        shared decoder, coming back as Frigate's (20, 6) rows."""
        detector, _ = self._detector(
            ModelTypeEnum.yologeneric, [{"shape": [1, 84, 8400]}]
        )
        output = np.zeros((1, 84, 8400), dtype=np.float32)
        output[0, 0:4, 0] = [320.0, 160.0, 64.0, 32.0]
        output[0, 4 + 2, 0] = 0.9
        detector.session.run.return_value = [output]
        detector.width, detector.height = 640, 640

        detections = detector.detect_raw(np.zeros((1, 640, 640, 3), np.uint8))

        self.assertEqual(detections.shape, (20, 6))
        self.assertEqual(detections[0][0], 2)
        self.assertAlmostEqual(detections[0][1], 0.9, places=5)
        self.assertAlmostEqual(detections[0][3], 288 / 640, places=5)

    def test_detect_raw_decodes_damoyolo_without_a_layout(self):
        detector, _ = self._detector(
            ModelTypeEnum.damoyolo, [{"shape": [1, 8400, 80]}, {"shape": [1, 8400, 4]}]
        )
        scores = np.zeros((1, 8400, 80), dtype=np.float32)
        boxes = np.zeros((1, 8400, 4), dtype=np.float32)
        scores[0, 0, 5] = 0.8
        boxes[0, 0] = [100.0, 100.0, 200.0, 300.0]
        detector.session.run.return_value = [scores, boxes]
        detector.width, detector.height = 640, 640

        detections = detector.detect_raw(np.zeros((1, 640, 640, 3), np.uint8))

        self.assertEqual(detections[0][0], 5)
        self.assertAlmostEqual(detections[0][1], 0.8, places=5)
        self.assertAlmostEqual(detections[0][4], 300 / 640, places=5)
