"""Tests for sharing one zmq socket wrapper across threads."""

import os
import random
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

import zmq

from frigate.comms import config_updater, embeddings_updater, inter_process
from frigate.comms.config_updater import ConfigPublisher, ConfigSubscriber
from frigate.comms.embeddings_updater import EmbeddingsRequestor
from frigate.comms.inter_process import InterProcessRequestor
from frigate.comms.webpush import WebPushClient

THREADS = 8
CALLS = 100

# nothing reads until the end, so the total stays under the default zmq HWM
PUBLISH_CALLS = 100


class TestSharedRequestor(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.address = f"ipc://{os.path.join(self.tmp.name, 'comms')}"
        self.stop = threading.Event()
        self.context = zmq.Context()
        self.responder = self.context.socket(zmq.REP)
        self.responder.bind(self.address)
        self.responder_thread = threading.Thread(target=self._respond)
        self.responder_thread.start()

    def tearDown(self) -> None:
        self.stop.set()
        self.responder_thread.join()
        self.responder.close(linger=0)
        self.context.destroy(linger=0)
        self.tmp.cleanup()

    def _respond(self) -> None:
        while not self.stop.is_set():
            ready, _, _ = zmq.select([self.responder], [], [], 0.1)

            if ready:
                self.responder.recv_json()
                time.sleep(random.uniform(0, 0.002))
                self.responder.send_json(["ok"])

    def _call_from_threads(self, requestor) -> list:
        results: list = []

        def call() -> None:
            for _ in range(CALLS):
                # jitter lands some calls on the instant another reply arrives
                time.sleep(random.uniform(0, 0.002))
                results.append(requestor.send_data("topic", {"key": "value"}))

        threads = [threading.Thread(target=call, daemon=True) for _ in range(THREADS)]

        for thread in threads:
            thread.start()

        for thread in threads:
            thread.join(30)

        self.assertFalse(any(thread.is_alive() for thread in threads))
        return results

    def test_inter_process_requestor_waits_for_overlapping_calls(self) -> None:
        with patch.object(inter_process, "SOCKET_REP_REQ", self.address):
            requestor = InterProcessRequestor()

        results = self._call_from_threads(requestor)
        self.assertEqual(results, [["ok"]] * THREADS * CALLS)
        requestor.stop()

    def test_embeddings_requestor_survives_overlapping_calls(self) -> None:
        with patch.object(embeddings_updater, "SOCKET_REP_REQ", self.address):
            requestor = EmbeddingsRequestor()

        # an overlapping call may fail fast, but the socket has to stay usable
        results = self._call_from_threads(requestor)
        self.assertEqual(len(results), THREADS * CALLS)
        self.assertEqual(requestor.send_data("topic", {}), ["ok"])
        requestor.stop()


class TestSharedConfigPublisher(unittest.TestCase):
    def test_frames_stay_paired_across_threads(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            address = f"ipc://{os.path.join(tmp, 'config')}"

            with patch.object(config_updater, "SOCKET_PUB_SUB", address):
                publisher = ConfigPublisher()
                subscriber = ConfigSubscriber("config/")

            # a subscription that is still connecting drops messages
            subscriber.socket.setsockopt(zmq.RCVTIMEO, 5000)

            while True:
                publisher.publish("config/ready", None)

                if zmq.select([subscriber.socket], [], [], 0.05)[0]:
                    break

            def publish(index: int) -> None:
                topic = f"config/cameras/camera_{index}"

                for _ in range(PUBLISH_CALLS):
                    publisher.publish(topic, topic)

            threads = [
                threading.Thread(target=publish, args=(i,)) for i in range(THREADS)
            ]

            for thread in threads:
                thread.start()

            for thread in threads:
                thread.join()

            publisher.publish("config/done", None)
            received = 0

            while True:
                topic = subscriber.socket.recv_string()
                payload = subscriber.socket.recv_pyobj()

                if topic == "config/done":
                    break

                if topic != "config/ready":
                    self.assertEqual(topic, payload)
                    received += 1

            self.assertEqual(received, THREADS * PUBLISH_CALLS)
            subscriber.stop()
            publisher.stop()


class FakeConfigSubscriber:
    """Records whether two threads read at the same time."""

    def __init__(self) -> None:
        self.reading = threading.Lock()
        self.overlapped = False

    def _read(self) -> None:
        if not self.reading.acquire(blocking=False):
            self.overlapped = True
            return

        time.sleep(0.001)
        self.reading.release()

    def check_for_update(self) -> tuple[None, None]:
        self._read()
        return (None, None)

    def check_for_updates(self) -> dict:
        self._read()
        return {}


class TestSharedWebPushClient(unittest.TestCase):
    def test_config_subscribers_read_by_one_thread_at_a_time(self) -> None:
        client = WebPushClient.__new__(WebPushClient)
        client.config_lock = threading.Lock()
        client.global_config_subscriber = FakeConfigSubscriber()
        client.config_subscriber = FakeConfigSubscriber()

        def publish() -> None:
            for _ in range(20):
                client.publish("topic", "payload")

        threads = [threading.Thread(target=publish) for _ in range(THREADS)]

        for thread in threads:
            thread.start()

        for thread in threads:
            thread.join()

        self.assertFalse(client.global_config_subscriber.overlapped)
        self.assertFalse(client.config_subscriber.overlapped)


if __name__ == "__main__":
    unittest.main()
