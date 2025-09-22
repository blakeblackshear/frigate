import json
import logging
import os
from typing import Any, List

import numpy as np
import zmq
from pydantic import Field
from typing_extensions import Literal

from frigate.comms.zmq_req_router_broker import REQ_ROUTER_ENDPOINT
from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detection_runners import ZmqIpcRunner
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
    - Model transfer/availability is handled by the runner automatically
    """

    type_key = DETECTOR_KEY

    def __init__(self, detector_config: ZmqDetectorConfig):
        super().__init__(detector_config)

        self._context = zmq.Context()
        self._endpoint = REQ_ROUTER_ENDPOINT
        self._request_timeout_ms = detector_config.request_timeout_ms
        self._linger_ms = detector_config.linger_ms
        self._socket = None
        self._create_socket()

        self._model_name = self._get_model_name()

        # Preallocate zero result for error paths
        self._zero_result = np.zeros((20, 6), np.float32)
        self._runner = ZmqIpcRunner(
            model_path=self.detector_config.model.path,
            model_type=str(self.detector_config.model.model_type.value),
            request_timeout_ms=self._request_timeout_ms,
            linger_ms=self._linger_ms,
            endpoint=self._endpoint,
        )

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

    def _build_header(self, tensor_input: np.ndarray) -> bytes:
        header: dict[str, Any] = {
            "shape": list(tensor_input.shape),
            "dtype": str(tensor_input.dtype.name),
            "model_type": str(self.detector_config.model.model_type.name),
            "model_name": self._model_name,
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
        try:
            result = self._runner.run({"input": tensor_input})
            return result if isinstance(result, np.ndarray) else self._zero_result
        except Exception as exc:  # noqa: BLE001
            logger.error(f"ZMQ IPC runner error: {exc}")
            return self._zero_result

    def __del__(self) -> None:  # pragma: no cover - best-effort cleanup
        try:
            if self._socket is not None:
                self._socket.close(linger=self.detector_config.linger_ms)
        except Exception:
            pass
