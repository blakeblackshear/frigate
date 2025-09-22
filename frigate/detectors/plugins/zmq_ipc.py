import json
import logging
import os
from typing import Any, List

import numpy as np
import zmq
from pydantic import Field
from typing_extensions import Literal

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig

logger = logging.getLogger(__name__)

DETECTOR_KEY = "zmq"


class ZmqDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    endpoint: str = Field(
        default="ipc:///tmp/cache/zmq_detector", title="ZMQ IPC endpoint"
    )
    request_timeout_ms: int = Field(
        default=200, title="ZMQ request timeout in milliseconds"
    )
    linger_ms: int = Field(default=0, title="ZMQ socket linger in milliseconds")


class ZmqIpcDetector(DetectionApi):
    """
    ZMQ-based detector plugin using a REQ/REP socket over an IPC endpoint.

    Protocol:
    - Request is sent as a multipart message:
        [ header_json_bytes, tensor_bytes ]
      where header is a JSON object containing:
        {
          "shape": List[int],
          "dtype": str,  # numpy dtype string, e.g. "uint8", "float32"
        }
      tensor_bytes are the raw bytes of the numpy array in C-order.

    - Response is expected to be either:
        a) Multipart [ header_json_bytes, tensor_bytes ] with header specifying
           shape [20,6] and dtype "float32"; or
        b) Single frame tensor_bytes of length 20*6*4 bytes (float32).

    On any error or timeout, this detector returns a zero array of shape (20, 6).

    Model Management:
    - On initialization, sends model request to check if model is available
    - If model not available, sends model data via ZMQ
    - Only starts inference after model is ready
    """

    type_key = DETECTOR_KEY

    def __init__(self, detector_config: ZmqDetectorConfig):
        super().__init__(detector_config)

        self._context = zmq.Context()
        self._endpoint = detector_config.endpoint
        self._request_timeout_ms = detector_config.request_timeout_ms
        self._linger_ms = detector_config.linger_ms
        self._socket = None
        self._create_socket()

        # Model management
        self._model_ready = False
        self._model_name = self._get_model_name()

        # Initialize model if needed
        self._initialize_model()

        # Preallocate zero result for error paths
        self._zero_result = np.zeros((20, 6), np.float32)

    def _create_socket(self) -> None:
        if self._socket is not None:
            try:
                self._socket.close(linger=self._linger_ms)
            except Exception:
                pass
        self._socket = self._context.socket(zmq.REQ)
        # Apply timeouts and linger so calls don't block indefinitely
        self._socket.setsockopt(zmq.RCVTIMEO, self._request_timeout_ms)
        self._socket.setsockopt(zmq.SNDTIMEO, self._request_timeout_ms)
        self._socket.setsockopt(zmq.LINGER, self._linger_ms)

        logger.debug(f"ZMQ detector connecting to {self._endpoint}")
        self._socket.connect(self._endpoint)

    def _get_model_name(self) -> str:
        """Get the model filename from the detector config."""
        model_path = self.detector_config.model.path
        return os.path.basename(model_path)

    def _initialize_model(self) -> None:
        """Initialize the model by checking availability and transferring if needed."""
        try:
            logger.info(f"Initializing model: {self._model_name}")

            # Check if model is available and transfer if needed
            if self._check_and_transfer_model():
                logger.info(f"Model {self._model_name} is ready")
                self._model_ready = True
            else:
                logger.error(f"Failed to initialize model {self._model_name}")

        except Exception as e:
            logger.error(f"Failed to initialize model: {e}")

    def _check_and_transfer_model(self) -> bool:
        """Check if model is available and transfer if needed in one atomic operation."""
        try:
            # Send model availability request
            header = {"model_request": True, "model_name": self._model_name}
            header_bytes = json.dumps(header).encode("utf-8")

            self._socket.send_multipart([header_bytes])

            # Temporarily increase timeout for model operations
            original_timeout = self._socket.getsockopt(zmq.RCVTIMEO)
            self._socket.setsockopt(zmq.RCVTIMEO, 30000)

            try:
                response_frames = self._socket.recv_multipart()
            finally:
                self._socket.setsockopt(zmq.RCVTIMEO, original_timeout)

            if len(response_frames) == 1:
                try:
                    response = json.loads(response_frames[0].decode("utf-8"))
                    model_available = response.get("model_available", False)
                    model_loaded = response.get("model_loaded", False)

                    if model_available and model_loaded:
                        return True
                    elif model_available and not model_loaded:
                        logger.error("Model exists but failed to load")
                        return False
                    else:
                        return self._send_model_data()

                except json.JSONDecodeError:
                    logger.warning(
                        "Received non-JSON response for model availability check"
                    )
                    return False
            else:
                logger.warning(
                    "Received unexpected response format for model availability check"
                )
                return False

        except Exception as e:
            logger.error(f"Failed to check and transfer model: {e}")
            return False

    def _check_model_availability(self) -> bool:
        """Check if the model is available on the detector."""
        try:
            # Send model availability request
            header = {"model_request": True, "model_name": self._model_name}
            header_bytes = json.dumps(header).encode("utf-8")

            self._socket.send_multipart([header_bytes])

            # Receive response
            response_frames = self._socket.recv_multipart()

            # Check if this is a JSON response (model management)
            if len(response_frames) == 1:
                try:
                    response = json.loads(response_frames[0].decode("utf-8"))
                    model_available = response.get("model_available", False)
                    model_loaded = response.get("model_loaded", False)
                    logger.debug(
                        f"Model availability check: available={model_available}, loaded={model_loaded}"
                    )
                    return model_available and model_loaded
                except json.JSONDecodeError:
                    logger.warning(
                        "Received non-JSON response for model availability check"
                    )
                    return False
            else:
                logger.warning(
                    "Received unexpected response format for model availability check"
                )
                return False

        except Exception as e:
            logger.error(f"Failed to check model availability: {e}")
            return False

    def _send_model_data(self) -> bool:
        """Send model data to the detector."""
        try:
            model_path = self.detector_config.model.path

            if not os.path.exists(model_path):
                logger.error(f"Model file not found: {model_path}")
                return False

            logger.info(f"Transferring model to detector: {self._model_name}")
            with open(model_path, "rb") as f:
                model_data = f.read()

            header = {"model_data": True, "model_name": self._model_name}
            header_bytes = json.dumps(header).encode("utf-8")

            self._socket.send_multipart([header_bytes, model_data])

            # Temporarily increase timeout for model loading (can take several seconds)
            original_timeout = self._socket.getsockopt(zmq.RCVTIMEO)
            self._socket.setsockopt(zmq.RCVTIMEO, 30000)

            try:
                # Receive response
                response_frames = self._socket.recv_multipart()
            finally:
                # Restore original timeout
                self._socket.setsockopt(zmq.RCVTIMEO, original_timeout)

            # Check if this is a JSON response (model management)
            if len(response_frames) == 1:
                try:
                    response = json.loads(response_frames[0].decode("utf-8"))
                    model_saved = response.get("model_saved", False)
                    model_loaded = response.get("model_loaded", False)
                    if model_saved and model_loaded:
                        logger.info(
                            f"Model {self._model_name} transferred and loaded successfully"
                        )
                    else:
                        logger.error(
                            f"Model transfer failed: saved={model_saved}, loaded={model_loaded}"
                        )
                    return model_saved and model_loaded
                except json.JSONDecodeError:
                    logger.warning("Received non-JSON response for model data transfer")
                    return False
            else:
                logger.warning(
                    "Received unexpected response format for model data transfer"
                )
                return False

        except Exception as e:
            logger.error(f"Failed to send model data: {e}")
            return False

    def _build_header(self, tensor_input: np.ndarray) -> bytes:
        header: dict[str, Any] = {
            "shape": list(tensor_input.shape),
            "dtype": str(tensor_input.dtype.name),
            "model_type": str(self.detector_config.model.model_type.name),
        }
        return json.dumps(header).encode("utf-8")

    def _decode_response(self, frames: List[bytes]) -> np.ndarray:
        try:
            if len(frames) == 1:
                # Single-frame raw float32 (20x6)
                buf = frames[0]
                if len(buf) != 20 * 6 * 4:
                    logger.warning(
                        f"ZMQ detector received unexpected payload size: {len(buf)}"
                    )
                    return self._zero_result
                return np.frombuffer(buf, dtype=np.float32).reshape((20, 6))

            if len(frames) >= 2:
                header = json.loads(frames[0].decode("utf-8"))
                shape = tuple(header.get("shape", []))
                dtype = np.dtype(header.get("dtype", "float32"))
                return np.frombuffer(frames[1], dtype=dtype).reshape(shape)

            logger.warning("ZMQ detector received empty reply")
            return self._zero_result
        except Exception as exc:  # noqa: BLE001
            logger.error(f"ZMQ detector failed to decode response: {exc}")
            return self._zero_result

    def detect_raw(self, tensor_input: np.ndarray) -> np.ndarray:
        if not self._model_ready:
            logger.warning("Model not ready, returning zero detections")
            return self._zero_result

        try:
            header_bytes = self._build_header(tensor_input)
            payload_bytes = memoryview(tensor_input.tobytes(order="C"))

            # Send request
            self._socket.send_multipart([header_bytes, payload_bytes])

            # Receive reply
            reply_frames = self._socket.recv_multipart()
            detections = self._decode_response(reply_frames)

            # Ensure output shape and dtype are exactly as expected
            return detections
        except zmq.Again:
            # Timeout
            logger.debug("ZMQ detector request timed out; resetting socket")
            try:
                self._create_socket()
                self._initialize_model()
            except Exception:
                pass
            return self._zero_result
        except zmq.ZMQError as exc:
            logger.error(f"ZMQ detector ZMQError: {exc}; resetting socket")
            try:
                self._create_socket()
                self._initialize_model()
            except Exception:
                pass
            return self._zero_result
        except Exception as exc:  # noqa: BLE001
            logger.error(f"ZMQ detector unexpected error: {exc}")
            return self._zero_result

    def __del__(self) -> None:  # pragma: no cover - best-effort cleanup
        try:
            if self._socket is not None:
                self._socket.close(linger=self.detector_config.linger_ms)
        except Exception:
            pass
