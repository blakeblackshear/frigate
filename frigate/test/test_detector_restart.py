import unittest
from types import SimpleNamespace
from unittest.mock import Mock, call, patch

from frigate.object_detection.base import ObjectDetectProcess


def _make_detector(
    detection_start: SimpleNamespace,
    process: Mock,
    stop_event: Mock,
) -> ObjectDetectProcess:
    detector = ObjectDetectProcess.__new__(ObjectDetectProcess)
    detector.name = "test"
    detector.cameras = ["front"]
    detector.detection_queue = Mock()
    detector.avg_inference_speed = Mock()
    detector.detection_start = detection_start
    detector.detect_process = process
    detector.config = Mock()
    detector.detector_config = SimpleNamespace(type="onnx")
    detector.stop_event = stop_event
    return detector


class TestDetectorRestart(unittest.TestCase):
    @patch("frigate.object_detection.base.DetectorRunner")
    def test_restart_is_abandoned_when_inference_recovers(
        self, detector_runner: Mock
    ) -> None:
        detection_start = SimpleNamespace(value=123.0)
        process = Mock(exitcode=None)
        process.is_alive.return_value = True
        process.join.side_effect = lambda timeout=None: setattr(
            detection_start, "value", 0.0
        )
        detector = _make_detector(detection_start, process, Mock())

        detector.start_or_restart()

        process.join.assert_called_once_with(timeout=30)
        process.kill.assert_not_called()
        self.assertIs(detector.detect_process, process)
        detector_runner.assert_not_called()

    @patch("frigate.object_detection.base.DetectorRunner")
    def test_restart_force_kills_detector_that_remains_stuck(
        self, detector_runner: Mock
    ) -> None:
        detection_start = SimpleNamespace(value=123.0)
        process = Mock(exitcode=None)
        process.is_alive.return_value = True
        process.kill.side_effect = lambda: setattr(process, "exitcode", -9)
        stop_event = Mock()
        detector = _make_detector(detection_start, process, stop_event)

        detector.start_or_restart()

        process.join.assert_has_calls([call(timeout=30), call()])
        process.kill.assert_called_once_with()
        self.assertEqual(detection_start.value, 0.0)
        detector_runner.assert_called_once_with(
            "frigate.detector:test",
            detector.detection_queue,
            detector.cameras,
            detector.avg_inference_speed,
            detection_start,
            detector.config,
            detector.detector_config,
            stop_event,
        )
        detector_runner.return_value.start.assert_called_once_with()


if __name__ == "__main__":
    unittest.main()
