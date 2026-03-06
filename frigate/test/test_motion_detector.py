import unittest

import numpy as np

from frigate.config.camera.motion import MotionConfig
from frigate.motion.improved_motion import ImprovedMotionDetector


class TestImprovedMotionDetector(unittest.TestCase):
    def setUp(self):
        # small frame for testing; actual frames are grayscale
        self.frame_shape = (100, 100)  # height, width
        self.config = MotionConfig()
        # motion detector assumes a rasterized_mask attribute exists on config
        # when update_mask() is called; add one manually by bypassing pydantic.
        object.__setattr__(
            self.config,
            "rasterized_mask",
            np.ones((self.frame_shape[0], self.frame_shape[1]), dtype=np.uint8),
        )

        # create minimal PTZ metrics stub to satisfy detector checks
        class _Stub:
            def __init__(self, value=False):
                self.value = value

            def is_set(self):
                return bool(self.value)

        class DummyPTZ:
            def __init__(self):
                self.autotracker_enabled = _Stub(False)
                self.motor_stopped = _Stub(False)
                self.stop_time = _Stub(0)

        self.detector = ImprovedMotionDetector(
            self.frame_shape, self.config, fps=30, ptz_metrics=DummyPTZ()
        )

        # establish a baseline frame (all zeros)
        base_frame = np.zeros(
            (self.frame_shape[0], self.frame_shape[1]), dtype=np.uint8
        )
        self.detector.detect(base_frame)

    def _half_change_frame(self) -> np.ndarray:
        """Produce a frame where roughly half of the pixels are different."""
        frame = np.zeros((self.frame_shape[0], self.frame_shape[1]), dtype=np.uint8)
        # flip the top half to white
        frame[: self.frame_shape[0] // 2, :] = 255
        return frame

    def test_skip_motion_threshold_default(self):
        """With the default (None) setting, motion should always be reported."""
        frame = self._half_change_frame()
        boxes = self.detector.detect(frame)
        self.assertTrue(
            boxes, "Expected motion boxes when skip threshold is unset (disabled)"
        )

    def test_skip_motion_threshold_applied(self):
        """Setting a low skip threshold should prevent any boxes from being returned."""
        # change the config and update the detector reference
        self.config.skip_motion_threshold = 0.4
        self.detector.config = self.config
        self.detector.update_mask()

        frame = self._half_change_frame()
        boxes = self.detector.detect(frame)
        self.assertEqual(
            boxes,
            [],
            "Motion boxes should be empty when scene change exceeds skip threshold",
        )

    def test_skip_motion_threshold_does_not_affect_calibration(self):
        """Even when skipping, the detector should go into calibrating state."""
        self.config.skip_motion_threshold = 0.4
        self.detector.config = self.config
        self.detector.update_mask()

        frame = self._half_change_frame()
        _ = self.detector.detect(frame)
        self.assertTrue(
            self.detector.calibrating,
            "Detector should be in calibrating state after skip event",
        )


if __name__ == "__main__":
    unittest.main()
