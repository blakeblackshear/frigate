"""Offline unit tests for the Axelera Metis detector plugin.

The runtime and onnxruntime objects are constructor-injected, so these cover
the decode paths (fused cxcywh and two-output scores+boxes), the raw class
index contract, the zip-only model resolution (download, fresh extraction,
rejection of anything else), and the zip extraction escape guard, without
the vendor SDK or a Metis card.
"""

import json
import os
import shutil
import sys
import tempfile
import types
import unittest
import zipfile
from typing import ClassVar
from unittest.mock import patch

import numpy as np

from frigate.detectors.detector_config import ModelTypeEnum
from frigate.detectors.plugins import axelera as ax

MANIFEST = {
    "input_shapes": [[1, 642, 656, 4]],
    "input_shapes_original": [[1, 3, 640, 640]],
    "n_padded_ch_inputs": [[0, 1, 1, 641, 0, 656, 0, 4]],
    "output_shapes": [[1, 80, 80, 128]],
    "output_shapes_original": [[1, 85, 80, 80]],
    "dequantize_params": [[0.01, -128]],
}


def _make_compiled_model(root: str) -> str:
    """Write a fake compiled-model tree, return the model_json path."""
    kernel = os.path.join(root, "fakenet", "1")
    os.makedirs(kernel)
    with open(os.path.join(kernel, "manifest.json"), "w") as f:
        json.dump(MANIFEST, f)
    with open(os.path.join(kernel, "model.json"), "w") as f:
        json.dump({"inputs": []}, f)
    with open(os.path.join(kernel, "postprocess_graph.onnx"), "wb") as f:
        f.write(b"fake")
    return os.path.join(kernel, "model.json")


def _make_model_zip(zip_path: str, kernel_payload: bytes = b"fake") -> None:
    """Write a compiled-model zip: fakenet/1/{model.json,manifest.json,onnx}."""
    with zipfile.ZipFile(zip_path, "w") as archive:
        archive.writestr("fakenet/1/model.json", json.dumps({"inputs": []}))
        archive.writestr("fakenet/1/manifest.json", json.dumps(MANIFEST))
        archive.writestr("fakenet/1/postprocess_graph.onnx", kernel_payload)


class _FakeInput:
    def __init__(self, name, shape):
        self.name = name
        self.shape = shape


class _FakeInstance:
    def run(self, ins, outs):
        pass


class _FakeConn:
    def load_model_instance(self, model, num_sub_devices=1, aipu_cores=1):
        return _FakeInstance()


class _FakeContext:
    def load_model(self, path):
        return object()

    def list_devices(self):
        return ["metis-0:1:0"]

    def device_connect(self, *_args, **_kwargs):
        return _FakeConn()

    def release(self):
        pass


class _FakeSessionOptions:
    def __init__(self):
        self.intra_op_num_threads = 0


class _FakeOnnx:
    """Postprocess-graph fake with a programmable output.

    ``outputs`` is what ``run`` returns; the feed dict keys/shapes are
    recorded so tests can assert the plugin dequantized and laid out the
    heads correctly before feeding the graph. Mirrors the onnxruntime
    module surface the plugin uses: SessionOptions() and InferenceSession().
    """

    session = None
    outputs: list = []

    def __init__(self, path, sess_options=None, providers=None):
        self._inputs = [_FakeInput("head0", [1, 85, 80, 80])]
        _FakeOnnx.session = self

    def get_inputs(self):
        return self._inputs

    def run(self, _out, feeds):
        self.feeds = feeds
        return _FakeOnnx.outputs

    @staticmethod
    def SessionOptions():
        return _FakeSessionOptions()

    @staticmethod
    def InferenceSession(path, sess_options=None, providers=None):
        return _FakeOnnx(path, sess_options, providers)


class _FakeModelDownloader:
    """The ModelDownloader stand-in bound into the stubbed downloader module."""

    calls: ClassVar[list] = []

    @staticmethod
    def download_from_url(download_url, save_path, silent=False):
        _FakeModelDownloader.calls.append((download_url, save_path))
        _make_model_zip(save_path)


def _make_engine(root: str, outputs, model_type=ModelTypeEnum.yolox):
    model_json = _make_compiled_model(root)
    _FakeOnnx.outputs = outputs
    return ax._AxeleraRuntimeInference(
        model_json=model_json,
        model_type=model_type,
        width=640,
        height=640,
        runtime_factory=_FakeContext,
        onnx_factory=_FakeOnnx,
    )


def _fused_row(cx, cy, w, h, obj, cls0):
    """Build a (1, 8400, 85) fused output with one detection in row 0."""
    out = np.zeros((1, 8400, 85), np.float32)
    out[0, 0, 0:5] = [cx, cy, w, h, obj]
    out[0, 0, 5] = cls0
    return [out]


class TestDecodeFused(unittest.TestCase):
    """One fused graph output: [cx, cy, w, h, obj, 80 class scores]."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        # a box centered in the 640 model space: model xyxy [288, 288, 352, 352]
        self.engine = _make_engine(
            self.tmp.name, _fused_row(320, 320, 64, 64, 1.0, 0.9)
        )

    def tearDown(self):
        self.tmp.cleanup()

    def test_dequantizes_heads_into_graph_feed(self):
        out_bufs = [np.full((1, 80, 80, 128), -128, np.int8)]
        self.engine._decode(out_bufs)
        ((name, feed),) = _FakeOnnx.session.feeds.items()
        self.assertEqual(name, "head0")
        self.assertEqual(feed.shape, (1, 85, 80, 80))
        # (q - zero_point) * scale with q=-128, zp=-128, scale=0.01
        self.assertAlmostEqual(float(feed[0, 0, 0, 0]), 0.0, places=6)

    def test_row_shape_and_dtype(self):
        out_bufs = [np.zeros((1, 80, 80, 128), np.int8)]
        rows = self.engine._decode(out_bufs)
        self.assertEqual(rows.shape, (ax.MAX_ROWS, 6))
        self.assertEqual(rows.dtype, np.float32)

    def test_boxes_map_straight_to_the_frame_space(self):
        # no letterbox: the frame is the model input (640x640), so model
        # xyxy maps to normalized frame coords 1:1
        out_bufs = [np.zeros((1, 80, 80, 128), np.int8)]
        rows = self.engine._decode(out_bufs)
        class_id, score, ymin, xmin, ymax, xmax = rows[0]
        self.assertEqual(int(class_id), 0)  # raw class index, not a name
        self.assertAlmostEqual(float(score), 0.9, places=5)  # obj * cls
        self.assertAlmostEqual(float(xmin), 288 / 640, places=4)
        self.assertAlmostEqual(float(xmax), 352 / 640, places=4)
        self.assertAlmostEqual(float(ymin), 288 / 640, places=4)
        self.assertAlmostEqual(float(ymax), 352 / 640, places=4)
        self.assertLess(float(ymin), float(ymax))
        self.assertLess(float(xmin), float(xmax))

    def test_class_index_passes_through_unmapped(self):
        # detections carry the raw class index; Frigate's labelmap names it
        out = np.zeros((1, 8400, 85), np.float32)
        out[0, 0, 0:5] = [320, 320, 64, 64, 1.0]
        out[0, 0, 5 + 5] = 0.9  # class 5
        tmp = tempfile.TemporaryDirectory()
        try:
            engine = _make_engine(tmp.name, [out])
            rows = engine._decode([np.zeros((1, 80, 80, 128), np.int8)])
            self.assertEqual(int(rows[0][0]), 5)
        finally:
            tmp.cleanup()

    def test_yolox_score_multiplies_objectness(self):
        out = _fused_row(320, 320, 64, 64, 0.5, 0.9)  # obj 0.5 * cls 0.9
        tmp = tempfile.TemporaryDirectory()
        try:
            engine = _make_engine(tmp.name, out, ModelTypeEnum.yolox)
            rows = engine._decode([np.zeros((1, 80, 80, 128), np.int8)])
            self.assertAlmostEqual(float(rows[0][1]), 0.45, places=5)
        finally:
            tmp.cleanup()

    def test_yolonas_score_skips_objectness(self):
        out = np.zeros((1, 8400, 84), np.float32)
        out[0, 0, :4] = [320, 320, 64, 64]
        out[0, 0, 4] = 0.9  # class 0, with no objectness column
        tmp = tempfile.TemporaryDirectory()
        try:
            engine = _make_engine(tmp.name, [out], ModelTypeEnum.yolonas)
            rows = engine._decode([np.zeros((1, 80, 80, 128), np.int8)])
            self.assertEqual(int(rows[0][0]), 0)
            self.assertAlmostEqual(float(rows[0][1]), 0.9, places=5)
        finally:
            tmp.cleanup()

    def test_below_conf_threshold_yields_zero_rows(self):
        tmp = tempfile.TemporaryDirectory()
        try:
            engine = _make_engine(tmp.name, _fused_row(320, 320, 64, 64, 1.0, 0.1))
            rows = engine._decode([np.zeros((1, 80, 80, 128), np.int8)])
            self.assertEqual(float(np.abs(rows).sum()), 0.0)
        finally:
            tmp.cleanup()


class TestDecodeTwoOutputs(unittest.TestCase):
    """Two graph outputs: (1, 8400, 80) class scores + (1, 8400, 4) xyxy."""

    def test_scores_and_boxes_branch(self):
        tmp = tempfile.TemporaryDirectory()
        try:
            scores = np.zeros((1, 8400, 80), np.float32)
            scores[0, 7, 0] = 0.8  # person at row 7
            boxes = np.zeros((1, 8400, 4), np.float32)
            boxes[0, 7] = [288, 288, 352, 352]  # xyxy, absolute model space
            engine = _make_engine(tmp.name, [scores, boxes])
            rows = engine._decode([np.zeros((1, 80, 80, 128), np.int8)])
            self.assertEqual(int(rows[0][0]), 0)
            self.assertAlmostEqual(float(rows[0][1]), 0.8, places=5)
            self.assertAlmostEqual(float(rows[0][2]), 288 / 640, places=4)
            self.assertAlmostEqual(float(rows[0][4]), 352 / 640, places=4)
        finally:
            tmp.cleanup()


class TestModelDimensions(unittest.TestCase):
    """width/height must equal the compiled input; no letterboxing."""

    def test_mismatched_dimensions_raise(self):
        tmp = tempfile.TemporaryDirectory()
        try:
            model_json = _make_compiled_model(tmp.name)
            with self.assertRaises(ValueError):
                ax._AxeleraRuntimeInference(
                    model_json=model_json,
                    model_type=ModelTypeEnum.yolox,
                    width=704,
                    height=576,
                    runtime_factory=_FakeContext,
                    onnx_factory=_FakeOnnx,
                )
        finally:
            tmp.cleanup()

    def test_matching_dimensions_initialize(self):
        tmp = tempfile.TemporaryDirectory()
        try:
            model_json = _make_compiled_model(tmp.name)
            engine = ax._AxeleraRuntimeInference(
                model_json=model_json,
                model_type=ModelTypeEnum.yolox,
                width=640,
                height=640,
                runtime_factory=_FakeContext,
                onnx_factory=_FakeOnnx,
            )
            self.assertEqual((engine._width, engine._height), (640, 640))
        finally:
            tmp.cleanup()


class TestZipGuard(unittest.TestCase):
    def test_member_escaping_target_raises(self):
        tmp = tempfile.TemporaryDirectory()
        try:
            zip_path = os.path.join(tmp.name, "evil.zip")
            with zipfile.ZipFile(zip_path, "w") as zf:
                zf.writestr("../escaped.txt", "boom")
            with self.assertRaises(ValueError):
                ax._extract_model_zip(zip_path, os.path.join(tmp.name, "out"))
            self.assertFalse(os.path.exists(os.path.join(tmp.name, "escaped.txt")))
        finally:
            tmp.cleanup()

    def test_normal_members_extract(self):
        tmp = tempfile.TemporaryDirectory()
        try:
            zip_path = os.path.join(tmp.name, "ok.zip")
            with zipfile.ZipFile(zip_path, "w") as zf:
                zf.writestr("net/1/model.json", "{}")
                zf.writestr("net/1/manifest.json", "{}")
            dest = os.path.join(tmp.name, "out")
            ax._extract_model_zip(zip_path, dest)
            self.assertTrue(
                os.path.isfile(os.path.join(dest, "net", "1", "model.json"))
            )
        finally:
            tmp.cleanup()


class TestFindModelJson(unittest.TestCase):
    def test_direct_and_wrapper_dir(self):
        tmp = tempfile.TemporaryDirectory()
        try:
            root = tmp.name
            # direct: root/1/model.json
            os.makedirs(os.path.join(root, "direct", "1"))
            direct = os.path.join(root, "direct", "1", "model.json")
            open(direct, "w").write("{}")
            self.assertEqual(ax._find_model_json(os.path.join(root, "direct")), direct)
            # single wrapper dir: root/wrap/net/1/model.json
            wrapped = os.path.join(root, "wrap", "net", "1")
            os.makedirs(wrapped)
            hit = os.path.join(wrapped, "model.json")
            open(hit, "w").write("{}")
            self.assertEqual(ax._find_model_json(os.path.join(root, "wrap")), hit)
        finally:
            tmp.cleanup()

    def test_ambiguous_subdirs_raise(self):
        tmp = tempfile.TemporaryDirectory()
        try:
            for net in ("aaa", "bbb"):
                sub = os.path.join(tmp.name, net, "1")
                os.makedirs(sub)
                open(os.path.join(sub, "model.json"), "w").write("{}")
            with self.assertRaises(ValueError):
                ax._find_model_json(tmp.name)
        finally:
            tmp.cleanup()

    def test_missing_raises_filenotfound(self):
        tmp = tempfile.TemporaryDirectory()
        try:
            with self.assertRaises(FileNotFoundError):
                ax._find_model_json(tmp.name)
        finally:
            tmp.cleanup()


class TestRuntimeToolShims(unittest.TestCase):
    def test_ensure_runtime_enumeration_tools_only_installs_missing(self):
        tmp = tempfile.TemporaryDirectory()
        saved_path = os.environ["PATH"]
        # resolve sh before PATH is emptied: the shim check below must still
        # find a shell once PATH points only at the empty temp dir
        sh_bin = shutil.which("sh") or "/bin/sh"
        try:
            os.environ["PATH"] = tmp.name  # nothing on PATH
            with tempfile.TemporaryDirectory() as cache:
                orig_cache = ax.MODEL_CACHE_DIR
                ax.MODEL_CACHE_DIR = cache
                try:
                    ax._ensure_runtime_enumeration_tools()
                finally:
                    ax.MODEL_CACHE_DIR = orig_cache
                bindir = os.path.join(cache, "axelera", "bin")
                for tool in ("lspci", "lsmod"):
                    self.assertTrue(os.access(os.path.join(bindir, tool), os.X_OK))
                self.assertTrue(os.environ["PATH"].startswith(bindir))
                # the shims are valid sh and produce their /proc, /sys reads
                import subprocess

                out = subprocess.run(
                    [sh_bin, os.path.join(bindir, "lsmod")],
                    capture_output=True,
                    text=True,
                )
                self.assertEqual(out.returncode, 0)
                self.assertIn("Module", out.stdout.splitlines()[0])
        finally:
            os.environ["PATH"] = saved_path
            tmp.cleanup()


class TestModelResolve(unittest.TestCase):
    """`path` is a .zip of the compiled output, local or http(s) URL."""

    def _resolve(self, path):
        _FakeModelDownloader.calls = []
        # the plugin imports the downloader lazily at the call site (its module
        # chain pulls the IPC stack), so the test binds a stub module instead
        stub = types.ModuleType("frigate.util.downloader")
        setattr(stub, "ModelDownloader", _FakeModelDownloader)
        tmp = tempfile.TemporaryDirectory()
        saved_cache = ax.MODEL_CACHE_DIR
        ax.MODEL_CACHE_DIR = os.path.join(tmp.name, "cache")
        try:
            with patch.dict(sys.modules, {"frigate.util.downloader": stub}):
                got = ax._resolve_model_json(path)
        finally:
            ax.MODEL_CACHE_DIR = saved_cache
            tmp.cleanup()
        return _FakeModelDownloader.calls, got

    def test_https_url_downloads_and_resolves(self):
        calls, got = self._resolve("https://example.com/models/fakenet.zip")

        self.assertEqual(calls[0][0], "https://example.com/models/fakenet.zip")
        self.assertTrue(calls[0][1].endswith(os.path.join("axelera", "fakenet.zip")))
        self.assertTrue(got.endswith(os.path.join("fakenet", "1", "model.json")))

    def test_url_without_filename_falls_back_to_default_name(self):
        calls, _ = self._resolve("https://example.com/")

        self.assertTrue(calls[0][1].endswith("yolox-s-coco-onnx.zip"))

    def test_scheme_less_host_is_rejected(self):
        # no scheme means a local path; a host-looking string is not a file
        with self.assertRaises(FileNotFoundError):
            self._resolve("www.example.com/models/fakenet.zip")

    def test_local_zip_resolves(self):
        tmp = tempfile.TemporaryDirectory()
        try:
            zip_path = os.path.join(tmp.name, "fakenet.zip")
            _make_model_zip(zip_path)
            _FakeModelDownloader.calls = []
            stub = types.ModuleType("frigate.util.downloader")
            setattr(stub, "ModelDownloader", _FakeModelDownloader)
            saved_cache = ax.MODEL_CACHE_DIR
            ax.MODEL_CACHE_DIR = os.path.join(tmp.name, "cache")
            try:
                with patch.dict(sys.modules, {"frigate.util.downloader": stub}):
                    got = ax._resolve_model_json(zip_path)
            finally:
                ax.MODEL_CACHE_DIR = saved_cache
            self.assertEqual(_FakeModelDownloader.calls, [])
            self.assertTrue(got.endswith(os.path.join("fakenet", "1", "model.json")))
        finally:
            tmp.cleanup()

    def test_non_zip_path_is_rejected(self):
        tmp = tempfile.TemporaryDirectory()
        try:
            model_json = _make_compiled_model(tmp.name)
            with self.assertRaises(ValueError):
                self._resolve(model_json)
            with self.assertRaises(ValueError):
                self._resolve(os.path.join(tmp.name, "fakenet"))
        finally:
            tmp.cleanup()

    def test_missing_local_zip_raises_filenotfound(self):
        with self.assertRaises(FileNotFoundError):
            self._resolve("/nope/fakenet.zip")


class TestFreshExtract(unittest.TestCase):
    """The selected archive extracts fresh on every start."""

    def _resolve(self, path, tmp_name):
        stub = types.ModuleType("frigate.util.downloader")
        setattr(stub, "ModelDownloader", _FakeModelDownloader)
        saved_cache = ax.MODEL_CACHE_DIR
        ax.MODEL_CACHE_DIR = os.path.join(tmp_name, "cache")
        try:
            with patch.dict(sys.modules, {"frigate.util.downloader": stub}):
                return ax._resolve_model_json(path)
        finally:
            ax.MODEL_CACHE_DIR = saved_cache

    def test_replaced_archive_becomes_the_model_that_runs(self):
        tmp = tempfile.TemporaryDirectory()
        try:
            _FakeModelDownloader.calls = []
            self._resolve("https://example.com/models/fakenet.zip", tmp.name)
            zip_path = _FakeModelDownloader.calls[0][1]
            # the archive at the cache path is replaced (re-fetched upstream,
            # a pre-seeded image, a mirror refresh)
            _make_model_zip(zip_path, kernel_payload=b"replaced")
            self._resolve("https://example.com/models/fakenet.zip", tmp.name)

            extract_dir = os.path.join(
                tmp.name, "cache", "axelera", "fakenet-extracted"
            )
            with open(
                os.path.join(extract_dir, "fakenet", "1", "postprocess_graph.onnx"),
                "rb",
            ) as f:
                self.assertEqual(f.read(), b"replaced")
        finally:
            tmp.cleanup()

    def test_same_archive_does_not_download_twice(self):
        tmp = tempfile.TemporaryDirectory()
        try:
            _FakeModelDownloader.calls = []
            self._resolve("https://example.com/models/fakenet.zip", tmp.name)
            self.assertEqual(len(_FakeModelDownloader.calls), 1)
            self._resolve("https://example.com/models/fakenet.zip", tmp.name)

            # the zip is cached (no second download), the extract is fresh
            self.assertEqual(len(_FakeModelDownloader.calls), 1)
        finally:
            tmp.cleanup()


class TestBackpressure(unittest.TestCase):
    """Overload keeps the 1 submission : 1 result runner contract."""

    def _engine(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        return _make_engine(tmp.name, [])

    def test_full_input_queue_still_delivers_zero_rows(self):
        engine = self._engine()
        frame = np.zeros((1, 640, 640, 3), np.uint8)
        for i in range(ax.QUEUE_MAXSIZE):
            engine._frame_q.put_nowait((f"cam{i}", frame))

        overflow = "overflow-cam"
        engine.submit(overflow, frame)

        cid, rows = engine._result_q.get_nowait()
        self.assertEqual(cid, overflow)
        self.assertEqual(rows.shape, (ax.MAX_ROWS, 6))
        self.assertTrue(np.all(rows == 0))

    def test_stop_ends_collect_and_releases_context(self):
        engine = self._engine()
        engine.stop()

        self.assertEqual(engine.collect(), (None, None))


if __name__ == "__main__":
    unittest.main()
