"""Review severity rules shared by review segments and tracked objects."""

import unittest
from typing import Any

from frigate.config import FrigateConfig
from frigate.review.maintainer import ActiveObjects
from frigate.review.severity import get_review_severity
from frigate.review.types import SeverityEnum
from frigate.track.tracked_object import TrackedObject

CAMERA = "cam"
FPS = 5
ZONE = "porch"
INSIDE_X = 480
OUTSIDE_X = 160


def _config(alerts_enabled: bool = True) -> FrigateConfig:
    return FrigateConfig(
        **{
            "mqtt": {"enabled": False},
            "cameras": {
                CAMERA: {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {"width": 640, "height": 480, "fps": FPS},
                    "objects": {"track": ["person"]},
                    "zones": {ZONE: {"coordinates": "0.5,0,1,0,1,1,0.5,1"}},
                    "review": {
                        "alerts": {
                            "enabled": alerts_enabled,
                            "required_zones": [ZONE],
                        }
                    },
                }
            },
        }
    )


class TestGetReviewSeverity(unittest.TestCase):
    def setUp(self):
        self.camera_config = _config().cameras[CAMERA]
        self.stationary_threshold = self.camera_config.detect.stationary.threshold

    def _severity(self, camera_config=None, **overrides: Any) -> SeverityEnum | None:
        kwargs = {
            "label": "person",
            "current_zones": [ZONE],
            "false_positive": False,
            "detected": True,
            "position_changes": 1,
            "motionless_count": 0,
            "pending_loitering": False,
            **overrides,
        }
        return get_review_severity(camera_config or self.camera_config, **kwargs)

    def test_alert_in_required_zone(self):
        self.assertEqual(self._severity(), SeverityEnum.alert)

    def test_detection_outside_alert_required_zone(self):
        self.assertEqual(self._severity(current_zones=[]), SeverityEnum.detection)

    def test_detection_when_alerts_disabled(self):
        camera_config = _config(alerts_enabled=False).cameras[CAMERA]
        self.assertEqual(
            self._severity(camera_config=camera_config), SeverityEnum.detection
        )

    def test_stationary_object_does_not_qualify(self):
        self.assertIsNone(self._severity(motionless_count=self.stationary_threshold))

    def test_stationary_loitering_object_qualifies(self):
        self.assertEqual(
            self._severity(
                motionless_count=self.stationary_threshold, pending_loitering=True
            ),
            SeverityEnum.alert,
        )

    def test_object_that_never_moved_does_not_qualify(self):
        self.assertIsNone(self._severity(position_changes=0))

    def test_undetected_object_does_not_qualify(self):
        self.assertIsNone(self._severity(detected=False))

    def test_false_positive_does_not_qualify(self):
        self.assertIsNone(self._severity(false_positive=True))


class TestTrackedObjectMaxSeverity(unittest.TestCase):
    """max_severity must match what review segments would have been created."""

    def setUp(self):
        config = _config()
        self.camera_config = config.cameras[CAMERA]
        self.stationary_threshold = self.camera_config.detect.stationary.threshold
        self.frame = 0
        self.position_changes = 0
        self.motionless_count = 0
        self.last_detection = self._obj_data(OUTSIDE_X, 0.6, 1000.0)
        self.obj = TrackedObject(
            config.model_for_camera(CAMERA),
            self.camera_config,
            config.ui,
            {},
            {**self.last_detection, "score_history": [0.6]},
        )

    def _obj_data(self, x: int, score: float, frame_time: float) -> dict[str, Any]:
        return {
            "id": "1000.0-abcdef",
            "label": "person",
            "frame_time": frame_time,
            "start_time": 1000.0,
            "score": score,
            "box": (x - 40, 200, x + 40, 360),
            "area": 12800,
            "ratio": 0.5,
            "region": (0, 0, 640, 480),
            "centroid": (x, 280),
            "position_changes": self.position_changes,
            "motionless_count": self.motionless_count,
            "attributes": [],
            "sub_label": None,
        }

    def _step(
        self, x: int, score: float, moved: bool, detected: bool = True
    ) -> SeverityEnum | None:
        """Advance one frame and return the severity review segments would see."""
        self.frame += 1
        frame_time = 1000.0 + self.frame / FPS

        if detected:
            # mirror the tracker, which counts the first move and any move
            # after the object was stationary as a position change
            if moved:
                if (
                    self.position_changes == 0
                    or self.motionless_count >= self.stationary_threshold
                ):
                    self.position_changes += 1
                self.motionless_count = 0
            else:
                self.motionless_count += 1

            self.last_detection = self._obj_data(x, score, frame_time)

        _, self.last_significant, _, _ = self.obj.update(
            frame_time, dict(self.last_detection), False
        )
        activity = ActiveObjects(frame_time, self.camera_config, [self.obj.to_dict()])

        if activity.has_activity_category(SeverityEnum.alert):
            return SeverityEnum.alert

        if activity.has_activity_category(SeverityEnum.detection):
            return SeverityEnum.detection

        return None

    def test_object_confirmed_while_stationary_in_zone_has_no_severity(self):
        """An object that only becomes a true positive after it stopped moving
        never creates a review, so it must not be reported as an alert even
        though it entered a required zone."""
        review_severities = []

        # walks into the zone with a low score, so it is a false positive
        for i in range(10):
            review_severities.append(self._step(OUTSIDE_X + i * 40, 0.6, moved=True))

        # sits still until it is stationary
        for _ in range(self.stationary_threshold):
            review_severities.append(self._step(INSIDE_X, 0.6, moved=False))

        # a re-detection while still stationary confirms it as a true positive
        for _ in range(10):
            review_severities.append(self._step(INSIDE_X, 0.9, moved=False))

        # leaves and is no longer detected
        for _ in range(10):
            review_severities.append(self._step(INSIDE_X, 0.9, False, detected=False))

        self.assertFalse(self.obj.false_positive)
        self.assertEqual(self.obj.obj_data["position_changes"], 1)
        self.assertEqual(self.obj.entered_zones, [ZONE])
        self.assertEqual(set(review_severities), {None})
        self.assertIsNone(self.obj.max_severity)
        self.assertIsNone(self.obj.to_dict()["max_severity"])

    def test_severity_change_is_significant(self):
        """Confirming an object already moving in the zone changes nothing else
        that is watched, but the new severity still has to be published."""
        for i in range(10):
            self._step(OUTSIDE_X + i * 40, 0.6, moved=True)

        self.assertEqual(self.obj.current_zones, [ZONE])
        self.assertIsNone(self.obj.max_severity)

        for i in range(10):
            self._step(INSIDE_X + (i % 2) * 10, 0.9, moved=True)

            if self.obj.max_severity is not None:
                break

        self.assertEqual(self.obj.max_severity, SeverityEnum.alert)
        self.assertTrue(self.last_significant)

        self._step(INSIDE_X, 0.9, moved=True)
        self.assertFalse(self.last_significant)

    def test_alert_is_kept_after_object_stops_qualifying(self):
        for i in range(10):
            self._step(OUTSIDE_X + i * 40, 0.9, moved=True)

        self.assertEqual(self.obj.current_zones, [ZONE])
        self.assertEqual(self.obj.max_severity, SeverityEnum.alert)

        for _ in range(self.stationary_threshold + 5):
            self._step(INSIDE_X, 0.9, moved=False)

        self.assertTrue(self.obj.is_stationary())
        self.assertEqual(self.obj.max_severity, SeverityEnum.alert)

    def test_detection_upgrades_to_alert_and_is_not_downgraded(self):
        review_severities = []

        for _ in range(8):
            review_severities.append(self._step(OUTSIDE_X, 0.9, moved=True))

        self.assertEqual(self.obj.max_severity, SeverityEnum.detection)

        for _ in range(5):
            review_severities.append(self._step(INSIDE_X, 0.9, moved=True))

        self.assertEqual(self.obj.max_severity, SeverityEnum.alert)

        for _ in range(5):
            review_severities.append(self._step(OUTSIDE_X, 0.9, moved=True))

        self.assertEqual(review_severities[-1], SeverityEnum.detection)
        self.assertEqual(self.obj.max_severity, SeverityEnum.alert)
        self.assertIn(SeverityEnum.alert, review_severities)


if __name__ == "__main__":
    unittest.main()
