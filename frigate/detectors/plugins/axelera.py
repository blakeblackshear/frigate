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
  - ``path`` = a .zip of the COMPILED model output (containing ``1/model.json``
    + ``1/manifest.json`` + ``1/postprocess_graph.onnx``), local or http(s)
    URL (the memryx custom-model pattern); the selected archive extracts
    fresh on every start.
  - ``labelmap_path`` / ``labelmap``: Frigate's labelmap names the class
    index the decode returns, so renames and the coco-80 bus/truck->car
    mapping need no plugin-side code.
  - ``width`` / ``height``: must equal the compiled model input size; the
    plugin raises at init otherwise (no letterboxing).

The SDK's own baked postprocess graph (``1/postprocess_graph.onnx``) converts
the raw int8 AIPU tensors into boxes + class scores, so the plugin only
dequantizes the heads and runs a thin class-max + NMS.
"""

import json
import logging
import os
import queue
import shutil
import threading
import zipfile
from typing import ClassVar, Literal

import cv2
import numpy as np
from pydantic import ConfigDict, Field

from frigate.const import MODEL_CACHE_DIR
from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig, ModelTypeEnum
from frigate.util.file import FileLock
from frigate.util.model import xyxy_to_xywh_for_nms
from frigate.util.runtime_deps import (
    Artifact,
    ArtifactKind,
    RuntimeManifest,
    user_site,
)

logger = logging.getLogger(__name__)

DETECTOR_KEY = "axelera"

# The Axelera runtime SDK is installed at first start rather than shipped in
# the image. The wheels come from Axelera's public Artifactory PyPI index
# (readable without credentials) and are pinned by sha256. The runtime wheel
# is auditwheel-repaired (all native deps bundled under axelera_runtime.libs
# and resolved through $ORIGIN RPATH) and the firmware wheel ships the AIPU
# device firmware under axelera/omega so the pip install is fully self
# contained. axelera.runtime imports axelera.runtime2 only inside a try for
# its separate "new runtime API"; the low-level API this plugin uses lives in
# axelera.runtime.objects and works without it, so runtime2 is not installed.
AXELERA_RUNTIME_VERSION = "1.8.0"
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


def is_url(value: str) -> bool:
    """Return True for http(s) URLs."""
    return value.startswith(("http://", "https://"))


def _extract_model_zip(zip_path: str, dest_dir: str) -> None:
    """Unpack a compiled-model zip into ``dest_dir`` (caller wipes it first)."""
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


def _resolve_model_json(path) -> str:
    """Resolve ``path`` (a .zip of the compiled output) to its ``model.json``.

    Like the memryx custom-model flow, ``path`` is always a zip of the
    compiled output: an http(s) URL downloads into the model cache, a local
    zip is verified, and the selected archive extracts fresh on every start
    (under a lock, as several processes may start at once), so a replaced
    archive is always the model that runs. Anything else raises.
    """
    if not path:
        raise ValueError(
            "axelera: the model path is required (a .zip of the compiled "
            "model, local or http(s) URL)."
        )
    if is_url(path):
        name = os.path.splitext(os.path.basename(path.split("?")[0]))[0]
        name = name or AX_DEFAULT_NETWORK
        cache = os.path.join(MODEL_CACHE_DIR, "axelera")
        zip_path = os.path.join(cache, f"{name}.zip")
        if not os.path.isfile(zip_path):
            os.makedirs(cache, exist_ok=True)
            try:
                # function level like runtime_deps: keeps the detector API
                # import (and this module) free of the downloader's IPC stack
                from frigate.util.downloader import ModelDownloader

                ModelDownloader.download_from_url(path, zip_path)
            except OSError as exc:
                raise RuntimeError(
                    f"Failed to download model from {path}: {exc}"
                ) from exc
    else:
        if not path.endswith(".zip"):
            raise ValueError(
                f"Invalid model path: {path}. Only .zip files are supported. "
                "Please provide a .zip model archive."
            )
        if not os.path.isfile(path):
            raise FileNotFoundError(f"Custom model zip not found: {path}")
        zip_path = path
        name = os.path.splitext(os.path.basename(path))[0] or AX_DEFAULT_NETWORK

    if not zipfile.is_zipfile(zip_path):
        raise ValueError(f"model archive {zip_path} is not a zip file")
    cache = os.path.join(MODEL_CACHE_DIR, "axelera")
    os.makedirs(cache, exist_ok=True)
    extract_dir = os.path.join(cache, f"{name}-extracted")
    with FileLock(os.path.join(cache, f".{name}.lock")):
        if os.path.isdir(extract_dir):
            shutil.rmtree(extract_dir)
        _extract_model_zip(zip_path, extract_dir)
    return _find_model_json(extract_dir)


def _find_model_json(where: str) -> str:
    """Locate the runtime's model.json under an extracted model zip.

    ``where`` is the extract directory, so model.json sits either at its root
    (``1/model.json`` or ``model.json``) or under the single top-level folder
    the archive was wrapped in. Only an unambiguous single match is accepted:
    several candidate subdirectories raise instead of returning whichever
    sorts first, because silently picking one would run a model the user
    never selected.
    """
    if not os.path.isdir(where):
        raise FileNotFoundError(
            f"model.json not found under {where}. The model zip must contain "
            "1/model.json at its root or under one top-level folder."
        )
    for candidate in (
        os.path.join(where, "1", "model.json"),
        os.path.join(where, "model.json"),
    ):
        if os.path.isfile(candidate):
            return candidate
    matches: list[str] = []
    for entry in sorted(os.listdir(where)):
        sub = os.path.join(where, entry)
        if not os.path.isdir(sub):
            continue
        for candidate in (
            os.path.join(sub, "1", "model.json"),
            os.path.join(sub, "model.json"),
        ):
            if os.path.isfile(candidate):
                matches.append(candidate)
                break
    if len(matches) == 1:
        return matches[0]
    if len(matches) > 1:
        listed = ", ".join(os.path.relpath(m, where) for m in matches)
        raise ValueError(
            f"multiple compiled models found under {where}: {listed}. The "
            "model zip must contain exactly one model.json, at its root or "
            "under one top-level folder."
        )
    raise FileNotFoundError(
        f"model.json not found under {where}. The model zip must contain "
        "1/model.json at its root or under one top-level folder."
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
    and dequantize (scale, zero-point) for every head).
    """
    candidate = os.path.join(model_dir, "manifest.json")
    if not os.path.isfile(candidate):
        raise FileNotFoundError(
            "compiled manifest not found next to the model kernel. Point "
            "path at a zip of a directory compiled by the Voyager SDK that "
            "contains 1/model.json + 1/manifest.json + 1/postprocess_graph.onnx."
        )
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


# ----------------- AxeleraRuntimeInference (engine) ----------------- #


class _AxeleraRuntimeInference:
    """Runs a compiled model via ``axelera.runtime`` on a two-thread pipeline.

    Frigate's AsyncDetectorRunner calls ``submit(connection_id, frame)`` from
    the detect thread and ``collect()`` from the result thread. Two engine
    threads process frames strictly in order: a producer resizes +
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
        model_type: ModelTypeEnum,
        width: int,
        height: int,
        pixel_format: str = "bgr",
        runtime_factory=None,
        onnx_factory=None,
    ) -> None:
        self._model_type = model_type
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
        # enumerate and connect to the DeviceInfo explicitly rather than
        # letting the runtime pick: it surfaces the lspci/device-node
        # mismatch as an empty list instead of a late connect failure
        devices = self._ctx.list_devices()
        if not devices:
            raise RuntimeError(
                "axelera: no Metis device enumerated; the runtime needs the "
                "raw /dev/metis-<bus>-<dev>-<fn> node in the container and "
                "the colon-separated name (e.g. /dev/metis-0:1:0) present "
                "as a symlink to it. See the install docs for the CDI "
                "device spec that provides both, and check that the metis "
                "driver is loaded on the host"
            )
        # hold the device connection on self: the runtime releases the device
        # when the connection object is garbage collected, so it must outlive
        # init for as long as the model instance uses it
        self._conn = self._ctx.device_connect(devices[0], num_sub_devices=1)
        self._instance = self._conn.load_model_instance(
            model, num_sub_devices=1, aipu_cores=1
        )

        manifest = _read_model_manifest(model_dir)

        # input: padded NHWC (1, H, W, 4) exactly as the runtime expects it,
        # plus the original NCHW (1, C, H, W) workspace the resize targets
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
        # one frame is in flight through the decoder, so a single intra-op
        # thread is optimal; extra ORT threads only add context switches
        sess_opts = onnx_factory.SessionOptions()
        sess_opts.intra_op_num_threads = 1
        self._pp = onnx_factory.InferenceSession(
            pp_path,
            sess_options=sess_opts,
            providers=["CPUExecutionProvider"],
        )
        pp_inputs = self._pp.get_inputs()
        self._pp_input_names = [i.name for i in pp_inputs]
        if len(pp_inputs) != len(self._head_real):
            raise ValueError(
                "postprocess graph input count mismatch: "
                f"{len(pp_inputs)} graph inputs vs "
                f"{len(self._head_real)} model outputs"
            )
        # Map each postprocess input to the model output whose dequantized NCHW
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

        # pooled model-input + raw-int8-output sets, ping-ponged between
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
        # fp32 postprocess feeds, sized to each graph input and reused: the
        # dequantizing copy writes straight into them (copyto fuses the
        # NHWC->NCHW transpose with the int8->fp32 cast, and the dequant math
        # then runs in place) so the hot path never allocates
        self._pp_scratch = {
            pin.name: np.zeros(
                tuple(int(x) for x in pin.shape),
                np.float32,
            )
            for pin in pp_inputs
        }
        if (self._width, self._height) != (self._model_w, self._model_h):
            raise ValueError(
                f"axelera: model width/height must match the compiled input "
                f"({self._model_w}x{self._model_h}); configured "
                f"{self._width}x{self._height}"
            )
        # per-frame scratch (producer-thread-owned): the resized frame, the
        # channel-oriented copy, and the quantized int8
        self._resize_scratch = np.zeros((self._model_h, self._model_w, 3), np.uint8)
        self._orient_scratch = np.zeros((self._model_h, self._model_w, 3), np.uint8)
        self._quant_scratch = np.zeros((self._model_h, self._model_w, 3), np.int8)

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
        """Deliver one completion, applying backpressure instead of dropping.

        The async runner contract is strictly 1 submission : 1 delivered
        result (SHM cleanup + timing pairing), so an accepted submission must
        never lose its completion: if the result worker is behind, the
        producing thread blocks until the queue drains. The only consumer is
        the runner's result worker (which drains until stop), so the block
        self-throttles rather than deadlocking; it is stop-aware so shutdown
        stays responsive while the runner is unwinding.
        """
        warned = False
        while not self._stop.is_set():
            try:
                self._result_q.put((connection_id, rows), timeout=0.25)
                return
            except queue.Full:
                if not warned:
                    logger.warning(
                        "axelera: result queue full, applying backpressure for %s",
                        connection_id,
                    )
                    warned = True
        logger.warning(
            "axelera: stopping, dropping undelivered result for %s", connection_id
        )

    def _producer(self) -> None:
        """Resize + quantize + run(); hand raw outputs to the decoder.

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
        """Resize the source (H, W, 3) into the model input and quantize.

        All three passes write into preallocated scratch: resize straight into
        the scratch buffer (cv2 ``dst=``), an in-place channel swap (no strided
        ``[..., ::-1]`` copy at write time), and an out= subtract for the
        int8 quantize.
        """
        cv2.resize(
            frame,
            (self._model_w, self._model_h),
            interpolation=cv2.INTER_LINEAR,
            dst=self._resize_scratch,
        )
        if self._flip_channels:
            # BGR -> RGB: Frigate delivers BGR under the documented
            # input_pixel_format: bgr, while the compiled input expects RGB
            # semantics; with input_pixel_format: rgb the frame already
            # carries RGB and is only swapped during quantisation
            cv2.cvtColor(
                self._resize_scratch,
                cv2.COLOR_BGR2RGB,
                dst=self._orient_scratch,
            )
            src_u8 = self._orient_scratch
        else:
            src_u8 = self._resize_scratch
        # uint8 - 128 wraps mod 256, then cast to int8 == px - 128 (exactly);
        # dtype= on subtract keeps it one pass with no intermediate array
        np.subtract(
            src_u8,
            np.uint8(128),
            out=self._quant_scratch,
            dtype=np.int8,
            casting="unsafe",
        )
        # the frame fills the whole content region; anything the compiler
        # padded around it stays at the zero-point filler
        buf[0, :, :, :].fill(INPUT_Q_ZERO)
        dst = buf[
            0,
            self._content_top : self._content_top + self._model_h,
            self._content_left : self._content_left + self._model_w,
        ]
        dst[..., 0:3] = self._quant_scratch
        dst[..., 3] = 127

    def _decode(self, out_bufs) -> np.ndarray:
        """Dequantize heads + postprocess graph + conf threshold + NMS -> rows."""
        # dequantize + crop to the real channel count + transpose NHWC -> NCHW
        # without temporaries: copyto casts int8 -> fp32 (lossless) while it
        # does the strided transpose copy into the reused scratch feed, then
        # the zp/scale dequant math runs in place on the contiguous NCHW result
        feeds = {}
        for feed_i, name in enumerate(self._pp_input_names):
            idx = self._feed_index[feed_i]
            obuf = out_bufs[idx]
            scale, zp = self._head_dequant[idx]
            real = self._head_real[idx]
            dst = self._pp_scratch[name]
            np.copyto(dst, obuf[..., :real].transpose(0, 3, 1, 2), casting="unsafe")
            np.subtract(dst, zp, out=dst)
            np.multiply(dst, scale, out=dst)
            feeds[name] = dst

        pp_out = self._pp.run(None, feeds)
        if len(pp_out) == 2:
            # two outputs: class scores (sigmoid baked into the graph) + xyxy
            class_scores, boxes = pp_out
            scores = class_scores[0]  # (8400, 80)
            boxes = boxes[0]
            # one argmax pass over the class axis; conf gathers the argmaxed
            # cells instead of a second full max(axis=1) reduction
            cls_idx = scores.argmax(axis=1).astype(np.int32)
            conf = scores[np.arange(cls_idx.shape[0]), cls_idx]
        else:
            # one fused output: [cx, cy, w, h, (objectness), C class scores].
            # The SDK DecodeYolo emits CENTER-format boxes (confirmed by the
            # vendor's axruntime_yolo11_onnxruntime.py example), absolute in
            # the model input space.
            raw = pp_out[0][0]
            cx, cy, w, h = raw[:, 0], raw[:, 1], raw[:, 2], raw[:, 3]
            boxes = np.stack([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], axis=1)
            cls = raw[:, 4:]
            if self._model_type == ModelTypeEnum.yolox:
                cls = raw[:, 5:] * raw[:, 4:5]  # YOLOX: score = obj * cls
            if cls.shape[1] == 0:
                return np.zeros((MAX_ROWS, 6), np.float32)
            cls_idx = cls.argmax(axis=1).astype(np.int32)
            conf = cls[np.arange(cls_idx.shape[0]), cls_idx]
        keep = conf > CONF_THRESHOLD
        boxes, conf, cls_idx = boxes[keep], conf[keep], cls_idx[keep]
        if len(conf) == 0:
            return np.zeros((MAX_ROWS, 6), np.float32)
        # boxes are already in the frame space: the input is not letterboxed
        # (width/height must equal the compiled input size)
        x0i = np.clip(boxes[:, 0], 0, self._width)
        x1i = np.clip(boxes[:, 2], 0, self._width)
        y0i = np.clip(boxes[:, 1], 0, self._height)
        y1i = np.clip(boxes[:, 3], 0, self._height)
        # NMS on the model-space boxes (scale-invariant IoU), per class
        keep_nms = _nms_per_class(boxes, conf, cls_idx, NMS_IOU_THRESHOLD)
        rows = []
        for i in keep_nms:
            score = float(conf[i])
            rows.append(
                (
                    int(cls_idx[i]),
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
                "axelera: the model block is required (a .zip of the compiled "
                "model output, local or http(s) URL)."
            )
        # the runtime wheels install into the user site at first start
        self.activate_dependencies()
        _ensure_runtime_enumeration_tools()
        _point_runtime_at_installed_firmware()
        super().__init__(detector_config)

        self.width = model.width
        self.height = model.height

        self.working_model = _resolve_model_json(model.path)

        self._inference = _AxeleraRuntimeInference(
            model_json=self.working_model,
            model_type=model.model_type,
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
        # BGR uint8 for the model (resize/quantization happen in the
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

    def __del__(self):
        # destructor must not raise
        try:
            if getattr(self, "_inference", None) is not None:
                self.shutdown()
        except Exception:  # noqa: S110, BLE001
            pass


def _ensure_runtime_enumeration_tools() -> None:
    """Provide minimal lspci/lsmod stand-ins when the image lacks them.

    The runtime's list_devices() shells out to ``lspci`` (PCI count, matched
    against the driver count) and ``lsmod`` (AIPU driver presence) through
    popen and greps their output. Both only read /sys and /proc, which are
    readable in the container, so when the real tools are absent (slim image)
    the plugin supplies shell stand-ins in a directory it owns and prepends
    that to PATH. The real tools always win when installed.
    """
    if shutil.which("lspci") is not None and shutil.which("lsmod") is not None:
        return
    bin_dir = os.path.join(MODEL_CACHE_DIR, DETECTOR_KEY, "bin")
    try:
        os.makedirs(bin_dir, exist_ok=True)
        scripts = {
            # lsmod(8)-shaped output built from /proc/modules
            "lsmod": (
                "#!/bin/sh\n"
                'echo "Module                  Size  Used by"\n'
                "while read -r name size used _; do\n"
                '    printf \'%-19s %8s  %s\\n\' "$name" "$size" "$used"\n'
                "done < /proc/modules\n"
            ),
            # lspci(8)-shaped Device lines from sysfs; the runtime matches the
            # vendor:device hex pair (1f9d for Metis)
            "lspci": (
                "#!/bin/sh\n"
                "for dev in /sys/bus/pci/devices/*; do\n"
                '    [ -r "$dev/vendor" ] || continue\n'
                '    read -r vendor < "$dev/vendor"\n'
                '    read -r device < "$dev/device"\n'
                "    printf '%s Device %s:%s\\n' \"${dev##*/}\" "
                '"${vendor#0x}" "${device#0x}"\n'
                "done\n"
            ),
        }
        for name, body in scripts.items():
            if shutil.which(name) is not None:
                continue
            path = os.path.join(bin_dir, name)
            with open(path, "w") as f:
                f.write(body)
            os.chmod(path, 0o755)
        os.environ["PATH"] = bin_dir + os.pathsep + os.environ.get("PATH", "")
        logger.debug("axelera: prepended runtime tools dir %s to PATH", bin_dir)
    except OSError as exc:
        logger.warning(
            "axelera: could not install runtime enumeration helpers in %s: %s",
            bin_dir,
            exc,
        )


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
    omega = os.path.join(str(user_site()), "axelera", "omega")
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
