import json
import unittest
from unittest.mock import MagicMock, patch

import numpy as np
import zmq
from pydantic import TypeAdapter

import frigate.object_detection.base
from frigate.config import DetectorConfig

DETECTIONS = [np.zeros((20, 6), np.float32).tobytes()]


def handshake(**extra):
    return [
        json.dumps({"model_available": True, "model_loaded": True, **extra}).encode()
    ]


class TestZmqInputTransformOffload(unittest.TestCase):
    """The handshake decides whether Frigate applies the input transform.

    The model is configured nchw/float, so the two paths are distinguishable
    from the header alone: transformed frames go over as float32 NCHW,
    untransformed ones as the uint8 NHWC they were captured in.
    """

    def _headers(self, replies, frames=1):
        """Drive a detector through `replies`, return the inference headers."""
        socket = MagicMock()
        socket.recv_multipart.side_effect = replies

        with patch("zmq.Context") as context:
            context.return_value.socket.return_value = socket
            config = TypeAdapter(DetectorConfig).validate_python(
                {
                    "type": "zmq",
                    "model": {
                        "path": "/test/model.onnx",
                        "input_tensor": "nchw",
                        "input_dtype": "float",
                    },
                }
            )
            detector = frigate.object_detection.base.LocalObjectDetector(
                detector_config=config
            )
            frame = np.zeros(
                (1, config.model.height, config.model.width, 3), dtype=np.uint8
            )
            for _ in range(frames):
                detector.detect_raw(frame)

        # send_multipart also carries the handshakes, which are a single frame
        return [
            json.loads(call[0][0][0].decode())
            for call in socket.send_multipart.call_args_list
            if len(call[0][0]) == 2
        ]

    def test_handshake_decides_the_transform(self):
        for reported, dtype, axis, declared in (
            ({"input_transform_offload": True}, "uint8", 3, True),
            ({"input_transform_offload": False}, "float32", 1, False),
            ({}, "float32", 1, False),
        ):
            with self.subTest(handshake=reported):
                (header,) = self._headers([handshake(**reported), DETECTIONS])
                self.assertEqual(header["dtype"], dtype)
                self.assertEqual(header["shape"][axis], 3)
                self.assertEqual("input_tensor" in header, declared)
                if declared:
                    self.assertEqual(header["input_tensor"], "nchw")
                    self.assertEqual(header["input_dtype"], "float")

    def test_transform_follows_a_detector_upgraded_mid_run(self):
        """The detector redoes its handshake on a reconnect, so the transform
        choice follows it rather than being fixed when Frigate starts."""
        before, after = self._headers(
            [
                handshake(),
                zmq.Again(),  # times out, prompting a reconnect
                handshake(input_transform_offload=True),
                DETECTIONS,
            ],
            frames=2,
        )
        self.assertEqual(before["dtype"], "float32")
        self.assertNotIn("input_tensor", before)
        self.assertEqual(after["dtype"], "uint8")
        self.assertEqual(after["input_tensor"], "nchw")


if __name__ == "__main__":
    unittest.main()
