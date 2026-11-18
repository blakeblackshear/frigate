"""Tests for the detection subscriber's default receive timeout."""

import json
import os
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

import zmq

from frigate.comms import zmq_proxy
from frigate.comms.detections_updater import DetectionSubscriber, DetectionTypeEnum


class TestDetectionSubscriberTimeout(unittest.TestCase):
    def setUp(self) -> None:
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.address = f"ipc://{os.path.join(tmp.name, 'proxy_sub')}"

    def _subscriber(self) -> DetectionSubscriber:
        with patch.object(zmq_proxy, "SOCKET_SUB", self.address):
            return DetectionSubscriber(DetectionTypeEnum.video.value)

    def test_default_check_returns_when_nothing_is_published(self) -> None:
        subscriber = self._subscriber()
        results: list = []
        thread = threading.Thread(
            target=lambda: results.append(subscriber.check_for_update()),
            daemon=True,
        )
        thread.start()
        thread.join(timeout=5)

        # a blocked check still owns the socket, so only stop it after returning
        self.assertFalse(
            thread.is_alive(), "check_for_update blocked with nothing published"
        )
        subscriber.stop()
        self.assertEqual(results, [(None, None)])

    def test_default_check_returns_queued_detection(self) -> None:
        context = zmq.Context()
        publisher = context.socket(zmq.PUB)
        publisher.bind(self.address)
        subscriber = self._subscriber()
        self.addCleanup(context.destroy, linger=0)
        self.addCleanup(subscriber.stop)

        # wait for the subscription to reach the publisher before relying on it
        deadline = time.monotonic() + 5
        while True:
            publisher.send_string(f"detection/video {json.dumps('ready')}")

            if subscriber.check_for_update(timeout=0.05) == ("video", "ready"):
                break

            self.assertLess(time.monotonic(), deadline, "subscription never joined")

        # drop any late readiness messages so only the real one is queued
        while subscriber.check_for_update(timeout=0.05) != (None, None):
            pass

        publisher.send_string(f"detection/video {json.dumps(['front', 1.0])}")
        time.sleep(0.1)

        self.assertEqual(subscriber.check_for_update(), ("video", ["front", 1.0]))


if __name__ == "__main__":
    unittest.main()
