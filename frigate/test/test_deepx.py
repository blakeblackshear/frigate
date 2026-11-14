"""Tests for the DEEPX detector."""

import json
import os
import struct
import sys
import tempfile
import unittest
from unittest.mock import MagicMock, patch

import numpy as np
from pydantic import ValidationError

from frigate.detectors.detector_config import ModelConfig, ModelTypeEnum
from frigate.detectors.device import (
    DeviceParseError,
    build_detector_config,
    parse_device,
)
from frigate.detectors.plugins.deepx import (
    DEEPX_MANIFEST,
    DXRT_VERSION,
    PPU_RECORD_SIZE,
    DeepxDetector,
    DeepxDetectorConfig,
    PpuLayout,
    YoloLayout,
    class_count,
    decode_raw_anchor,
    decode_raw_nms_in_head,
    infer_yolo_layout,
    read_ppu_layout,
    resolve_device,
    validate_yolox_outputs,
)


def model_with_type(model_type) -> ModelConfig:
    return ModelConfig(
        model_type=model_type,
        labelmap_path=None,
        labelmap={79: "toothbrush"},
        width=640,
        height=640,
    )


def build_ppu_record(box, score=0.9, label=0, grid=(7, 9, 2, 2)) -> np.ndarray:
    record = np.zeros(PPU_RECORD_SIZE, dtype=np.uint8)
    record[0:16] = np.array(box, dtype=np.float32).view(np.uint8)
    record[16:20] = grid
    record[20:24] = np.array([score], dtype=np.float32).view(np.uint8)
    record[24:28] = np.array([label], dtype=np.uint32).view(np.uint8)
    return record.reshape(1, 1, PPU_RECORD_SIZE)


# compile_config.ppu as DX-COM writes it for the two head kinds
ANCHOR_BASED_PPU = {"type": 0, "num_classes": 80, "activation": "Sigmoid"}
ANCHOR_FREE_PPU = {"type": 1, "num_classes": 80}

PPU_BBOX_NODE = "/head/Mul_2"

# (grid_w, grid_h, entries) per scale, finest first; the grids give the
# strides at a 640 input
THREE_SCALE_ANCHORS = [(80, 80, 3), (40, 40, 3), (20, 20, 3)]
TWO_SCALE_ANCHORS = [(40, 40, 3), (20, 20, 3)]
FOUR_SCALE_ANCHORS = [(160, 160, 3), (80, 80, 3), (40, 40, 3), (20, 20, 3)]
THREE_SCALE_FREE = [(80, 80, 1), (40, 40, 1), (20, 20, 1)]
ONE_SCALE_FREE = [(100, 84, 1)]


def proto_varint(value: int) -> bytes:
    out = bytearray()
    while True:
        byte = value & 0x7F
        value >>= 7
        out.append(byte | (0x80 if value else 0))
        if not value:
            return bytes(out)


def proto_bytes(field: int, payload: bytes) -> bytes:
    return proto_varint(field << 3 | 2) + proto_varint(len(payload)) + payload


def proto_number(field: int, value: int) -> bytes:
    return proto_varint(field << 3) + proto_varint(value)


def onnx_node(op_type: str, name: str, inputs: list, outputs: list) -> bytes:
    body = b"".join(proto_bytes(1, tensor.encode()) for tensor in inputs)
    body += b"".join(proto_bytes(2, tensor.encode()) for tensor in outputs)
    return body + proto_bytes(3, name.encode()) + proto_bytes(4, op_type.encode())


def onnx_box_graph(box_format: str) -> bytes:
    if box_format == "broken":
        return proto_varint(1 << 3 | 3)

    unnamed = box_format == "unnamed"

    def graph_node(op_type: str, name: str, inputs: list, outputs: list) -> bytes:
        return onnx_node(op_type, "" if unnamed else name, inputs, outputs)

    nodes = [
        graph_node("Split", "dfl_split", ["dfl", "sizes"], ["lt", "rb"]),
        graph_node("Sub", "corner_min", ["anchors", "lt"], ["x1y1"]),
        graph_node("Add", "corner_max", ["rb", "anchors"], ["x2y2"]),
    ]
    if box_format in ("centre", "unnamed"):
        nodes += [
            graph_node("Add", "corner_sum", ["x1y1", "x2y2"], ["sum"]),
            graph_node("Mul", "corner_mean", ["sum", "half"], ["cxy"]),
            graph_node("Sub", "corner_span", ["x2y2", "x1y1"], ["wh"]),
            graph_node("Concat", "box_concat", ["cxy", "wh"], ["box"]),
        ]
    elif box_format == "corner":
        nodes.append(graph_node("Concat", "box_concat", ["x1y1", "x2y2"], ["box"]))
    else:
        nodes.append(graph_node("Concat", "box_concat", ["x1y1", "x1y1"], ["box"]))

    box = "box"
    if unnamed:
        box = "box_flat"
        nodes.append(graph_node("Reshape", "box_reshape", ["shape", "box"], [box]))

    nodes.append(onnx_node("Mul", PPU_BBOX_NODE, [box, "strides"], ["bbox_out"]))
    graph = b"".join(proto_bytes(1, node) for node in nodes)
    graph += proto_bytes(5, b"weights")
    return (
        proto_number(1, 10)  # ir_version
        + proto_bytes(2, b"onnx_frontend_compiler")  # producer_name
        + proto_bytes(7, graph)
    )


def write_dxnn(
    directory, ppu, layers, name="model.dxnn", table=True, box_format=None
) -> str:
    """A minimal .dxnn as DX-RT's parsers read it: the container header, a
    compile_config carrying `ppu`, and either the PPU tensor table with one
    entry per (layer, anchor) as a v8 file has, or with `table` False only
    the rmap_info listing of the PPU output tensors, as a v7 file has.
    `layers` is (grid_w, grid_h, entries) per scale, finest first; an
    anchor-free scale has one entry, and grid_h 1 means a flattened
    (1, cells, channels) tensor. `box_format`, "centre" or "corner", adds
    the compiled graph that says how the head writes its boxes, along with
    the compile_config layer naming the node the PPU reads them from."""
    if box_format is not None and "layer" not in ppu:
        ppu = dict(ppu, layer=[{"bbox": PPU_BBOX_NODE, "cls_conf": "/head/Sigmoid"}])

    compile_config = json.dumps({"compile_version": "2.4.0", "ppu": ppu}).encode()
    graph = onnx_box_graph(box_format) if box_format is not None else b""

    if table:
        part = bytearray(struct.pack("<BBBB", 1, sum(n for _, _, n in layers), 0, 0))
        for conv, (grid_w, grid_h, entries) in enumerate(layers):
            for anchor in range(entries):
                part += struct.pack(
                    "<HHfBBBBBBBB",
                    128,
                    80,
                    0.001,
                    conv,
                    anchor,
                    0,
                    1,
                    0,
                    grid_w,
                    grid_h,
                    0,
                )
    else:
        outputs = []
        for conv, (grid_w, grid_h, entries) in enumerate(layers):
            for anchor in range(entries):
                name_ = f"PPU_Transpose_Output_{conv}"
                if entries > 1:
                    name_ += f"_anchor_{anchor}"
                shape = [1, grid_w, 127] if grid_h == 1 else [1, grid_h, grid_w, 128]
                outputs.append({"name": name_, "shape": shape, "layout": "PPU_YOLO"})
        part = json.dumps({"inputs": [], "outputs": outputs}).encode()

    data = {
        "compile_config": {
            "type": "str",
            "offset": 0,
            "size": len(compile_config),
        },
        "compiled_data": {
            "M1A_4K": {
                "npu_0": {
                    "rmap": {"type": "bytes", "offset": 0, "size": 0},
                    "ppu" if table else "rmap_info": {
                        "type": "bytes" if table else "str",
                        "offset": len(compile_config),
                        "size": len(part),
                    },
                }
            }
        },
    }
    if graph:
        data["vis_npu_models"] = {
            "npu_0": {
                "type": "bytes",
                "offset": len(compile_config) + len(part),
                "size": len(graph),
            }
        }

    index = json.dumps(
        {
            "version": 8 if table else 7,
            "signature": "DXNN",
            "size": 8192,
            "data": data,
        }
    ).encode()

    path = os.path.join(directory, name)
    with open(path, "wb") as model:
        model.write(b"DXNN" + struct.pack("<I", 8))
        model.write(index.ljust(8192 - 8, b"\0"))
        model.write(compile_config + part + graph)

    return path


def layout_of(shapes, num_classes, ppu=False, dynamic_output=False) -> YoloLayout:
    return infer_yolo_layout(shapes, num_classes, ppu, dynamic_output).layout


class TestDeepxModelFile(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)

    def layout(self, ppu, layers, **kwargs) -> PpuLayout | None:
        return read_ppu_layout(write_dxnn(self.tmp.name, ppu, layers, **kwargs))

    def test_the_head_kind_and_one_grid_per_scale_are_read(self):
        cases = {
            "anchor-based: three anchors per scale collapse to one grid each": (
                (ANCHOR_BASED_PPU, THREE_SCALE_ANCHORS, {}),
                PpuLayout(anchor_based=True, grids=((80, 80), (40, 40), (20, 20))),
            ),
            "anchor-free, one scale flattened into a single tensor": (
                (ANCHOR_FREE_PPU, ONE_SCALE_FREE, {"box_format": "centre"}),
                PpuLayout(anchor_based=False, grids=((100, 84),), centre_boxes=True),
            ),
            "a head kind the compiler does not name still yields the scales": (
                ({"type": 7}, [(80, 80, 3), (40, 40, 3)], {}),
                PpuLayout(anchor_based=None, grids=((80, 80), (40, 40))),
            ),
            "no table: the per-anchor split says anchor-based": (
                ({"num_classes": 80}, THREE_SCALE_ANCHORS, {"table": False}),
                PpuLayout(anchor_based=True, grids=((80, 80), (40, 40), (20, 20))),
            ),
            "no table: compile_config places the scales ahead of the names": (
                (
                    {
                        "type": 1,
                        "outputs": {
                            f"PPU_Transpose_Output_{i}": {"conv_idx": 2 - i}
                            for i in range(3)
                        },
                    },
                    [(20, 20, 1), (40, 40, 1), (80, 80, 1)],
                    {"table": False},
                ),
                PpuLayout(anchor_based=False, grids=((80, 80), (40, 40), (20, 20))),
            ),
            "no table: every scale in one (1, cells, channels) tensor": (
                (ANCHOR_FREE_PPU, [(8400, 1, 1)], {"table": False}),
                PpuLayout(anchor_based=False, grids=((8400, 1),)),
            ),
        }

        for head, ((ppu, layers, kwargs), expected) in cases.items():
            with self.subTest(head=head):
                self.assertEqual(self.layout(ppu, layers, **kwargs), expected)

    def test_the_box_format_comes_from_the_compiled_graph(self):
        for box_format, centre in (
            ("centre", True),
            ("corner", False),
            ("unnamed", True),
        ):
            with self.subTest(box_format=box_format):
                self.assertEqual(
                    self.layout(ANCHOR_FREE_PPU, ONE_SCALE_FREE, box_format=box_format),
                    PpuLayout(
                        anchor_based=False, grids=((100, 84),), centre_boxes=centre
                    ),
                )

    def test_a_box_format_the_graph_does_not_answer_is_left_open(self):
        cases = {
            "no compiled graph at all": (ANCHOR_FREE_PPU, ONE_SCALE_FREE, {}),
            "a graph without the node compile_config names": (
                dict(ANCHOR_FREE_PPU, layer=[{"bbox": "/head/Missing"}]),
                ONE_SCALE_FREE,
                {"box_format": "centre"},
            ),
            "a graph that builds its boxes from neither shape": (
                ANCHOR_FREE_PPU,
                ONE_SCALE_FREE,
                {"box_format": "neither"},
            ),
            "a graph section the reader cannot make sense of": (
                ANCHOR_FREE_PPU,
                ONE_SCALE_FREE,
                {"box_format": "broken"},
            ),
            "a grid-decoded head, where the question does not arise": (
                ANCHOR_FREE_PPU,
                THREE_SCALE_FREE,
                {"box_format": "centre"},
            ),
        }

        for graph, (ppu, layers, kwargs) in cases.items():
            with self.subTest(graph=graph):
                self.assertIsNone(self.layout(ppu, layers, **kwargs).centre_boxes)

    def test_nothing_is_read_from_a_model_without_ppu_metadata(self):
        self.assertIsNone(read_ppu_layout(os.path.join(self.tmp.name, "missing")))

        path = write_dxnn(self.tmp.name, None, [(80, 80, 3)])
        self.assertIsNone(read_ppu_layout(path))

        with open(path, "wb") as model:
            model.write(b"ONNX" + b"\0" * 100)
        self.assertIsNone(read_ppu_layout(path))

        path = write_dxnn(self.tmp.name, ANCHOR_BASED_PPU, [(80, 80, 3), (40, 40, 3)])
        os.truncate(path, os.path.getsize(path) - 40)
        self.assertIsNone(read_ppu_layout(path))


class TestDeepxLayoutInference(unittest.TestCase):
    def test_a_shape_and_class_count_pick_one_layout(self):
        cases = {
            "anchor-free, four columns ahead of the classes": (
                [(1, 84, 8400)],
                80,
                YoloLayout.anchor_free,
                84,
            ),
            "anchor-free, row-major": ([(1, 8400, 84)], 80, YoloLayout.anchor_free, 84),
            "anchor-based, an objectness column as well": (
                [(1, 25200, 85)],
                80,
                YoloLayout.anchor,
                85,
            ),
            "anchor-based, channel-major": (
                [(1, 85, 25200)],
                80,
                YoloLayout.anchor,
                85,
            ),
            "NMS in the head, a fixed run of corner records": (
                [(1, 300, 6)],
                80,
                YoloLayout.nms_in_head,
                None,
            ),
            # only the label map can tell these two apart
            "85 columns with 81 classes is anchor-free": (
                [(1, 8400, 85)],
                81,
                YoloLayout.anchor_free,
                85,
            ),
            "85 columns with 80 classes is anchor-based": (
                [(1, 8400, 85)],
                80,
                YoloLayout.anchor,
                85,
            ),
            # 6 columns is all three layouts, told apart by the row count
            "6 columns and thousands of rows, one class": (
                [(1, 25200, 6)],
                1,
                YoloLayout.anchor,
                6,
            ),
            "6 columns and thousands of rows, two classes": (
                [(1, 8400, 6)],
                2,
                YoloLayout.anchor_free,
                6,
            ),
            "6 columns and a few hundred rows, one class": (
                [(1, 300, 6)],
                1,
                YoloLayout.nms_in_head,
                None,
            ),
            "7 columns with two classes is only anchor-based": (
                [(1, 8400, 7)],
                2,
                YoloLayout.anchor,
                7,
            ),
            # a square output matches the same width on both axes, which must
            # not read as two candidate layouts
            "a square output is not ambiguous with itself": (
                [(1, 85, 85)],
                80,
                YoloLayout.anchor,
                85,
            ),
            "three NCHW maps with 255 channels are feature maps": (
                [(1, 255, 80, 80), (1, 255, 40, 40), (1, 255, 20, 20)],
                80,
                YoloLayout.multipart,
                None,
            ),
        }

        for head, (shapes, num_classes, layout, columns) in cases.items():
            with self.subTest(head=head):
                output = infer_yolo_layout(shapes, num_classes, False, False)

                self.assertIs(output.layout, layout)
                if columns is not None:
                    self.assertEqual(output.columns, columns)

    def test_the_runtime_flags_outrank_the_shapes(self):
        self.assertIs(layout_of([(8400,)], 80, ppu=True), YoloLayout.ppu)
        self.assertIs(
            layout_of([(1, -1, 6)], 80, dynamic_output=True), YoloLayout.nms_in_head
        )

    def test_a_shape_no_layout_fits_is_refused_with_the_reason(self):
        cases = {
            "fits two layouts": ([(1, 84, 6)], 80),
            "labelmap_path": ([(1, 8400, 84)], 91),
            "no output tensor": ([], 80),
            "255 channels": (
                [(1, 80, 80, 255), (1, 40, 40, 255), (1, 20, 20, 255)],
                80,
            ),
            "feature maps": ([(1, 8400, 80), (1, 8400, 4)], 80),
            "80-class": ([(1, 24, 80, 80), (1, 24, 40, 40), (1, 24, 20, 20)], 3),
        }

        for reason, (shapes, num_classes) in cases.items():
            with (
                self.subTest(reason=reason),
                self.assertRaisesRegex(ValueError, reason),
            ):
                layout_of(shapes, num_classes)


class TestDeepxOutputValidation(unittest.TestCase):
    def test_the_raw_yolox_head_is_read_for_the_configured_input(self):
        for shapes, size in (
            ([(1, 8400, 85)], 640),
            ([(1, 85, 8400)], 640),
            # 52*52 + 26*26 + 13*13 cells at 416
            ([(1, 3549, 85)], 416),
        ):
            with self.subTest(shapes=shapes, size=size):
                self.assertEqual(validate_yolox_outputs(shapes, 80, size, size), 85)

    def test_another_head_under_yolox_is_refused_with_the_reason(self):
        cases = {
            "width and height": ([(1, 8400, 85)], 80, 416),
            "labelmap_path": ([(1, 8400, 85)], 91, 640),
            "yolo-generic": ([(1, 8400, 80), (1, 8400, 4)], 80, 640),
        }

        for reason, (shapes, num_classes, size) in cases.items():
            with (
                self.subTest(reason=reason),
                self.assertRaisesRegex(ValueError, reason),
            ):
                validate_yolox_outputs(shapes, num_classes, size, size)

    def test_the_label_map_bounds_the_class_count(self):
        self.assertEqual(class_count({0: "person", 79: "toothbrush"}), 80)

        with self.assertRaisesRegex(ValueError, "labelmap_path"):
            class_count({})


class TestDeepxRawDecode(unittest.TestCase):
    def anchor_rows(self, rows) -> list:
        out = np.zeros((1, len(rows), 85), dtype=np.float32)

        for i, (cx, cy, w, h, obj, label, score) in enumerate(rows):
            out[0, i, 0:4] = [cx, cy, w, h]
            out[0, i, 4] = obj
            out[0, i, 5 + label] = score

        return [out]

    def test_an_anchor_based_head_becomes_normalized_corners(self):
        outputs = self.anchor_rows([(320.0, 160.0, 64.0, 32.0, 0.8, 3, 0.5)])

        detections = decode_raw_anchor(outputs, 640, 640, 0.25, 0.45)

        self.assertEqual(detections[0][0], 3)
        self.assertAlmostEqual(detections[0][1], 0.4, places=5)
        self.assertAlmostEqual(detections[0][2], 144 / 640, places=5)
        self.assertAlmostEqual(detections[0][3], 288 / 640, places=5)
        self.assertAlmostEqual(detections[0][4], 176 / 640, places=5)
        self.assertAlmostEqual(detections[0][5], 352 / 640, places=5)

    def test_a_channel_major_export_is_read_by_column_count(self):
        outputs = self.anchor_rows([(320.0, 160.0, 64.0, 32.0, 1.0, 3, 0.9)])

        detections = decode_raw_anchor(
            [np.swapaxes(outputs[0], 1, 2)], 640, 640, 0.25, 0.45, columns=85
        )

        self.assertEqual(detections[0][0], 3)
        self.assertAlmostEqual(detections[0][3], 288 / 640, places=5)

    def test_rows_below_the_combined_threshold_are_dropped(self):
        # 0.4 * 0.5 = 0.2, under the threshold both parts clear on their own
        outputs = self.anchor_rows([(320.0, 320.0, 40.0, 80.0, 0.4, 3, 0.5)])

        self.assertTrue(np.all(decode_raw_anchor(outputs, 640, 640, 0.25, 0.45) == 0))

    def test_at_most_twenty_detections_are_returned(self):
        rows = [(20.0 + 24 * i, 320.0, 16.0, 16.0, 1.0, i % 80, 0.9) for i in range(25)]

        detections = decode_raw_anchor(self.anchor_rows(rows), 640, 640, 0.25, 0.45)

        self.assertEqual(detections.shape, (20, 6))
        self.assertEqual(int((detections[:, 1] > 0).sum()), 20)

    def test_an_nms_in_head_output_is_read_without_running_nms(self):
        out = np.array(
            [
                [
                    [100.0, 100.0, 200.0, 200.0, 0.9, 2.0],
                    [102.0, 102.0, 202.0, 202.0, 0.8, 2.0],
                    [300.0, 300.0, 400.0, 400.0, 0.1, 5.0],
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
        self.assertTrue(np.all(detections[2] == 0))

        empty = np.zeros((1, 0, 6), dtype=np.float32)
        self.assertTrue(np.all(decode_raw_nms_in_head([empty], 640, 640, 0.25) == 0))


class TestDeepxConfig(unittest.TestCase):
    def test_a_device_string_resolves_to_an_npu_index(self):
        for configured, index in (("PCIe:1", 1), ("2", 2), ("", 0)):
            with self.subTest(device=configured):
                self.assertEqual(resolve_device(configured), index)

    def test_a_device_that_is_not_an_index_is_rejected(self):
        """The whole string has to be an index. Reading only the tail would
        take the 1 out of "PCIe:0,PCIe:1" and bind to an NPU the config never
        named, and several NPUs are configured as separate devices entries."""
        for configured in (
            "PCIe:the-fast-one",
            "PCIe:0,PCIe:1",
            "0,1",
            "PCIe:0 PCIe:1",
            "PCIe:-1",
            "PCIe:",
        ):
            with self.subTest(device=configured):
                with self.assertRaises(ValueError):
                    resolve_device(configured)

                with self.assertRaises(ValidationError):
                    DeepxDetectorConfig(type="deepx", device=configured)

    def test_a_bad_device_is_refused_where_the_config_is_parsed(self):
        """parse_device builds the detector config to surface a bad device at
        startup, so the comma-separated form fails there rather than binding a
        detector process to the wrong NPU."""
        self.assertEqual(parse_device("deepx:PCIe:1").device, "PCIe:1")

        for raw in ("deepx:PCIe:0,PCIe:1", "deepx:the-fast-one"):
            with self.subTest(raw=raw), self.assertRaises(DeviceParseError):
                parse_device(raw)

    def test_a_device_string_builds_this_detector_config(self):
        """Frigate turns a `deepx:PCIe:0` entry into the detector config with
        the model already attached, which is the path app.py takes; a bare
        constructor call does not exercise it."""
        config = build_detector_config(
            parse_device("deepx:PCIe:0"), model_with_type(ModelTypeEnum.yologeneric)
        )

        self.assertIsInstance(config, DeepxDetectorConfig)
        self.assertEqual(config.device, "PCIe:0")
        self.assertEqual(config.model.model_type, ModelTypeEnum.yologeneric)

    def test_the_runtime_manifest_pins_its_wheels_to_the_version(self):
        """A PyPI path carries a per-file digest, so bumping DXRT_VERSION has
        to rewrite the whole URL; a stale one installs the old wheel and fails
        the sha256 on every user's first start."""
        self.assertEqual(DEEPX_MANIFEST.version, DXRT_VERSION)

        for artifact in DEEPX_MANIFEST.artifacts:
            with self.subTest(url=artifact.url):
                self.assertIn(f"dx_engine-{DXRT_VERSION}-", artifact.url)

    def test_a_model_less_config_still_validates(self):
        config = DeepxDetectorConfig(type="deepx")

        self.assertIsNone(config.model)


class DeepxDetectorTestCase(unittest.TestCase):
    def detector(
        self,
        model_type=ModelTypeEnum.yologeneric,
        outputs_info=None,
        ppu=False,
        dynamic=False,
        model_path="/nonexistent/model.dxnn",
    ) -> DeepxDetector:
        dx_engine = MagicMock()
        dx_engine.Configuration.ITEM.SERVICE = object()
        session = dx_engine.InferenceEngine.return_value
        session.get_output_tensors_info.return_value = (
            [{"shape": [8400]}] if ppu else outputs_info or []
        )
        session.is_ppu.return_value = ppu
        session.has_dynamic_output.return_value = dynamic

        config = DeepxDetectorConfig(type="deepx")
        config.model = model_with_type(model_type)
        config.model.path = model_path

        with (
            # the detector writes the endpoint into the environment, which the
            # rest of the suite shares when it runs in one process
            patch.dict(os.environ),
            patch.dict(sys.modules, {"dx_engine": dx_engine}),
            patch.object(DeepxDetector, "activate_dependencies"),
            patch("os.path.isfile", return_value=True),
        ):
            return DeepxDetector(config)

    def ppu_detector(
        self, ppu, layers, model_type=ModelTypeEnum.yologeneric, box_format=None
    ) -> DeepxDetector:
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)

        return self.detector(
            model_type,
            ppu=True,
            model_path=write_dxnn(tmp.name, ppu, layers, box_format=box_format),
        )

    def detect(self, detector, outputs) -> np.ndarray:
        detector.session.run.return_value = outputs
        return detector.detect_raw(np.zeros((1, 640, 640, 3), np.uint8))


class TestDeepxModelType(DeepxDetectorTestCase):
    def test_a_model_type_with_no_decoder_is_rejected(self):
        for model_type in (ModelTypeEnum.ssd, ModelTypeEnum.dfine):
            with (
                self.subTest(model_type=model_type),
                self.assertRaisesRegex(ValueError, model_type.value),
            ):
                self.detector(model_type)

    def test_supported_model_types_are_accepted(self):
        for model_type, outputs_info in (
            (ModelTypeEnum.yologeneric, [{"shape": [1, 84, 8400]}]),
            (ModelTypeEnum.yolox, [{"shape": [1, 8400, 85]}]),
        ):
            with self.subTest(model_type=model_type):
                detector = self.detector(model_type, outputs_info)

                self.assertEqual(detector.model_type, model_type)


class TestDeepxDetectorLoad(DeepxDetectorTestCase):
    def test_the_layout_is_settled_at_load(self):
        detector = self.detector(ModelTypeEnum.yologeneric, [{"shape": [1, 84, 8400]}])
        self.assertIs(detector.output.layout, YoloLayout.anchor_free)
        self.assertEqual(detector.output.columns, 84)

        detector = self.detector(ModelTypeEnum.yolox, [{"shape": [1, 8400, 85]}])
        self.assertIs(detector.output.layout, YoloLayout.yolox)

        for model_type in (ModelTypeEnum.yologeneric, ModelTypeEnum.yolox):
            with self.subTest(model_type=model_type):
                detector = self.ppu_detector(
                    ANCHOR_FREE_PPU, THREE_SCALE_FREE, model_type=model_type
                )

                self.assertIs(detector.output.layout, YoloLayout.ppu)
                self.assertEqual(detector.ppu_layout.scale_count, 3)

    def test_a_model_the_detector_cannot_decode_is_refused_at_load(self):
        cases = {
            "Cannot decode DEEPX model": lambda: self.detector(
                ModelTypeEnum.yologeneric, [{"shape": [1, 8400, 7]}]
            ),
            "DX-COM 2.4.0": lambda: self.detector(ModelTypeEnum.yologeneric, ppu=True),
            "face and pose": lambda: self.ppu_detector({"type": 2}, [(80, 80, 1)]),
            "centre and size or as two corners": lambda: self.ppu_detector(
                ANCHOR_FREE_PPU, ONE_SCALE_FREE
            ),
        }

        for reason, load in cases.items():
            with (
                self.subTest(reason=reason),
                self.assertRaisesRegex(ValueError, reason),
            ):
                load()


class TestDeepxDetectRaw(DeepxDetectorTestCase):
    def test_a_ppu_record_decodes_by_the_head_in_the_model(self):
        cases = {
            "anchor-based, layer 2 of 3 at stride 32, the 373x326 anchor": (
                (ANCHOR_BASED_PPU, THREE_SCALE_ANCHORS, None),
                build_ppu_record((0.6, 0.4, 0.3, 0.7), label=5),
                (5, (0.0, 0.380094, 0.864187, 0.589906)),
            ),
            "anchor-based, layer 0 of 3 at stride 8, the 16x30 anchor": (
                (ANCHOR_BASED_PPU, THREE_SCALE_ANCHORS, None),
                build_ppu_record((0.6, 0.4, 0.3, 0.7), grid=(7, 9, 1, 0)),
                (0, (None, 0.116750, None, None)),
            ),
            "anchor-based, two scales: layer 0 is stride 16, not stride 8": (
                (ANCHOR_BASED_PPU, TWO_SCALE_ANCHORS, None),
                build_ppu_record((0.6, 0.4, 0.3, 0.7), grid=(7, 9, 1, 0)),
                (0, (0.141156, 0.236031, 0.223844, 0.248969)),
            ),
            "anchor-free, three scales: cell (10, 9) of stride 32": (
                (ANCHOR_FREE_PPU, THREE_SCALE_FREE, None),
                build_ppu_record((1.2, 0.5, 1.0, 0.5), grid=(9, 10, 0, 2), label=7),
                (7, (0.433782, 0.492043, 0.516218, 0.627957)),
            ),
            "anchor-free, one scale: the box fields are already pixels": (
                (ANCHOR_FREE_PPU, ONE_SCALE_FREE, "centre"),
                build_ppu_record((320.0, 160.0, 64.0, 32.0), label=3),
                (3, (144 / 640, 288 / 640, 176 / 640, 352 / 640)),
            ),
            "anchor-free, one scale: a sub-pixel box stays sub-pixel": (
                (ANCHOR_FREE_PPU, ONE_SCALE_FREE, "centre"),
                build_ppu_record((0.6, 0.4, 0.3, 0.7)),
                (0, (None, 0.45 / 640, None, None)),
            ),
            "a corner-format head reads the record as two corners": (
                (ANCHOR_FREE_PPU, ONE_SCALE_FREE, "corner"),
                build_ppu_record((100.0, 50.0, 300.0, 250.0), label=2),
                (2, (50 / 640, 100 / 640, 250 / 640, 300 / 640)),
            ),
            "a centre-format head reads it as a centre and size": (
                (ANCHOR_FREE_PPU, ONE_SCALE_FREE, "centre"),
                build_ppu_record((100.0, 50.0, 300.0, 250.0), label=2),
                (2, (0.0, 0.0, 175 / 640, 250 / 640)),
            ),
        }

        for head, ((ppu, layers, box_format), record, (label, box)) in cases.items():
            with self.subTest(head=head):
                detector = self.ppu_detector(ppu, layers, box_format=box_format)

                detections = self.detect(detector, [record])

                self.assertEqual(detections[0][0], label)
                for i, expected in enumerate(box, start=2):
                    if expected is not None:
                        self.assertAlmostEqual(detections[0][i], expected, places=5)

    def test_the_strides_come_from_the_grids_in_the_model(self):
        detector = self.ppu_detector(
            ANCHOR_FREE_PPU, [(40, 40, 1), (20, 20, 1), (10, 10, 1)]
        )

        detections = self.detect(
            detector,
            [build_ppu_record((1.2, 0.5, 1.0, 0.5), grid=(9, 10, 0, 0), label=7)],
        )

        # layer 0 is stride 16: centre (11.2, 9.5) * 16, size e * 16 x sqrt(e) * 16
        self.assertEqual(detections[0][0], 7)
        self.assertAlmostEqual(detections[0][2], (152 - np.exp(0.5) * 8) / 640, 5)
        self.assertAlmostEqual(detections[0][3], (179.2 - np.exp(1.0) * 8) / 640, 5)

    def test_the_head_stays_what_the_model_said_across_frames(self):
        detector = self.ppu_detector(ANCHOR_BASED_PPU, THREE_SCALE_ANCHORS)

        first = self.detect(
            detector, [build_ppu_record((0.6, 0.4, 0.3, 0.7), grid=(7, 9, 1, 0))]
        )
        # layer 0 of 3: stride 8, anchor 16x30
        self.assertAlmostEqual(first[0][3], 0.116750, places=5)

        second = self.detect(
            detector, [build_ppu_record((0.5, 0.5, 0.4, 0.4), grid=(3, 4, 0, 1))]
        )
        # layer 1 of 3: stride 16, anchor 30x61, not layer 1 of 2
        self.assertAlmostEqual(second[0][3], 0.0975, places=5)

        detector = self.ppu_detector(
            ANCHOR_FREE_PPU, ONE_SCALE_FREE, box_format="centre"
        )
        record = [build_ppu_record((100.0, 50.0, 300.0, 250.0), label=2)]
        # centre (100, 50), size 300 x 250: the right edge lands at 250
        for frame in range(2):
            with self.subTest(frame=frame):
                self.assertAlmostEqual(
                    self.detect(detector, record)[0][5], 250 / 640, places=5
                )

    def test_records_the_head_cannot_place_come_back_empty(self):
        cases = {
            "a level or box the anchor table does not carry": (
                THREE_SCALE_ANCHORS,
                [build_ppu_record((0.6, 0.4, 0.3, 0.7), grid=(7, 9, 2, 5))],
            ),
            "a scale count Frigate has no anchor table for": (
                FOUR_SCALE_ANCHORS,
                [build_ppu_record((0.6, 0.4, 0.3, 0.7))],
            ),
            "a record below the score threshold": (
                THREE_SCALE_ANCHORS,
                [build_ppu_record((0.6, 0.4, 0.3, 0.7), score=0.1)],
            ),
            "an unexpected record width": (
                THREE_SCALE_ANCHORS,
                [np.zeros((1, 3, 16), dtype=np.uint8)],
            ),
            **{
                f"no records at all, shaped {shape}": (
                    THREE_SCALE_ANCHORS,
                    [np.zeros(shape, dtype=np.uint8)],
                )
                for shape in ((1, 0, PPU_RECORD_SIZE), (0, PPU_RECORD_SIZE), (0,))
            },
        }

        for output, (layers, outputs) in cases.items():
            with self.subTest(output=output):
                detector = self.ppu_detector(ANCHOR_BASED_PPU, layers)

                self.assertTrue(np.all(self.detect(detector, outputs) == 0))

    def test_a_yolox_raw_head_is_decoded_through_the_grid(self):
        detector = self.detector(ModelTypeEnum.yolox, [{"shape": [1, 8400, 85]}])

        # cell (x 10, y 5) of the stride-8 grid is row 5 * 80 + 10
        tensor = np.zeros((1, 8400, 85), np.float32)
        tensor[0, 410, :5] = [0.5, 0.5, np.log(4.0), np.log(2.0), 0.9]
        tensor[0, 410, 5 + 7] = 0.8

        detections = self.detect(detector, [tensor])

        # centre (84, 44), size 32 x 16
        self.assertEqual(detections[0][0], 7)
        self.assertAlmostEqual(detections[0][1], 0.72, places=5)
        self.assertAlmostEqual(detections[0][2], 36 / 640, places=5)
        self.assertAlmostEqual(detections[0][3], 68 / 640, places=5)
        self.assertAlmostEqual(detections[0][4], 52 / 640, places=5)
        self.assertAlmostEqual(detections[0][5], 100 / 640, places=5)

        detector = self.detector(ModelTypeEnum.yolox, [{"shape": [1, 85, 8400]}])
        detections = self.detect(detector, [np.swapaxes(tensor, 1, 2)])
        self.assertAlmostEqual(detections[0][5], 100 / 640, places=5)

    def test_a_raw_head_comes_back_as_frigates_detection_rows(self):
        detector = self.detector(ModelTypeEnum.yologeneric, [{"shape": [1, 84, 8400]}])
        output = np.zeros((1, 84, 8400), dtype=np.float32)
        output[0, 0:4, 0] = [320.0, 160.0, 64.0, 32.0]
        output[0, 4 + 2, 0] = 0.9

        detections = self.detect(detector, [output])

        self.assertEqual(detections.shape, (20, 6))
        self.assertEqual(detections[0][0], 2)
        self.assertAlmostEqual(detections[0][1], 0.9, places=5)
        self.assertAlmostEqual(detections[0][3], 288 / 640, places=5)
