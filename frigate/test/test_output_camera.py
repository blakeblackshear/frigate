"""Tests for the jsmpeg BroadcastThread.

Regression coverage for a client closing while the broadcast loop is between
the `terminated` check and the send, which used to raise out of run() and
silently stop jsmpeg live view for the camera until restart. See
https://github.com/blakeblackshear/frigate/pull/24225
"""

import threading
import unittest
from types import SimpleNamespace

from frigate.config import FrigateConfig
from frigate.output.camera import BroadcastThread


class FakeConverter:
    """Yields one buffer, then reports the ffmpeg process as exited."""

    def __init__(self, buf: bytes):
        self.bufs = [buf]
        self.process = SimpleNamespace(poll=lambda: 0)

    def read(self, _size: int) -> bytes:
        return self.bufs.pop(0) if self.bufs else b""


class FakeWebSocket:
    def __init__(self, camera: str, error: Exception | None = None):
        self.terminated = False
        self.environ: dict[str, str] | None = {
            "PATH_INFO": f"/{camera}",
            "HTTP_REMOTE_ROLE": "admin",
        }
        self.error = error
        self.sent: list[bytes] = []

    def send(self, payload: bytes, binary: bool = False) -> None:
        if self.error is not None:
            raise self.error
        self.sent.append(payload)


class TestBroadcastThread(unittest.TestCase):
    def setUp(self):
        self.config = FrigateConfig(
            mqtt={"host": "mqtt"},
            cameras={
                "front_door": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {"height": 1080, "width": 1920, "fps": 5},
                }
            },
        )

    def _broadcast(self, *websockets: FakeWebSocket) -> BroadcastThread:
        server = SimpleNamespace(
            manager=SimpleNamespace(
                lock=threading.Lock(),
                websockets={id(ws): ws for ws in websockets},
            )
        )
        return BroadcastThread(
            "front_door",
            FakeConverter(b"frame"),
            server,
            threading.Event(),
            self.config,
        )

    def _assert_broadcast_survives(self, closing: FakeWebSocket) -> None:
        # The closing client comes first so the loop hits it before the
        # healthy one. run() rather than start() so an escaping exception
        # fails the test instead of being swallowed by the thread.
        healthy = FakeWebSocket("front_door")

        self._broadcast(closing, healthy).run()

        self.assertEqual(closing.sent, [])
        self.assertEqual(healthy.sent, [b"frame"])

    # ws4py's terminate() runs on the manager thread and, after setting the
    # terminated flags, closes the socket and clears `stream` and `environ`.
    # A client that closes while the broadcast loop is between the
    # `terminated` check and the send therefore raises one of several
    # exceptions, depending on where terminate() has got to.

    def test_client_terminated_before_send(self):
        self._assert_broadcast_survives(
            FakeWebSocket(
                "front_door", RuntimeError("Cannot send on a terminated websocket")
            )
        )

    def test_client_stream_cleared_before_send(self):
        self._assert_broadcast_survives(
            FakeWebSocket(
                "front_door",
                AttributeError("'NoneType' object has no attribute 'binary_message'"),
            )
        )

    def test_client_environ_cleared_before_path_check(self):
        closing = FakeWebSocket("front_door")
        closing.environ = None
        self._assert_broadcast_survives(closing)

    def test_frame_goes_only_to_matching_camera(self):
        front = FakeWebSocket("front_door")
        back = FakeWebSocket("back_door")

        self._broadcast(front, back).run()

        self.assertEqual(front.sent, [b"frame"])
        self.assertEqual(back.sent, [])
