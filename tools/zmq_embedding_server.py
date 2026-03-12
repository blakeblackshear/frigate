"""ZMQ Embedding Server — native Mac (Apple Silicon) inference service.

Runs ONNX models using hardware acceleration unavailable inside Docker on macOS,
specifically CoreML and the Apple Neural Engine.  Frigate's Docker container
connects to this server over ZMQ TCP, sends preprocessed tensors, and receives
embedding vectors back.

Supported models:
  - ArcFace  (face recognition, 512-dim output)
  - FaceNet  (face recognition, 128-dim output)
  - Jina V1/V2 vision  (semantic search, 768-dim output)

Requirements (install outside Docker, on the Mac host):
    pip install onnxruntime pyzmq numpy

Usage:
    # ArcFace face recognition (port 5556):
    python tools/zmq_embedding_server.py \\
        --model /config/model_cache/facedet/arcface.onnx \\
        --model-type arcface \\
        --port 5556

    # Jina V1 vision semantic search (port 5557):
    python tools/zmq_embedding_server.py \\
        --model /config/model_cache/jinaai/jina-clip-v1/vision_model_quantized.onnx \\
        --model-type jina_v1 \\
        --port 5557

Frigate config (docker-compose / config.yaml):
    face_recognition:
      enabled: true
      model_size: large
      device: "zmq://host.docker.internal:5556"

    semantic_search:
      enabled: true
      model_size: small
      device: "zmq://host.docker.internal:5557"

Protocol (REQ/REP):
  Request:  multipart [ header_json_bytes, tensor_bytes ]
    header = {
        "shape":      [batch, channels, height, width],  # e.g. [1, 3, 112, 112]
        "dtype":      "float32",
        "model_type": "arcface",
    }
    tensor_bytes = raw C-order numpy bytes

  Response: multipart [ header_json_bytes, embedding_bytes ]
    header = {
        "shape": [batch, embedding_dim],  # e.g. [1, 512]
        "dtype": "float32",
    }
    embedding_bytes = raw C-order numpy bytes
"""

import argparse
import json
import logging
import os
import signal
import sys
import time

import numpy as np
import zmq

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("zmq_embedding_server")


# Models that require ORT_ENABLE_BASIC optimization to avoid graph fusion issues
# (e.g. SimplifiedLayerNormFusion creates nodes that some providers can't handle).
_COMPLEX_MODELS = {"jina_v1", "jina_v2"}


# ---------------------------------------------------------------------------
# ONNX Runtime session (CoreML preferred on Apple Silicon)
# ---------------------------------------------------------------------------

def build_ort_session(model_path: str, model_type: str = ""):
    """Create an ONNX Runtime InferenceSession, preferring CoreML on macOS.

    Jina V1/V2 models use ORT_ENABLE_BASIC graph optimization to avoid
    fusion passes (e.g. SimplifiedLayerNormFusion) that produce unsupported
    nodes.  All other models use the default ORT_ENABLE_ALL.
    """
    import onnxruntime as ort

    available = ort.get_available_providers()
    logger.info(f"Available ORT providers: {available}")

    # Prefer CoreMLExecutionProvider on Apple Silicon for ANE/GPU acceleration.
    # Falls back automatically to CPUExecutionProvider if CoreML is unavailable.
    preferred = []
    if "CoreMLExecutionProvider" in available:
        preferred.append("CoreMLExecutionProvider")
        logger.info("Using CoreMLExecutionProvider (Apple Neural Engine / GPU)")
    else:
        logger.warning(
            "CoreMLExecutionProvider not available — falling back to CPU. "
            "Install onnxruntime-silicon or a CoreML-enabled onnxruntime build."
        )

    preferred.append("CPUExecutionProvider")

    sess_options = None
    if model_type in _COMPLEX_MODELS:
        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = (
            ort.GraphOptimizationLevel.ORT_ENABLE_BASIC
        )
        logger.info(f"Using ORT_ENABLE_BASIC optimization for {model_type}")

    session = ort.InferenceSession(model_path, sess_options=sess_options, providers=preferred)

    input_names = [inp.name for inp in session.get_inputs()]
    output_names = [out.name for out in session.get_outputs()]
    logger.info(f"Model loaded: inputs={input_names}, outputs={output_names}")
    return session


# ---------------------------------------------------------------------------
# Inference helpers
# ---------------------------------------------------------------------------

def run_arcface(session, tensor: np.ndarray) -> np.ndarray:
    """Run ArcFace — input (1, 3, 112, 112) float32, output (1, 512) float32."""
    outputs = session.run(None, {"data": tensor})
    return outputs[0]  # shape (1, 512)


def run_generic(session, tensor: np.ndarray) -> np.ndarray:
    """Generic single-input ONNX model runner."""
    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: tensor})
    return outputs[0]


_RUNNERS = {
    "arcface": run_arcface,
    "facenet": run_generic,
    "jina_v1": run_generic,
    "jina_v2": run_generic,
}

# Model type → input shape for warmup inference (triggers CoreML JIT compilation
# before the first real request arrives, avoiding a ZMQ timeout on cold start).
_WARMUP_SHAPES = {
    "arcface": (1, 3, 112, 112),
    "facenet": (1, 3, 160, 160),
    "jina_v1": (1, 3, 224, 224),
    "jina_v2": (1, 3, 224, 224),
}


def warmup(session, model_type: str) -> None:
    """Run a dummy inference to trigger CoreML JIT compilation."""
    shape = _WARMUP_SHAPES.get(model_type)
    if shape is None:
        return
    logger.info(f"Warming up CoreML model ({model_type})…")
    dummy = np.zeros(shape, dtype=np.float32)
    try:
        runner = _RUNNERS.get(model_type, run_generic)
        runner(session, dummy)
        logger.info("Warmup complete")
    except Exception as exc:
        logger.warning(f"Warmup failed (non-fatal): {exc}")


# ---------------------------------------------------------------------------
# ZMQ server loop
# ---------------------------------------------------------------------------

def serve(session, port: int, model_type: str) -> None:
    context = zmq.Context()
    socket = context.socket(zmq.REP)
    socket.bind(f"tcp://0.0.0.0:{port}")
    logger.info(f"Listening on tcp://0.0.0.0:{port} (model_type={model_type})")

    runner = _RUNNERS.get(model_type, run_generic)

    def _shutdown(sig, frame):
        logger.info("Shutting down…")
        socket.close(linger=0)
        context.term()
        sys.exit(0)

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    while True:
        try:
            frames = socket.recv_multipart()
        except zmq.ZMQError as exc:
            logger.error(f"recv error: {exc}")
            continue

        if len(frames) < 2:
            logger.warning(f"Received unexpected frame count: {len(frames)}, ignoring")
            socket.send_multipart([b"{}"])
            continue

        try:
            header = json.loads(frames[0].decode("utf-8"))
            shape = tuple(header["shape"])
            dtype = np.dtype(header.get("dtype", "float32"))
            tensor = np.frombuffer(frames[1], dtype=dtype).reshape(shape)
        except Exception as exc:
            logger.error(f"Failed to decode request: {exc}")
            socket.send_multipart([b"{}"])
            continue

        try:
            t0 = time.monotonic()
            embedding = runner(session, tensor)
            elapsed_ms = (time.monotonic() - t0) * 1000
            if elapsed_ms > 2000:
                logger.warning(f"slow inference {elapsed_ms:.1f}ms shape={shape}")
            resp_header = json.dumps(
                {"shape": list(embedding.shape), "dtype": str(embedding.dtype.name)}
            ).encode("utf-8")
            resp_payload = memoryview(np.ascontiguousarray(embedding).tobytes())
            socket.send_multipart([resp_header, resp_payload])
        except Exception as exc:
            logger.error(f"Inference error: {exc}")
            # Return a zero embedding so the client can degrade gracefully
            zero = np.zeros((1, 512), dtype=np.float32)
            resp_header = json.dumps(
                {"shape": list(zero.shape), "dtype": "float32"}
            ).encode("utf-8")
            socket.send_multipart([resp_header, memoryview(zero.tobytes())])


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="ZMQ Embedding Server for Frigate")
    parser.add_argument(
        "--model",
        required=True,
        help="Path to the ONNX model file (e.g. /config/model_cache/facedet/arcface.onnx)",
    )
    parser.add_argument(
        "--model-type",
        default="arcface",
        choices=list(_RUNNERS.keys()),
        help="Model type key (default: arcface)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=5556,
        help="TCP port to listen on (default: 5556)",
    )
    args = parser.parse_args()

    if not os.path.exists(args.model):
        logger.error(f"Model file not found: {args.model}")
        sys.exit(1)

    logger.info(f"Loading model: {args.model}")
    session = build_ort_session(args.model, model_type=args.model_type)
    warmup(session, model_type=args.model_type)
    serve(session, port=args.port, model_type=args.model_type)


if __name__ == "__main__":
    main()
