"""Outbound websocket sends must never block the thread calling publish()."""

import socket
import threading
import unittest

from frigate.comms.ws import WS_MAX_PENDING_MESSAGES, WebSocket


class _FakeSock:
    """Socket stand-in; ``block`` makes sendall hang like a client that stopped reading."""

    def __init__(self, block: bool = False) -> None:
        self.block = block
        self.released = threading.Event()
        self.shutdown_called = threading.Event()
        self.frames: list[bytes] = []

    def sendall(self, data: bytes) -> None:
        if self.block and not self.released.is_set():
            self.released.wait(timeout=10)
            raise BrokenPipeError()
        self.frames.append(data)

    def shutdown(self, how: int) -> None:
        assert how == socket.SHUT_RDWR
        self.shutdown_called.set()
        self.released.set()

    def close(self) -> None:
        pass

    def fileno(self) -> int:
        return 99


def _wait_for(predicate, timeout: float = 2.0) -> bool:
    deadline = threading.Event()
    for _ in range(int(timeout / 0.01)):
        if predicate():
            return True
        deadline.wait(0.01)
    return predicate()


class TestWebSocketSendQueue(unittest.TestCase):
    def _open(self, sock: _FakeSock) -> WebSocket:
        ws = WebSocket(sock)
        ws.opened()
        return ws

    def test_stalled_client_does_not_block_publisher(self):
        sock = _FakeSock(block=True)
        ws = self._open(sock)

        def publish_many():
            for i in range(WS_MAX_PENDING_MESSAGES + 5):
                ws.send(f"message {i}")

        publisher = threading.Thread(target=publish_many, daemon=True)
        publisher.start()
        publisher.join(timeout=2.0)

        self.assertFalse(publisher.is_alive(), "publish() blocked on a stalled client")
        self.assertTrue(
            sock.shutdown_called.wait(timeout=2.0),
            "a client that cannot keep up should be disconnected",
        )

    def test_overflow_warns_and_shuts_down_once(self):
        sock = _FakeSock(block=True)
        ws = self._open(sock)
        shutdown_calls = []
        original_shutdown = sock.shutdown
        sock.shutdown = lambda how: (shutdown_calls.append(how), original_shutdown(how))

        with self.assertLogs("frigate.comms.ws", level="WARNING") as logs:
            # keep publishing after overflow, as the dispatcher does until the
            # manager thread removes the connection
            for i in range(WS_MAX_PENDING_MESSAGES * 3):
                ws.send(f"message {i}")

        self.assertEqual(len(logs.output), 1)
        self.assertEqual(len(shutdown_calls), 1)

    def test_messages_delivered_in_order(self):
        sock = _FakeSock()
        ws = self._open(sock)
        for i in range(3):
            ws.send(f"message {i}")

        self.assertTrue(_wait_for(lambda: len(sock.frames) == 3))
        for i, frame in enumerate(sock.frames):
            self.assertIn(f"message {i}".encode(), frame)
        self.assertFalse(sock.shutdown_called.is_set())

    def test_closed_stops_writer_thread(self):
        sock = _FakeSock()
        ws = self._open(sock)
        writer = ws._writer
        ws.closed(1000, "bye")
        writer.join(timeout=2.0)
        self.assertFalse(writer.is_alive())


if __name__ == "__main__":
    unittest.main()
