#!/usr/bin/env python3
"""
ZMQ TCP ONNX Runtime Client

This client connects to the ZMQ TCP proxy, accepts tensor inputs,
runs inference via ONNX Runtime, and returns detection results.

Protocol:
- Receives multipart messages: [header_json_bytes, tensor_bytes]
- Header contains shape and dtype information
- Runs ONNX inference on the tensor
- Returns results in the expected format: [20, 6] float32 array

Note: Timeouts are normal when Frigate has no motion to detect.
The server will continue running and waiting for requests.
"""

import json
import logging
import os
import threading
import time
from typing import Dict, List, Optional, Tuple

import numpy as np
import onnxruntime as ort
import zmq
from model_util import post_process_dfine, post_process_rfdetr, post_process_yolo

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class ZmqOnnxWorker(threading.Thread):
    """
    A worker thread that connects a REP socket to the endpoint and processes
    requests using a shared model session map. This mirrors the single-runner
    logic, but the ONNX Runtime session is fetched from the shared map, and
    created on-demand if missing.
    """

    def __init__(
        self,
        worker_id: int,
        context: zmq.Context,
        endpoint: str,
        models_dir: str,
        model_sessions: Dict[str, ort.InferenceSession],
        model_lock: threading.Lock,
        providers: Optional[List[str]],
        zero_result: np.ndarray,
    ) -> None:
        super().__init__(name=f"onnx_worker_{worker_id}", daemon=True)
        self.worker_id = worker_id
        self.context = context
        self.endpoint = self._normalize_endpoint(endpoint)
        self.models_dir = models_dir
        self.model_sessions = model_sessions
        self.model_lock = model_lock
        self.providers = providers
        self.zero_result = zero_result
        self.socket: Optional[zmq.Socket] = None

    def _normalize_endpoint(self, endpoint: str) -> str:
        if endpoint.startswith("tcp://*:"):
            port = endpoint.split(":", 2)[-1]
            return f"tcp://127.0.0.1:{port}"
        return endpoint

    # --- ZMQ helpers ---
    def _create_socket(self) -> zmq.Socket:
        sock = self.context.socket(zmq.REP)
        sock.setsockopt(zmq.RCVTIMEO, 5000)
        sock.setsockopt(zmq.SNDTIMEO, 5000)
        sock.setsockopt(zmq.LINGER, 0)
        sock.connect(self.endpoint)
        return sock

    def _decode_request(self, frames: List[bytes]) -> Tuple[Optional[np.ndarray], dict]:
        if len(frames) < 1:
            raise ValueError(f"Expected at least 1 frame, got {len(frames)}")

        header_bytes = frames[0]
        header = json.loads(header_bytes.decode("utf-8"))

        if "model_request" in header:
            return None, header
        if "model_data" in header:
            return None, header
        if len(frames) < 2:
            raise ValueError(f"Tensor request expected 2 frames, got {len(frames)}")

        tensor_bytes = frames[1]
        shape = tuple(header.get("shape", []))
        dtype_str = header.get("dtype", "uint8")

        dtype = np.dtype(dtype_str)
        tensor = np.frombuffer(tensor_bytes, dtype=dtype).reshape(shape)
        return tensor, header

    def _build_response(self, result: np.ndarray) -> List[bytes]:
        header = {
            "shape": list(result.shape),
            "dtype": str(result.dtype.name),
            "timestamp": time.time(),
        }
        return [json.dumps(header).encode("utf-8"), result.tobytes(order="C")]

    def _build_error_response(self, error_msg: str) -> List[bytes]:
        error_header = {"shape": [20, 6], "dtype": "float32", "error": error_msg}
        return [
            json.dumps(error_header).encode("utf-8"),
            self.zero_result.tobytes(order="C"),
        ]

    # --- Model/session helpers ---
    def _check_model_exists(self, model_name: str) -> bool:
        return os.path.exists(os.path.join(self.models_dir, model_name))

    def _save_model(self, model_name: str, model_data: bytes) -> bool:
        try:
            os.makedirs(self.models_dir, exist_ok=True)
            with open(os.path.join(self.models_dir, model_name), "wb") as f:
                f.write(model_data)
            return True
        except Exception as e:
            logger.error(
                f"Worker {self.worker_id} failed to save model {model_name}: {e}"
            )
            return False

    def _get_or_create_session(self, model_name: str) -> Optional[ort.InferenceSession]:
        with self.model_lock:
            session = self.model_sessions.get(model_name)
            if session is not None:
                return session
            try:
                providers = self.providers or ["CoreMLExecutionProvider"]
                session = ort.InferenceSession(
                    os.path.join(self.models_dir, model_name), providers=providers
                )
                self.model_sessions[model_name] = session
                return session
            except Exception as e:
                logger.error(
                    f"Worker {self.worker_id} failed to load model {model_name}: {e}"
                )
                return None

    # --- Inference helpers ---
    def _extract_input_hw(self, header: dict) -> Tuple[int, int]:
        try:
            if "width" in header and "height" in header:
                return int(header["width"]), int(header["height"])
            shape = tuple(header.get("shape", []))
            layout = header.get("layout") or header.get("order")
            if layout and shape:
                layout = str(layout).upper()
                if len(shape) == 4:
                    if layout == "NCHW":
                        return int(shape[3]), int(shape[2])
                    if layout == "NHWC":
                        return int(shape[2]), int(shape[1])
                if len(shape) == 3:
                    if layout == "CHW":
                        return int(shape[2]), int(shape[1])
                    if layout == "HWC":
                        return int(shape[1]), int(shape[0])
            if shape:
                if len(shape) == 4:
                    _, d1, d2, d3 = shape
                    if d1 in (1, 3):
                        return int(d3), int(d2)
                    if d3 in (1, 3):
                        return int(d2), int(d1)
                    return int(d2), int(d1)
                if len(shape) == 3:
                    d0, d1, d2 = shape
                    if d0 in (1, 3):
                        return int(d2), int(d1)
                    if d2 in (1, 3):
                        return int(d1), int(d0)
                    return int(d1), int(d0)
                if len(shape) == 2:
                    h, w = shape
                    return int(w), int(h)
        except Exception:
            pass
        return 320, 320

    def _run_inference(
        self, session: ort.InferenceSession, tensor: np.ndarray, header: dict
    ) -> np.ndarray:
        try:
            model_type = header.get("model_type")
            width, height = self._extract_input_hw(header)

            if model_type == "dfine":
                input_data = {
                    "images": tensor.astype(np.float32),
                    "orig_target_sizes": np.array([[height, width]], dtype=np.int64),
                }
            else:
                input_name = session.get_inputs()[0].name
                input_data = {input_name: tensor}

            if logger.isEnabledFor(logging.DEBUG):
                t_start = time.perf_counter()

            outputs = session.run(None, input_data)

            if logger.isEnabledFor(logging.DEBUG):
                t_after_onnx = time.perf_counter()

            if model_type == "yolo-generic" or model_type == "yologeneric":
                result = post_process_yolo(outputs, width, height)
            elif model_type == "dfine":
                result = post_process_dfine(outputs, width, height)
            elif model_type == "rfdetr":
                result = post_process_rfdetr(outputs)
            else:
                result = np.zeros((20, 6), dtype=np.float32)

            if logger.isEnabledFor(logging.DEBUG):
                t_after_post = time.perf_counter()
                onnx_ms = (t_after_onnx - t_start) * 1000.0
                post_ms = (t_after_post - t_after_onnx) * 1000.0
                total_ms = (t_after_post - t_start) * 1000.0
                logger.debug(
                    f"Worker {self.worker_id} timing: onnx={onnx_ms:.2f}ms, post={post_ms:.2f}ms, total={total_ms:.2f}ms"
                )

            return result.astype(np.float32)
        except Exception as e:
            logger.error(f"Worker {self.worker_id} ONNX inference failed: {e}")
            return self.zero_result

    # --- Message handlers ---
    def _handle_model_request(self, header: dict) -> List[bytes]:
        model_name = header.get("model_name")
        if not model_name:
            return self._build_error_response("Model request missing model_name")
        if self._check_model_exists(model_name):
            # Ensure session exists
            if self._get_or_create_session(model_name) is not None:
                response_header = {
                    "model_available": True,
                    "model_loaded": True,
                    "model_name": model_name,
                    "message": f"Model {model_name} loaded successfully",
                }
            else:
                response_header = {
                    "model_available": True,
                    "model_loaded": False,
                    "model_name": model_name,
                    "message": f"Model {model_name} exists but failed to load",
                }
        else:
            response_header = {
                "model_available": False,
                "model_name": model_name,
                "message": f"Model {model_name} not found, please send model data",
            }
        return [json.dumps(response_header).encode("utf-8")]

    def _handle_model_data(self, header: dict, model_data: bytes) -> List[bytes]:
        model_name = header.get("model_name")
        if not model_name:
            return self._build_error_response("Model data missing model_name")
        if self._save_model(model_name, model_data):
            # Ensure session is created
            if self._get_or_create_session(model_name) is not None:
                response_header = {
                    "model_saved": True,
                    "model_loaded": True,
                    "model_name": model_name,
                    "message": f"Model {model_name} saved and loaded successfully",
                }
            else:
                response_header = {
                    "model_saved": True,
                    "model_loaded": False,
                    "model_name": model_name,
                    "message": f"Model {model_name} saved but failed to load",
                }
        else:
            response_header = {
                "model_saved": False,
                "model_loaded": False,
                "model_name": model_name,
                "message": f"Failed to save model {model_name}",
            }
        return [json.dumps(response_header).encode("utf-8")]

    # --- Thread run ---
    def run(self) -> None:  # pragma: no cover - runtime loop
        try:
            self.socket = self._create_socket()
            logger.info(
                f"Worker {self.worker_id} connected REP to endpoint: {self.endpoint}"
            )
            while True:
                try:
                    frames = self.socket.recv_multipart()
                    tensor, header = self._decode_request(frames)

                    if "model_request" in header:
                        response = self._handle_model_request(header)
                        self.socket.send_multipart(response)
                        continue
                    if "model_data" in header and len(frames) >= 2:
                        model_data = frames[1]
                        response = self._handle_model_data(header, model_data)
                        self.socket.send_multipart(response)
                        continue
                    if tensor is not None:
                        model_name = header.get("model_name")
                        session = None
                        if model_name:
                            session = self._get_or_create_session(model_name)
                        if session is None:
                            result = self.zero_result
                        else:
                            result = self._run_inference(session, tensor, header)
                        self.socket.send_multipart(self._build_response(result))
                        continue

                    # Unknown message: reply with zeros
                    self.socket.send_multipart(self._build_response(self.zero_result))
                except zmq.Again:
                    continue
                except zmq.ZMQError as e:
                    logger.error(f"Worker {self.worker_id} ZMQ error: {e}")
                    # Recreate socket on transient errors
                    try:
                        if self.socket:
                            self.socket.close(linger=0)
                    finally:
                        self.socket = self._create_socket()
                except Exception as e:
                    logger.error(f"Worker {self.worker_id} unexpected error: {e}")
                    try:
                        self.socket.send_multipart(self._build_error_response(str(e)))
                    except Exception:
                        pass
        finally:
            try:
                if self.socket:
                    self.socket.close(linger=0)
            except Exception:
                pass


class ZmqOnnxClient:
    """
    ZMQ TCP client that runs ONNX inference on received tensors.
    """

    def __init__(
        self,
        endpoint: str = "tcp://*:5555",
        model_path: Optional[str] = "AUTO",
        providers: Optional[List[str]] = None,
        session_options: Optional[ort.SessionOptions] = None,
    ):
        """
        Initialize the ZMQ ONNX client.

        Args:
            endpoint: ZMQ IPC endpoint to bind to
            model_path: Path to ONNX model file or "AUTO" for automatic model management
            providers: ONNX Runtime execution providers
            session_options: ONNX Runtime session options
        """
        self.endpoint = endpoint
        self.model_path = model_path
        self.current_model = None
        self.model_ready = False
        self.models_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "models"
        )

        # Shared ZMQ context and shared session map across workers
        self.context = zmq.Context()
        self.model_sessions: Dict[str, ort.InferenceSession] = {}
        self.model_lock = threading.Lock()
        self.providers = providers

        # Preallocate zero result for error cases
        self.zero_result = np.zeros((20, 6), dtype=np.float32)

        logger.info(f"ZMQ ONNX client will start workers on endpoint: {endpoint}")

    def start_server(self, num_workers: int = 4) -> None:
        workers: list[ZmqOnnxWorker] = []
        for i in range(num_workers):
            w = ZmqOnnxWorker(
                worker_id=i,
                context=self.context,
                endpoint=self.endpoint,
                models_dir=self.models_dir,
                model_sessions=self.model_sessions,
                model_lock=self.model_lock,
                providers=self.providers,
                zero_result=self.zero_result,
            )
            w.start()
            workers.append(w)
        logger.info(f"Started {num_workers} ZMQ REP workers on backend {self.endpoint}")
        try:
            for w in workers:
                w.join()
        except KeyboardInterrupt:
            logger.info("Shutting down workers...")

    def _check_model_exists(self, model_name: str) -> bool:
        """
        Check if a model exists in the models directory.

        Args:
            model_name: Name of the model file to check

        Returns:
            True if model exists, False otherwise
        """
        model_path = os.path.join(self.models_dir, model_name)
        return os.path.exists(model_path)

    # These methods remain for compatibility but are unused in worker mode

    def _save_model(self, model_name: str, model_data: bytes) -> bool:
        """
        Save model data to the models directory.

        Args:
            model_name: Name of the model file to save
            model_data: Binary model data

        Returns:
            True if model saved successfully, False otherwise
        """
        try:
            # Ensure models directory exists
            os.makedirs(self.models_dir, exist_ok=True)

            model_path = os.path.join(self.models_dir, model_name)
            logger.info(f"Saving model to: {model_path}")

            with open(model_path, "wb") as f:
                f.write(model_data)

            logger.info(f"Model saved successfully: {model_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to save model {model_name}: {e}")
            return False

    def _decode_request(self, frames: List[bytes]) -> Tuple[np.ndarray, dict]:
        """
        Decode the incoming request frames.

        Args:
            frames: List of message frames

        Returns:
            Tuple of (tensor, header_dict)
        """
        try:
            if len(frames) < 1:
                raise ValueError(f"Expected at least 1 frame, got {len(frames)}")

            # Parse header
            header_bytes = frames[0]
            header = json.loads(header_bytes.decode("utf-8"))

            if "model_request" in header:
                return None, header

            if "model_data" in header:
                if len(frames) < 2:
                    raise ValueError(
                        f"Model data request expected 2 frames, got {len(frames)}"
                    )
                return None, header

            if len(frames) < 2:
                raise ValueError(f"Tensor request expected 2 frames, got {len(frames)}")

            tensor_bytes = frames[1]
            shape = tuple(header.get("shape", []))
            dtype_str = header.get("dtype", "uint8")

            dtype = np.dtype(dtype_str)
            tensor = np.frombuffer(tensor_bytes, dtype=dtype).reshape(shape)
            return tensor, header

        except Exception as e:
            logger.error(f"Failed to decode request: {e}")
            raise

    def _run_inference(self, tensor: np.ndarray, header: dict) -> np.ndarray:
        """
        Run ONNX inference on the input tensor.

        Args:
            tensor: Input tensor
            header: Request header containing metadata (e.g., shape, layout)

        Returns:
            Detection results as numpy array

        Raises:
            RuntimeError: If no ONNX session is available or inference fails
        """
        if self.session is None:
            logger.warning("No ONNX session available, returning zero results")
            return self.zero_result

        try:
            # Prepare input for ONNX Runtime
            # Determine input spatial size (W, H) from header/shape/layout
            model_type = header.get("model_type")
            width, height = self._extract_input_hw(header)

            if model_type == "dfine":
                # DFine model requires both images and orig_target_sizes inputs
                input_data = {
                    "images": tensor.astype(np.float32),
                    "orig_target_sizes": np.array([[height, width]], dtype=np.int64),
                }
            else:
                # Other models use single input
                input_name = self.session.get_inputs()[0].name
                input_data = {input_name: tensor}

            # Run inference
            if logger.isEnabledFor(logging.DEBUG):
                t_start = time.perf_counter()

            outputs = self.session.run(None, input_data)

            if logger.isEnabledFor(logging.DEBUG):
                t_after_onnx = time.perf_counter()

            if model_type == "yolo-generic" or model_type == "yologeneric":
                result = post_process_yolo(outputs, width, height)
            elif model_type == "dfine":
                result = post_process_dfine(outputs, width, height)
            elif model_type == "rfdetr":
                result = post_process_rfdetr(outputs)

            if logger.isEnabledFor(logging.DEBUG):
                t_after_post = time.perf_counter()
                onnx_ms = (t_after_onnx - t_start) * 1000.0
                post_ms = (t_after_post - t_after_onnx) * 1000.0
                total_ms = (t_after_post - t_start) * 1000.0
                logger.debug(
                    f"Inference timing: onnx={onnx_ms:.2f}ms, post={post_ms:.2f}ms, total={total_ms:.2f}ms"
                )

            # Ensure float32 dtype
            result = result.astype(np.float32)

            return result

        except Exception as e:
            logger.error(f"ONNX inference failed: {e}")
            return self.zero_result

    def _extract_input_hw(self, header: dict) -> Tuple[int, int]:
        """
        Extract (width, height) from the header and/or tensor shape, supporting
        NHWC/NCHW as well as 3D/4D inputs. Falls back to 320x320 if unknown.

        Preference order:
        1) Explicit header keys: width/height
        2) Use provided layout to interpret shape
        3) Heuristics on shape
        """
        try:
            if "width" in header and "height" in header:
                return int(header["width"]), int(header["height"])

            shape = tuple(header.get("shape", []))
            layout = header.get("layout") or header.get("order")

            if layout and shape:
                layout = str(layout).upper()
                if len(shape) == 4:
                    if layout == "NCHW":
                        return int(shape[3]), int(shape[2])
                    if layout == "NHWC":
                        return int(shape[2]), int(shape[1])
                if len(shape) == 3:
                    if layout == "CHW":
                        return int(shape[2]), int(shape[1])
                    if layout == "HWC":
                        return int(shape[1]), int(shape[0])

            if shape:
                if len(shape) == 4:
                    _, d1, d2, d3 = shape
                    if d1 in (1, 3):
                        return int(d3), int(d2)
                    if d3 in (1, 3):
                        return int(d2), int(d1)
                    return int(d2), int(d1)
                if len(shape) == 3:
                    d0, d1, d2 = shape
                    if d0 in (1, 3):
                        return int(d2), int(d1)
                    if d2 in (1, 3):
                        return int(d1), int(d0)
                    return int(d1), int(d0)
                if len(shape) == 2:
                    h, w = shape
                    return int(w), int(h)
        except Exception as e:
            logger.debug(f"Failed to extract input size from header: {e}")

        logger.debug("Falling back to default input size (320x320)")
        return 320, 320

    def _build_response(self, result: np.ndarray) -> List[bytes]:
        """
        Build the response message.

        Args:
            result: Detection results

        Returns:
            List of response frames
        """
        try:
            # Build header
            header = {
                "shape": list(result.shape),
                "dtype": str(result.dtype.name),
                "timestamp": time.time(),
            }
            header_bytes = json.dumps(header).encode("utf-8")

            # Convert result to bytes
            result_bytes = result.tobytes(order="C")

            return [header_bytes, result_bytes]

        except Exception as e:
            logger.error(f"Failed to build response: {e}")
            # Return zero result as fallback
            header = {
                "shape": [20, 6],
                "dtype": "float32",
                "error": "Failed to build response",
            }
            header_bytes = json.dumps(header).encode("utf-8")
            result_bytes = self.zero_result.tobytes(order="C")
            return [header_bytes, result_bytes]

    def _handle_model_request(self, header: dict) -> List[bytes]:
        """
        Handle model availability request.

        Args:
            header: Request header containing model information

        Returns:
            Response message indicating model availability
        """
        model_name = header.get("model_name")

        if not model_name:
            logger.error("Model request missing model_name")
            return self._build_error_response("Model request missing model_name")

        logger.info(f"Model availability request for: {model_name}")

        if self._check_model_exists(model_name):
            logger.info(f"Model {model_name} exists locally")
            # Try to load the model
            if self._load_model(model_name):
                response_header = {
                    "model_available": True,
                    "model_loaded": True,
                    "model_name": model_name,
                    "message": f"Model {model_name} loaded successfully",
                }
            else:
                response_header = {
                    "model_available": True,
                    "model_loaded": False,
                    "model_name": model_name,
                    "message": f"Model {model_name} exists but failed to load",
                }
        else:
            logger.info(f"Model {model_name} not found, requesting transfer")
            response_header = {
                "model_available": False,
                "model_name": model_name,
                "message": f"Model {model_name} not found, please send model data",
            }

        return [json.dumps(response_header).encode("utf-8")]

    def _handle_model_data(self, header: dict, model_data: bytes) -> List[bytes]:
        """
        Handle model data transfer.

        Args:
            header: Request header containing model information
            model_data: Binary model data

        Returns:
            Response message indicating save success/failure
        """
        model_name = header.get("model_name")

        if not model_name:
            logger.error("Model data missing model_name")
            return self._build_error_response("Model data missing model_name")

        logger.info(f"Received model data for: {model_name}")

        if self._save_model(model_name, model_data):
            # Try to load the model
            if self._load_model(model_name):
                response_header = {
                    "model_saved": True,
                    "model_loaded": True,
                    "model_name": model_name,
                    "message": f"Model {model_name} saved and loaded successfully",
                }
            else:
                response_header = {
                    "model_saved": True,
                    "model_loaded": False,
                    "model_name": model_name,
                    "message": f"Model {model_name} saved but failed to load",
                }
        else:
            response_header = {
                "model_saved": False,
                "model_loaded": False,
                "model_name": model_name,
                "message": f"Failed to save model {model_name}",
            }

        return [json.dumps(response_header).encode("utf-8")]

    def _build_error_response(self, error_msg: str) -> List[bytes]:
        """Build an error response message."""
        error_header = {"error": error_msg}
        return [json.dumps(error_header).encode("utf-8")]

    # Removed legacy single-thread start_server implementation in favor of worker pool

    def _send_error_response(self, error_msg: str):
        """Send an error response to the client."""
        try:
            error_header = {"shape": [20, 6], "dtype": "float32", "error": error_msg}
            error_response = [
                json.dumps(error_header).encode("utf-8"),
                self.zero_result.tobytes(order="C"),
            ]
            self.socket.send_multipart(error_response)
        except Exception as send_error:
            logger.error(f"Failed to send error response: {send_error}")

    def cleanup(self):
        """Clean up resources."""
        try:
            if self.socket:
                self.socket.close()
                self.socket = None
            if self.context:
                self.context.term()
                self.context = None
            logger.info("Cleanup completed")
        except Exception as e:
            logger.error(f"Cleanup error: {e}")


def main():
    """Main function to run the ZMQ ONNX client."""
    import argparse

    parser = argparse.ArgumentParser(description="ZMQ TCP ONNX Runtime Client")
    parser.add_argument(
        "--endpoint",
        default="tcp://*:5555",
        help="ZMQ TCP endpoint (default: tcp://*:5555)",
    )
    parser.add_argument(
        "--model",
        default="AUTO",
        help="Path to ONNX model file or AUTO for automatic model management",
    )
    parser.add_argument(
        "--providers",
        nargs="+",
        default=["CoreMLExecutionProvider"],
        help="ONNX Runtime execution providers",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=4,
        help="Number of REP worker threads",
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Enable verbose logging"
    )

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Create and start client
    client = ZmqOnnxClient(
        endpoint=args.endpoint, model_path=args.model, providers=args.providers
    )

    try:
        client.start_server(num_workers=args.workers)
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    finally:
        client.cleanup()


if __name__ == "__main__":
    main()
