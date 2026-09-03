"""Frigate object detector plugin for the Axelera Metis NPU (`axelera`).

Axelera AI makes the Metis PCIe/M.2 NPU accelerator. Inference runs through the
vendor's LOW-LEVEL runtime API (``axelera.runtime``, the same direct
"ModelInstance.run" interface used for hailo8l/memryx), NOT through the
GStreamer-based ``create_inference_stream`` app pipeline.

Why the low-level API instead of the stream: the video pipeline is depth-4 and
clocked by the input arrival interval, so a frame's result round-trips in
~4x the input gap (~150 ms at a ~35 fps aggregate) even though the accelerator
computes a frame in ~21 ms back-to-back. That latency is what Frigate's async
runner reports and what a camera waits on. The direct runtime API is a
synchronous ``ModelInstance.run(inputs, outputs)`` call with no video pipeline,
so per-frame latency is the flat model time (~21 ms for YOLO-NAS M 704x576,
measured), independent of scene activity.

Model configuration:
  - ``path`` = path to a COMPILED model directory (containing ``1/model.json``
    + ``1/postprocess_graph.onnx``), a zip archive of one, or to the
    ``model.json`` itself; a preset name (e.g. ``yolox-s-coco-onnx``) is looked
    up under ``AXELERA_BUILD_ROOT`` (default ``/opt/voyager-sdk/build``), and
    http(s)/scheme-less host URLs download into the model cache.
  - ``labelmap_path`` / ``labelmap``: labels are mapped to class ids BY NAME
    via the merged labelmap, independent of label ordering.
  - ``width`` / ``height``: input frame dimensions (the coordinate space of the
    region Frigate sends, e.g. 704x576); the plugin letterboxes to the model's
    square input (640x640 for the YOLO presets) and maps boxes back.

The SDK's own baked postprocess graph (``1/postprocess_graph.onnx``) converts
the raw int8 AIPU tensors into boxes + class scores, so the plugin only
dequantises the heads and runs a thin class-max + NMS.
"""

import json
import logging
import os
import queue
import re
import threading
import zipfile
from typing import ClassVar, Literal

import cv2
import numpy as np
from pydantic import ConfigDict, Field

from frigate.const import MODEL_CACHE_DIR
from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig, ModelTypeEnum
from frigate.util.model import xyxy_to_xywh_for_nms
from frigate.util.runtime_deps import Artifact, ArtifactKind, RuntimeManifest

logger = logging.getLogger(__name__)

DETECTOR_KEY = "axelera"

# The Axelera runtime SDK is installed at first start rather than shipped in
# the image. The wheels come from Axelera's public Artifactory PyPI index
# (readable without credentials) and are pinned by sha256. The runtime wheel
# is auditwheel-repaired (all native deps bundled under axelera_runtime.libs
# and resolved through $ORIGIN RPATH), the runtime2 wheel bundles its own
# compiled core, and the firmware wheel ships the AIPU device firmware under
# axelera/omega so the pip install is fully self contained.
AXELERA_RUNTIME_VERSION = "1.8.0"
AXELERA_RUNTIME2_VERSION = "0.2.0"
AXELERA_FIRMWARE_VERSION = "1.8.0"
AXELERA_PYPI = "https://software.axelera.ai/artifactory/axelera-pypi"

AXELERA_MANIFEST = RuntimeManifest(
    name=DETECTOR_KEY,
    version=AXELERA_RUNTIME_VERSION,
    artifacts=(
        Artifact(
            url=(
                f"{AXELERA_PYPI}/axelera-runtime/{AXELERA_RUNTIME_VERSION}/"
                "axelera_runtime-1.8.0-cp311-cp311-manylinux_2_27_x86_64"
                ".manylinux_2_28_x86_64.whl"
            ),
            sha256="c97b41f427a61ca0fe22dcab38bbf885d12e0a04a0c4f55e87f1f4036a39c869",
            kind=ArtifactKind.wheel,
            machines=("x86_64",),
        ),
        Artifact(
            url=(
                f"{AXELERA_PYPI}/axelera-runtime/{AXELERA_RUNTIME_VERSION}/"
                "axelera_runtime-1.8.0-cp311-cp311-manylinux_2_27_aarch64"
                ".manylinux_2_28_aarch64.whl"
            ),
            sha256="5ec8a048fa94d261080c11b840044f5f7b62fce1f0a43ba8733fc880f40d86ef",
            kind=ArtifactKind.wheel,
            machines=("aarch64",),
        ),
        Artifact(
            url=(
                f"{AXELERA_PYPI}/axelera-runtime2/{AXELERA_RUNTIME2_VERSION}/"
                "axelera_runtime2-0.2.0-cp311-cp311-manylinux_2_28_x86_64.whl"
            ),
            sha256="020522241f3940feb4d38317724c1e75c49a1f1753ed1e869e187018dc112aff",
            kind=ArtifactKind.wheel,
            machines=("x86_64",),
        ),
        Artifact(
            url=(
                f"{AXELERA_PYPI}/axelera-runtime2/{AXELERA_RUNTIME2_VERSION}/"
                "axelera_runtime2-0.2.0-cp311-cp311-manylinux_2_28_aarch64.whl"
            ),
            sha256="45dc987b438c15d5a9d66b79d7cf79a78f9f9627447b1c6a5ffd4140deea8bdf",
            kind=ArtifactKind.wheel,
            machines=("aarch64",),
        ),
        Artifact(
            url=(
                f"{AXELERA_PYPI}/axelera-firmware/{AXELERA_FIRMWARE_VERSION}/"
                "axelera_firmware-1.8.0-py3-none-any.whl"
            ),
            sha256="b926c16383e696c6e2b200b9207a6fa8536e9b1f8a3d261987d3f829c0b37d36",
            kind=ArtifactKind.wheel,
        ),
    ),
    import_check="axelera.runtime",
)

AX_DEFAULT_NETWORK = "yolox-s-coco-onnx"
AX_DEFAULT_BUILD_ROOT = "/opt/voyager-sdk/build"
MAX_ROWS = 20
# int8 zero-point the compiled inputs are offset by (px - 128); also the
# filler for the padded border. Everything else about a specific compiled
# model (padded input size, content offset, per-output padded/real channels
# and dequant scale/zero-point) is read at init from 1/manifest.json, so the
# decoder works for any compiled YOLO-family model that ships a baked
# postprocess_graph.onnx (verified: YOLO-NAS M and YOLOX-S).
INPUT_Q_ZERO = -128
# confidence / NMS defaults mirror the SDK DecodeYolo operator defaults
CONF_THRESHOLD = 0.25
NMS_IOU_THRESHOLD = 0.45
QUEUE_MAXSIZE = 32
# ping-pong buffer sets for the producer/consumer pipeline: the producer
# writes one set while the decoder reads a previous one, so the NPU stays
# saturated. 3 sets bound the in-flight frames (pool size must equal the
# decode queue bound).
BUFFER_SETS = 3


# ----------------- Utility Functions ----------------- #


# Matches a scheme-less host URL: host([:port])/path, e.g. www.example.com/model.zip
# or localhost:8000/model.zip (bare filenames like foo.zip and relative paths like
# models/foo.zip have no leading dotted host and stay local paths / presets).
_HOST_URL_RE = re.compile(
    r"^(localhost|[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,})(:[0-9]+)?/"
)


def is_url(value: str) -> bool:
    """Return True for http(s) URLs and scheme-less host URLs.

    A bare host such as ``www.example.com/model.zip`` (no scheme) is a usable
    URL too: rejecting it would raise FileNotFoundError on a valid remote
    model. ``_url_with_scheme`` prepends ``http://`` before any fetch.
    """
    return value.startswith(("http://", "https://")) or bool(_HOST_URL_RE.match(value))


def _url_with_scheme(value: str) -> str:
    """Prepend http:// to a scheme-less host URL (vetted by is_url)."""
    if value.startswith(("http://", "https://")):
        return value
    return f"http://{value}"


def _looks_like_path(value: str) -> bool:
    """Heuristic: a value that should refer to a file on disk, not a preset."""
    return "/" in value or "." in value


def _extract_model_zip(zip_path: str, dest_dir: str) -> None:
    """Unpack a compiled-model zip into ``dest_dir`` (idempotent)."""
    marker = os.path.join(dest_dir, ".extracted")
    if os.path.isfile(marker):
        return
    os.makedirs(dest_dir, exist_ok=True)
    with zipfile.ZipFile(zip_path) as archive:
        for member in archive.infolist():
            if member.is_dir():
                continue
            target = os.path.realpath(os.path.join(dest_dir, member.filename))
            if not target.startswith(os.path.realpath(dest_dir) + os.sep):
                raise ValueError(
                    f"model archive member escapes target: {member.filename}"
                )
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with archive.open(member) as source, open(target, "wb") as out:
                out.write(source.read())
    with open(marker, "w") as f:
        f.write(zip_path)


def _resolve_model_json(model_path, model_url, build_root) -> str:
    """Resolve ``path`` to the compiled ``model.json`` for axelera.runtime.

    Returns the path to ``1/model.json`` (or ``model.json``) for a directory,
    the model.json itself when given, a compiled-model dir found under
    ``build_root`` for a bare preset name, or the unpacked contents of a
    compiled-model zip (downloaded first when the path is a URL). Raises
    FileNotFoundError otherwise.
    """
    if model_url and model_path:
        raise ValueError("`path` cannot be both a URL and a local path.")

    if model_url:
        name = os.path.splitext(os.path.basename(model_url.split("?")[0]))[0]
        name = name or AX_DEFAULT_NETWORK
        cache = os.path.join(MODEL_CACHE_DIR, "axelera")
        zip_path = os.path.join(cache, f"{name}.zip")
        extract_dir = os.path.join(cache, name)
        if not os.path.isfile(zip_path):
            os.makedirs(cache, exist_ok=True)
            logger.info("axelera: downloading model from %s", model_url)
            try:
                from frigate.util.downloader import ModelDownloader

                ModelDownloader.download_from_url(_url_with_scheme(model_url), zip_path)
            except Exception as exc:
                raise RuntimeError(
                    f"Failed to download model from {model_url}: {exc}"
                ) from exc
        if not zipfile.is_zipfile(zip_path):
            raise ValueError(f"downloaded model from {model_url} is not a zip archive")
        _extract_model_zip(zip_path, extract_dir)
        return _find_model_json(extract_dir)

    if model_path and _looks_like_path(model_path):
        if os.path.isfile(model_path) and model_path.endswith(".zip"):
            extract_dir = os.path.join(
                MODEL_CACHE_DIR,
                "axelera",
                os.path.splitext(os.path.basename(model_path))[0],
            )
            _extract_model_zip(model_path, extract_dir)
            return _find_model_json(extract_dir)
        return _find_model_json(model_path)

    preset = model_path or AX_DEFAULT_NETWORK
    root = build_root or AX_DEFAULT_BUILD_ROOT
    for candidate in (
        os.path.join(root, preset, preset, "1", "model.json"),
        os.path.join(root, preset, "1", "model.json"),
        os.path.join(root, preset, "model.json"),
        os.path.join(root, preset, preset, "model.json"),
    ):
        if os.path.isfile(candidate):
            return candidate
    raise FileNotFoundError(
        f"Compiled model not found for {model_path!r} under {root}. "
        "Point path at the compiled model directory (e.g. a dir "
        "containing 1/model.json), a zip of one, or a preset that was "
        "built into the AXELERA_BUILD_ROOT."
    )


def _find_model_json(where: str) -> str:
    """Locate the runtime's model.json under a dir or return the path itself."""
    if os.path.isfile(where) and os.path.basename(where) == "model.json":
        return where
    for candidate in (
        os.path.join(where, "1", "model.json"),
        os.path.join(where, "model.json"),
    ):
        if os.path.isfile(candidate):
            return candidate
    # a zip may have unpacked with a single top-level directory wrapper
    if os.path.isdir(where):
        for entry in sorted(os.listdir(where)):
            sub = os.path.join(where, entry)
            if os.path.isdir(sub):
                for candidate in (
                    os.path.join(sub, "1", "model.json"),
                    os.path.join(sub, "model.json"),
                ):
                    if os.path.isfile(candidate):
                        return candidate
    raise FileNotFoundError(
        f"model.json not found for {where}. Point path at the compiled "
        "model directory (containing 1/model.json) or the model.json itself."
    )


def _nms_per_class(boxes, scores, class_ids, iou_threshold: float) -> np.ndarray:
    """Per-class greedy NMS via cv2.dnn.NMSBoxes (C++, GIL-free).

    Boxes are xyxy; xyxy_to_xywh_for_nms converts them to the top-left+size
    format NMSBoxes expects. Running NMS per class keeps a confident car from
    suppressing an overlapping pedestrian, which class-agnostic NMS does.

    Returns kept indices sorted by descending score.
    """
    if len(boxes) == 0:
        return np.array([], dtype=np.int64)

    order = np.argsort(-scores)
    kept: list[int] = []
    for cls in np.unique(class_ids):
        idx = order[class_ids[order] == cls]
        if len(idx) == 0:
            continue
        indices = cv2.dnn.NMSBoxes(
            xyxy_to_xywh_for_nms(boxes[idx]).tolist(),
            [float(s) for s in scores[idx]],
            # inputs are already filtered above CONF_THRESHOLD by the caller
            score_threshold=0.0,
            nms_threshold=float(iou_threshold),
        )
        if isinstance(indices, np.ndarray):
            kept.extend(idx[indices.reshape(-1)].tolist())
        elif len(indices) > 0:
            kept.extend(idx[np.asarray(indices, dtype=np.int64).reshape(-1)].tolist())

    if not kept:
        return np.array([], dtype=np.int64)
    kept_arr = np.asarray(kept, dtype=np.int64)
    return kept_arr[np.argsort(-scores[kept_arr])]


def _read_model_manifest(model_dir: str) -> dict:
    """Read the compiled model's manifest (geometry + dequantize params).

    The compiler writes two JSONs next to the kernel: ``1/model.json`` (padded
    kernel I/O only) and ``1/manifest.json`` (original/padded shapes, the exact
    content offset inside the padded input, per-output padded channel counts
    and dequantize (scale, zero-point) for every head). ``1/manifest.json`` is
    the cross-model source of truth (verified for YOLO-NAS M and YOLOX-S);
    fall back to ``<parent>/quantized/manifest.json`` for older compilations.
    """
    candidates = [
        os.path.join(model_dir, "manifest.json"),
        os.path.join(os.path.dirname(model_dir), "quantized", "manifest.json"),
    ]
    for candidate in candidates:
        if not os.path.isfile(candidate):
            continue
        try:
            with open(candidate) as f:
                manifest = json.load(f)
        except Exception as exc:
            raise ValueError(
                f"could not parse compiled manifest {candidate}: {exc}"
            ) from exc
        required = (
            "input_shapes",
            "input_shapes_original",
            "output_shapes",
            "output_shapes_original",
            "dequantize_params",
        )
        missing = [k for k in required if k not in manifest]
        if missing:
            raise ValueError(
                f"compiled manifest {candidate} missing required keys: {missing}"
            )
        return manifest
    raise FileNotFoundError(
        "compiled manifest not found next to the model kernel. Point "
        "path at a directory compiled by the Voyager SDK that contains "
        "1/model.json + 1/manifest.json + 1/postprocess_graph.onnx."
    )


# ----------------- AxeleraRuntimeInference (engine) ----------------- #


class _AxeleraRuntimeInference:
    """Runs a compiled model via ``axelera.runtime`` on a two-thread pipeline.

    Frigate's AsyncDetectorRunner calls ``submit(connection_id, frame)`` from
    the detect thread and ``collect()`` from the result thread. Two engine
    threads process frames strictly in order: a producer letterboxes +
    quantizes + runs the model (``ModelInstance.run``, synchronous and flat:
    ~21 ms measured), and a consumer feeds the int8 heads through the SDK's
    baked ``postprocess_graph.onnx`` while the NPU is already busy on the next
    frame (measured throughput ~25 ms/frame, ~40 fps, vs ~29 ms serial). All
    ``run`` calls stay on the single producer thread, so in-flight frames never
    execute the model in parallel (a known card-wedge condition). Because both
    threads consume their queues FIFO, results are paired to requests by
    construction - there is no pipeline reorder to guard against.
    """

    def __init__(
        self,
        model_json,
        labels: list[str],
        labelmap: dict,
        width: int,
        height: int,
        pixel_format: str = "bgr",
        runtime_factory=None,
        onnx_factory=None,
    ) -> None:
        self._labels = labels
        self._labelmap = labelmap
        self._width, self._height = int(width), int(height)
        # the compiled model consumes RGB planes; Frigate delivers BGR when
        # input_pixel_format is bgr (flip below), RGB when rgb (no flip)
        self._flip_channels = pixel_format == "bgr"
        self._frame_q: queue.Queue = queue.Queue(maxsize=QUEUE_MAXSIZE)
        self._result_q: queue.Queue = queue.Queue(maxsize=QUEUE_MAXSIZE)
        self._stop = threading.Event()
        self._producer_thread: threading.Thread | None = None
        self._consumer_thread: threading.Thread | None = None

        if runtime_factory is None:
            try:
                from axelera.runtime import Context
            except (ImportError, ModuleNotFoundError) as exc:
                raise ImportError(
                    "Axelera runtime (axelera.runtime) is not available in this "
                    "environment. Frigate installs it at startup when an Axelera "
                    "detector is configured; check the startup log for errors."
                ) from exc
            runtime_factory = Context
        if onnx_factory is None:
            import onnxruntime as _ort

            onnx_factory = _ort

        model_dir = os.path.dirname(model_json)
        self._ctx = runtime_factory()
        model = self._ctx.load_model(model_json)
        # hold the device connection on self: the runtime releases the device
        # when the connection object is garbage collected, so it must outlive
        # init for as long as the model instance uses it
        self._conn = self._ctx.device_connect(None, num_sub_devices=1)
        self._instance = self._conn.load_model_instance(
            model, num_sub_devices=1, aipu_cores=1
        )

        manifest = _read_model_manifest(model_dir)

        # input: padded NHWC (1, H, W, 4) exactly as the runtime expects it,
        # plus the original NCHW (1, C, H, W) workspace the letterbox targets
        in_padded = [int(x) for x in manifest["input_shapes"][0]]
        in_orig = [int(x) for x in manifest["input_shapes_original"][0]]
        if len(in_padded) != 4 or in_padded[3] != 4 or in_orig[1] != 3:
            raise ValueError(
                f"unsupported compiled input: padded {in_padded}, original {in_orig}"
            )
        self._padded_h, self._padded_w = in_padded[1], in_padded[2]
        self._model_h, self._model_w = in_orig[2], in_orig[3]

        # where the compiler placed the unpadded content inside the padded
        # buffer: n_padded_ch_inputs = [[N(lo,hi), H(lo,hi), W(lo,hi),
        # C(lo,hi)]] (one entry per input)
        npad_data = manifest["n_padded_ch_inputs"]
        if isinstance(npad_data, list) and npad_data and isinstance(npad_data[0], list):
            npad_data = npad_data[0]
        npad = [int(x) for x in npad_data]
        if len(npad) == 8:
            self._content_top, self._content_left = npad[2], npad[4]
        else:
            self._content_top = (self._padded_h - self._model_h) // 2
            self._content_left = (self._padded_w - self._model_w) // 2

        out_padded = [tuple(int(x) for x in o) for o in manifest["output_shapes"]]
        out_real = [
            tuple(int(x) for x in o) for o in manifest["output_shapes_original"]
        ]
        dequant = manifest["dequantize_params"]
        if not (len(out_padded) == len(out_real) == len(dequant)):
            raise ValueError(
                "compiled manifest output counts mismatch: padded "
                f"{len(out_padded)}, original {len(out_real)}, "
                f"dequant {len(dequant)}"
            )
        # per head: real channel count (crop target) + dequant (scale, zp)
        self._head_real = [o[1] for o in out_real]
        self._head_dequant = [(np.float32(d[0]), np.float32(d[1])) for d in dequant]
        self._out_shapes = out_padded

        pp_path = os.path.join(model_dir, "postprocess_graph.onnx")
        if not os.path.isfile(pp_path):
            raise FileNotFoundError(
                f"postprocess_graph.onnx not found next to {model_json}"
            )
        self._pp = onnx_factory.InferenceSession(
            pp_path, providers=["CPUExecutionProvider"]
        )
        pp_inputs = self._pp.get_inputs()
        self._pp_input_names = [i.name for i in pp_inputs]
        if len(pp_inputs) != len(self._head_real):
            raise ValueError(
                "postprocess graph input count mismatch: "
                f"{len(pp_inputs)} graph inputs vs "
                f"{len(self._head_real)} model outputs"
            )
        # Map each postprocess input to the model output whose dequantised NCHW
        # crop has exactly that (1, C, H, W) shape: the compile order of the
        # raw heads is not guaranteed to match the postprocess graph's input
        # order (they differ for YOLOX vs YOLO-NAS), shapes are unique per head.
        self._feed_index: list[int] = []
        for pin in pp_inputs:
            want = tuple(int(x) for x in pin.shape)
            matches = [
                i
                for i in range(len(self._head_real))
                if (
                    1,
                    self._head_real[i],
                    out_padded[i][1],
                    out_padded[i][2],
                )
                == want
            ]
            if len(matches) != 1:
                raise ValueError(
                    f"cannot map postprocess input {pin.name} {want} to a "
                    "unique model output"
                )
            self._feed_index.append(matches[0])

        # pooled letterbox-input + raw-int8-output sets, ping-ponged between
        # the producer (runs the model) and the decoder (postprocesses the
        # previous frame's outputs while the NPU is busy on the next one).
        self._pool: queue.Queue = queue.Queue(maxsize=BUFFER_SETS)
        for _ in range(BUFFER_SETS):
            in_buf = np.full(
                (1, self._padded_h, self._padded_w, 4),
                INPUT_Q_ZERO,
                np.int8,
            )
            out_bufs = [np.zeros(shape, np.int8) for shape in out_padded]
            self._pool.put((in_buf, out_bufs))
        self._decode_q: queue.Queue = queue.Queue(maxsize=BUFFER_SETS)
        # letterbox geometry from the frame coords (width x height) into the
        # model's own workspace (640x640 for the YOLO presets)
        self._scale = min(self._model_w / self._width, self._model_h / self._height)
        new_w = round(self._width * self._scale)
        new_h = round(self._height * self._scale)
        self._new_w, self._new_h = max(1, new_w), max(1, new_h)
        self._pad_t = (self._model_h - self._new_h) // 2
        self._pad_l = (self._model_w - self._new_w) // 2

    # -- public contract used by AxeleraDetector --------------------------

    def submit(self, connection_id: str, frame: np.ndarray) -> None:
        """Queue one frame for inference, owned by `connection_id`.

        On overload (input queue full) the frame's INFERENCE is dropped but a
        zero-row result is still emitted for `connection_id`: the async runner
        contract is strictly 1 submission : 1 result (SHM cleanup + timing
        pairing), so raising here would leave the runner waiting for a result
        that never arrives.
        """
        try:
            self._frame_q.put_nowait((connection_id, frame))
        except queue.Full:
            logger.warning(
                "axelera: inference queue full; dropping frame for %s",
                connection_id,
            )
            self._push_result(connection_id, np.zeros((MAX_ROWS, 6), np.float32))
            return
        self._ensure_threads()

    def _ensure_threads(self) -> None:
        if self._consumer_thread is None or not self._consumer_thread.is_alive():
            self._consumer_thread = threading.Thread(
                target=self._consumer, name="axelera-decode", daemon=True
            )
            self._consumer_thread.start()
        if self._producer_thread is None or not self._producer_thread.is_alive():
            self._producer_thread = threading.Thread(
                target=self._producer, name="axelera-runtime", daemon=True
            )
            self._producer_thread.start()

    def collect(self):
        """Return (connection_id, rows) for the next completed inference.

        Returns (None, None) on stop so the async runner can exit cleanly.
        """
        while not self._stop.is_set():
            try:
                return self._result_q.get(timeout=0.25)
            except queue.Empty:
                continue
        return None, None

    def stop(self) -> None:
        """Stop the workers, release the Metis device. Never raises."""
        self._stop.set()
        for t in (self._producer_thread, self._consumer_thread):
            if t is not None and t.is_alive():
                t.join(timeout=2)
        try:
            # Context.release() releases the context and every object it
            # created (connection, model, instance); there is no per-object
            # free() in this runtime API
            self._ctx.release()
        except Exception:  # noqa: BLE001, S110
            pass
        logger.info("axelera: runtime inference stopped")

    # -- internals ---------------------------------------------------------

    def _push_result(self, connection_id: str, rows: np.ndarray) -> None:
        try:
            self._result_q.put_nowait((connection_id, rows))
        except queue.Full:
            logger.error("axelera: result queue full; dropping %s", connection_id)

    def _producer(self) -> None:
        """Letterbox + quantize + run(); hand raw outputs to the decoder.

        All ``ModelInstance.run`` calls happen on THIS single thread, so the
        three in-flight buffer sets never execute the model in parallel (a
        known card-wedge condition) while still overlapping with the decoder's
        CPU postprocessing.
        """
        while not self._stop.is_set():
            try:
                connection_id, frame = self._frame_q.get(timeout=0.25)
            except queue.Empty:
                continue
            try:
                in_buf, out_bufs = self._pool.get(timeout=1.0)
            except queue.Empty:
                logger.error("axelera: no free buffers; dropping %s", connection_id)
                self._push_result(connection_id, np.zeros((MAX_ROWS, 6), np.float32))
                continue
            try:
                self._preprocess(frame, in_buf)
                self._instance.run([in_buf], out_bufs)
                self._decode_q.put_nowait((connection_id, in_buf, out_bufs))
            except Exception:
                logger.exception("axelera: inference failed for %s", connection_id)
                self._pool.put((in_buf, out_bufs))
                self._push_result(connection_id, np.zeros((MAX_ROWS, 6), np.float32))

    def _consumer(self) -> None:
        """Decode the raw int8 heads (dequant + onnx + NMS) to (20,6) rows."""
        while not self._stop.is_set():
            try:
                connection_id, in_buf, out_bufs = self._decode_q.get(timeout=0.25)
            except queue.Empty:
                continue
            try:
                rows = self._decode(out_bufs)
            except Exception:
                logger.exception("axelera: decode failed for %s", connection_id)
                rows = np.zeros((MAX_ROWS, 6), np.float32)
            self._pool.put((in_buf, out_bufs))
            self._push_result(connection_id, rows)

    def _preprocess(self, frame: np.ndarray, buf: np.ndarray) -> None:
        """Letterbox the source (H, W, 3) into the padded input buffer."""
        resized = cv2.resize(
            frame,
            (self._new_w, self._new_h),
            interpolation=cv2.INTER_LINEAR,
        )
        # uint8 - 128 wraps mod 256, then cast to int8 == px - 128 (exactly),
        # in one pass over the resized frame (no int16/clip intermediates)
        q = (resized - np.uint8(128)).astype(np.int8)
        buf.fill(INPUT_Q_ZERO)
        y0, y1 = self._pad_t, self._pad_t + self._new_h
        x0, x1 = self._pad_l, self._pad_l + self._new_w
        ct, cl = self._content_top, self._content_left
        # channels 0..2 = quantized RGB: Frigate delivers BGR under the
        # documented input_pixel_format: bgr, so flip to the RGB semantics the
        # compiled input expects; with input_pixel_format: rgb the frame
        # already carries RGB and must pass through untouched
        src = q[..., ::-1] if self._flip_channels else q
        buf[0, ct + y0 : ct + y1, cl + x0 : cl + x1, 0:3] = src
        buf[0, ct + y0 : ct + y1, cl + x0 : cl + x1, 3] = 127

    def _decode(self, out_bufs) -> np.ndarray:
        """Dequantise heads + postprocess graph + conf threshold + NMS -> rows."""
        # dequantize + crop to the real channel count + transpose NHWC -> NCHW
        feeds = {}
        for feed_i, name in enumerate(self._pp_input_names):
            idx = self._feed_index[feed_i]
            obuf = out_bufs[idx]
            scale, zp = self._head_dequant[idx]
            real = self._head_real[idx]
            arr = obuf[..., :real].astype(np.float32)
            arr = (arr - zp) * scale
            feeds[name] = np.ascontiguousarray(arr.transpose(0, 3, 1, 2))

        pp_out = self._pp.run(None, feeds)
        if len(pp_out) == 2:
            # two outputs: class scores (sigmoid baked into the graph) + xyxy
            class_scores, boxes = pp_out
            scores = class_scores[0]  # (8400, 80)
            boxes = boxes[0]
            conf = scores.max(axis=1)
            cls_idx = scores.argmax(axis=1).astype(np.int32)
        else:
            # one fused output: [cx, cy, w, h, (objectness), C class scores].
            # The SDK DecodeYolo emits CENTER-format boxes (confirmed by the
            # vendor's axruntime_yolo11_onnxruntime.py example), absolute in
            # the model input space.
            raw = pp_out[0][0]
            cx, cy, w, h = raw[:, 0], raw[:, 1], raw[:, 2], raw[:, 3]
            boxes = np.stack([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], axis=1)
            total = raw.shape[-1]
            cls = raw[:, 4:]
            if total == 4 + 1 + len(self._labels):
                cls = raw[:, 5:] * raw[:, 4:5]  # YOLOX: score = obj * cls
            if cls.shape[1] == 0:
                return np.zeros((MAX_ROWS, 6), np.float32)
            conf = cls.max(axis=1)
            cls_idx = cls.argmax(axis=1).astype(np.int32)
        keep = conf > CONF_THRESHOLD
        boxes, conf, cls_idx = boxes[keep], conf[keep], cls_idx[keep]
        if len(conf) == 0:
            return np.zeros((MAX_ROWS, 6), np.float32)
        # inverse letterbox into the source (width x height) frame space
        bx = (boxes[:, [0, 2]] - self._pad_l) / self._scale
        by = (boxes[:, [1, 3]] - self._pad_t) / self._scale
        x0i = np.clip(bx[:, 0], 0, self._width)
        x1i = np.clip(bx[:, 1], 0, self._width)
        y0i = np.clip(by[:, 0], 0, self._height)
        y1i = np.clip(by[:, 1], 0, self._height)
        # NMS on the model-space boxes (scale-invariant IoU), per class
        keep_nms = _nms_per_class(boxes, conf, cls_idx, NMS_IOU_THRESHOLD)
        rows = []
        for i in keep_nms:
            label = (
                self._labels[cls_idx[i]]
                if 0 <= cls_idx[i] < len(self._labels)
                else None
            )
            class_id = self._labelmap.get(label)
            if class_id is None:
                continue
            score = float(conf[i])
            rows.append(
                (
                    class_id,
                    score,
                    float(y0i[i]) / self._height,
                    float(x0i[i]) / self._width,
                    float(y1i[i]) / self._height,
                    float(x1i[i]) / self._width,
                )
            )
        rows.sort(key=lambda r: r[1], reverse=True)
        out = np.zeros((MAX_ROWS, 6), np.float32)
        n = min(len(rows), MAX_ROWS)
        for i in range(n):
            out[i] = rows[i]
        return out


# ----------------- AxeleraDetector Class ----------------- #


class AxeleraDetector(DetectionApi):
    type_key = DETECTOR_KEY
    supported_models = [
        ModelTypeEnum.yolox,
        ModelTypeEnum.yolonas,
        ModelTypeEnum.yologeneric,
    ]
    runtime_manifest = AXELERA_MANIFEST

    def __init__(self, detector_config: "AxeleraDetectorConfig"):
        model = detector_config.model
        if model is None:
            raise ValueError(
                "axelera: the model block is required "
                "(path to a compiled model directory/zip/JSON, URL, or SDK "
                "model-zoo preset name)."
            )
        # the runtime wheels install into the user site at first start
        self.activate_dependencies()
        _point_runtime_at_installed_firmware()
        super().__init__(detector_config)

        self.width = model.width
        self.height = model.height
        model_path = model.path
        self.model_url = model_path if (model_path and is_url(model_path)) else None
        self.model_path = None if self.model_url else model_path

        build_root = os.environ.get("AXELERA_BUILD_ROOT", AX_DEFAULT_BUILD_ROOT)
        self.working_model = _resolve_model_json(
            self.model_path, self.model_url, build_root
        )

        # label name -> Frigate class id by NAME (independent of ordering)
        self._labelmap = {}
        for class_id, label in (model.merged_labelmap or {}).items():
            if label is not None:
                self._labelmap[str(label).strip()] = class_id
        if not self._labelmap:
            raise ValueError(
                "axelera: the labelmap is empty; every detection would be "
                "dropped in the label lookup. Set labelmap_path (e.g. "
                "/labelmap/coco-80.txt) or an inline labelmap for the model."
            )

        # COCO-ordered label names from the compiled model metadata (index -> name)
        labels = _read_model_labels(os.path.dirname(self.working_model))
        if len(labels) == 0:
            raise ValueError(
                "axelera: the compiled model carries no label list; every "
                "detection would fall out of the labelmap lookup while the "
                "detector reports healthy"
            )

        self._inference = _AxeleraRuntimeInference(
            model_json=self.working_model,
            labels=labels,
            labelmap=self._labelmap,
            width=self.width,
            height=self.height,
            pixel_format=str(
                getattr(model.input_pixel_format, "value", model.input_pixel_format)
            ),
        )
        logger.info(
            "axelera: runtime model=%s (%dx%d input, frame %dx%d) ready",
            self.working_model,
            self._inference._model_w,
            self._inference._model_h,
            self.width,
            self.height,
        )

    # --- async API (AsyncDetectorRunner, same contract as the memryx plugin) ---

    def send_input(self, connection_id, tensor_input: np.ndarray) -> None:
        """Preprocess (if needed) and send a frame to the Metis runtime."""
        if tensor_input is None:
            raise ValueError("[send_input] No image data provided for inference")

        frame = np.asarray(tensor_input)
        if frame.ndim == 4:
            # Frigate feeds a batched NHWC frame (1, H, W, C); drop the batch dim
            if frame.shape[0] != 1:
                raise ValueError(f"Unexpected batch dimension in frame: {frame.shape}")
            frame = frame[0]
        # BGR uint8 for the model (letterboxing/quantization happen in the
        # worker). This must be a REAL copy: the tensor backs the camera's
        # shared memory, which the runner unmaps once this frame's result is
        # collected, potentially before the producer thread reads a queued
        # frame (np.ascontiguousarray would be a no-op on a contiguous view).
        frame = np.array(frame, dtype=np.uint8, copy=True)
        self._inference.submit(connection_id, frame)

    def receive_output(self):
        """Return (connection_id, rows) for the next completed inference."""
        return self._inference.collect()

    def shutdown(self) -> None:
        """Gracefully shut down the runtime and release the Metis device."""
        self._inference.stop()

    def detect_raw(self, tensor_input: np.ndarray):
        """Synchronous path unused: axelera uses the async detector contract."""
        return 0  # type: ignore[override]

    def close(self):
        """Stop the inference runtime and release the Metis device."""
        self._inference.stop()

    def __del__(self):
        # destructor must not raise
        try:
            self.close()
        except Exception:  # noqa: S110, BLE001
            pass


def _point_runtime_at_installed_firmware() -> None:
    """Export the firmware paths the runtime's native library looks for.

    The pip-installed layout keeps the AIPU device firmware under the user
    site's ``axelera/omega`` directory (from the axelera-firmware wheel). The
    native device library resolves firmware through ``AXELERA_DEVICE_DIR`` (and
    the explicit stage0/elf variables), and has no default inside the Frigate
    image, so point it at the installed copy before the runtime is imported.
    """
    if os.environ.get("AXELERA_DEVICE_DIR"):
        return
    try:
        from frigate.util.runtime_deps import user_site

        omega = os.path.join(str(user_site()), "axelera", "omega")
    except Exception:  # noqa: BLE001
        return
    if not os.path.isdir(omega):
        return
    os.environ["AXELERA_DEVICE_DIR"] = omega
    os.environ.setdefault(
        "AIPU_FIRMWARE_OMEGA", os.path.join(omega, "bin", "start_axelera_runtime.elf")
    )
    os.environ.setdefault(
        "AIPU_RUNTIME_STAGE0_OMEGA",
        os.path.join(omega, "bin", "start_axelera_runtime_stage0.bin"),
    )


def _read_model_labels(model_dir: str) -> list[str]:
    """Read the COCO-ordered label list from the compiled model metadata.

    Raises ``ValueError`` when no label list is found: silently continuing
    with an empty list would drop every detection in the labelmap lookup
    while the detector reports healthy.
    """
    # model_info.json lives next to the model's parent (1/ holds the kernel)
    candidates = [model_dir, os.path.dirname(model_dir)]
    for base in candidates:
        for name in ("model_info.json", "model.json"):
            path = os.path.join(base, name)
            if not os.path.isfile(path):
                continue
            try:
                with open(path) as f:
                    data = json.load(f)
                for key in ("labels", "class_names"):
                    if isinstance(data.get(key), list) and data[key]:
                        return [str(x).strip() for x in data[key]]
            except Exception as exc:  # noqa: BLE001
                logger.debug("axelera: could not read labels from %s: %s", path, exc)
    raise ValueError(
        "axelera: no label list found in the compiled model metadata "
        f"(looked for model_info.json / model.json with a 'labels' or "
        f"'class_names' list next to {model_dir}); detections could not be "
        "mapped to Frigate labels"
    )


# ----------------- AxeleraDetectorConfig Class ----------------- #


class AxeleraDetectorConfig(BaseDetectorConfig):
    model_config = ConfigDict(title="Axelera Metis")

    # the Metis card can only be opened by one process
    shareable: ClassVar[bool] = False

    type: Literal[DETECTOR_KEY]
    device: str = Field(
        default="PCIe",
        title="Device Path",
        description="The Metis device to run inference on (e.g. 'PCIe').",
    )
