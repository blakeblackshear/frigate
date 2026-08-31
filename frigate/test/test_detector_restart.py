import multiprocessing as mp
import sys
import threading
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

import numpy as np

from frigate.object_detection.base import DetectorRunner, ObjectDetectProcess


def detector_returning_from_inference(
    detection_queue: mp.Queue,
    inference_started: mp.Event,
    release_inference: mp.Event,
    process_stop_event: mp.Event,
) -> None:
    detection_queue.get(timeout=5)
    inference_started.set()
    release_inference.wait(5)

    if process_stop_event.is_set():
        return

    detection_queue.get(timeout=5)


def receive_one_request(detection_queue: mp.Queue, result_pipe) -> None:
    result_pipe.send(detection_queue.get(timeout=5))
    result_pipe.close()


class ProcessThatExitsAfterRetirement:
    def __init__(self, calls: list[str]) -> None:
        self.calls = calls
        self.exitcode: int | None = None

    def is_alive(self) -> bool:
        return self.exitcode is None

    def join(self, timeout: int | None = None) -> None:
        self.calls.append(f"join:{timeout}")
        self.exitcode = 0

    def kill(self) -> None:
        self.calls.append("kill")


class ProcessThatNeedsKilling(ProcessThatExitsAfterRetirement):
    def join(self, timeout: int | None = None) -> None:
        self.calls.append(f"join:{timeout}")

    def kill(self) -> None:
        self.calls.append("kill")
        self.exitcode = -9


class TestDetectorGenerationShutdown(unittest.TestCase):
    def test_stop_retires_generation_before_waiting_for_process(self) -> None:
        calls: list[str] = []
        detector = ObjectDetectProcess.__new__(ObjectDetectProcess)
        detector.detect_process = ProcessThatExitsAfterRetirement(calls)
        detector.process_stop_event = Mock()
        detector.process_stop_event.set.side_effect = lambda: calls.append("retire")

        detector.stop()

        self.assertEqual(calls, ["retire", "join:30"])
        detector.process_stop_event.set.assert_called_once_with()

    def test_stop_force_kills_only_after_retirement_timeout(self) -> None:
        calls: list[str] = []
        detector = ObjectDetectProcess.__new__(ObjectDetectProcess)
        detector.detect_process = ProcessThatNeedsKilling(calls)
        detector.process_stop_event = Mock()
        detector.process_stop_event.set.side_effect = lambda: calls.append("retire")

        detector.stop()

        self.assertEqual(calls, ["retire", "join:30", "kill", "join:None"])

    @patch("frigate.object_detection.base.Event")
    @patch("frigate.object_detection.base.DetectorRunner")
    def test_restart_uses_a_fresh_generation_stop_event(
        self,
        detector_runner: Mock,
        event: Mock,
    ) -> None:
        calls: list[str] = []
        old_stop_event = Mock()
        new_stop_event = event.return_value

        detector = ObjectDetectProcess.__new__(ObjectDetectProcess)
        detector.name = "test"
        detector.cameras = ["front"]
        detector.detection_queue = Mock()
        detector.avg_inference_speed = Mock()
        detector.detection_start = SimpleNamespace(value=123.0)
        detector.process_stop_event = old_stop_event
        detector.detect_process = ProcessThatExitsAfterRetirement(calls)
        detector.config = Mock()
        detector.detector_config = SimpleNamespace(type="onnx")
        detector.stop_event = Mock()

        def retire_old() -> None:
            self.assertEqual(detector.detection_start.value, 123.0)
            calls.append("retire-old")

        old_stop_event.set.side_effect = retire_old

        detector.start_or_restart()

        self.assertEqual(calls, ["retire-old", "join:30"])
        self.assertIs(detector.process_stop_event, new_stop_event)
        self.assertEqual(detector.detection_start.value, 0.0)
        detector_runner.assert_called_once_with(
            "frigate.detector:test",
            detector.detection_queue,
            detector.cameras,
            detector.avg_inference_speed,
            detector.detection_start,
            detector.config,
            detector.detector_config,
            new_stop_event,
        )
        detector_runner.return_value.start.assert_called_once_with()

    @patch("frigate.object_detection.base.ObjectDetectorPublisher")
    @patch("frigate.object_detection.base.LocalObjectDetector")
    @patch("frigate.object_detection.base.SharedMemoryFrameManager")
    def test_retired_runner_exits_before_reentering_detection_queue(
        self,
        frame_manager: Mock,
        local_detector: Mock,
        publisher: Mock,
    ) -> None:
        stop_event = Mock()
        stop_event.is_set.side_effect = [False, True]
        detection_queue = Mock()
        detection_queue.get.return_value = "front"
        frame_manager.return_value.get.return_value = np.zeros(
            (1, 4, 4, 3), dtype=np.uint8
        )
        local_detector.return_value.detect_raw.return_value = np.zeros(
            (20, 6), dtype=np.float32
        )

        runner = DetectorRunner.__new__(DetectorRunner)
        runner.pre_run_setup = Mock()
        runner.config = SimpleNamespace(logger=Mock())
        runner.detector_config = SimpleNamespace(
            model=SimpleNamespace(height=4, width=4)
        )
        runner.cameras = []
        runner.stop_event = stop_event
        runner.detection_queue = detection_queue
        runner.avg_speed = SimpleNamespace(value=0.01)
        runner.start_time = SimpleNamespace(value=0.0)
        runner.outputs = {"front": {"np": np.zeros((20, 6), dtype=np.float32)}}

        runner.run()

        detection_queue.get.assert_called_once_with(timeout=1)
        publisher.return_value.publish.assert_called_once_with("front")
        publisher.return_value.stop.assert_called_once_with()

    @unittest.skipUnless(sys.platform.startswith("linux"), "requires POSIX queue")
    def test_replacement_can_reuse_queue_after_inflight_inference_returns(
        self,
    ) -> None:
        ctx = mp.get_context("fork")
        detection_queue = ctx.Queue()
        inference_started = ctx.Event()
        release_inference = ctx.Event()
        process_stop_event = ctx.Event()
        old_process = ctx.Process(
            target=detector_returning_from_inference,
            args=(
                detection_queue,
                inference_started,
                release_inference,
                process_stop_event,
            ),
        )
        replacement = None
        stop_thread = None

        try:
            old_process.start()
            detection_queue.put("inflight-request")
            self.assertTrue(inference_started.wait(5))

            detector = ObjectDetectProcess.__new__(ObjectDetectProcess)
            detector.detect_process = old_process
            detector.process_stop_event = process_stop_event

            stop_thread = threading.Thread(target=detector.stop)
            stop_thread.start()
            self.assertTrue(process_stop_event.wait(5))
            release_inference.set()
            stop_thread.join(5)

            self.assertFalse(stop_thread.is_alive())
            self.assertEqual(old_process.exitcode, 0)

            receiver, sender = ctx.Pipe(duplex=False)
            replacement = ctx.Process(
                target=receive_one_request,
                args=(detection_queue, sender),
            )
            replacement.start()
            sender.close()
            detection_queue.put("replacement-request")

            self.assertTrue(receiver.poll(5))
            self.assertEqual(receiver.recv(), "replacement-request")
            replacement.join(5)
            self.assertEqual(replacement.exitcode, 0)
        finally:
            release_inference.set()
            if stop_thread is not None:
                stop_thread.join(1)
            if old_process.is_alive():
                old_process.kill()
                old_process.join(5)
            if replacement is not None and replacement.is_alive():
                replacement.kill()
                replacement.join(5)
            detection_queue.close()


if __name__ == "__main__":
    unittest.main()
