"""Tests for how tracked objects flow into review segments.

Frames are fed through the maintainer's run loop with mocked subscribers so
the dispatch between starting and updating segments is exercised, and the
published review updates are checked for the expected alert, detection, or
lack of a review item.
"""

import json
import tempfile
import threading
import unittest
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import numpy as np

from frigate.comms.detections_updater import DetectionTypeEnum
from frigate.config import FrigateConfig
from frigate.review.maintainer import ReviewSegmentMaintainer

CAMERA = "front_door"

BASE_CONFIG = """
mqtt:
  enabled: False
record:
  enabled: True
cameras:
  front_door:
    ffmpeg:
      inputs:
        - path: rtsp://10.0.0.1:554/video
          roles:
            - detect
    detect:
      width: 640
      height: 360
      fps: 5
    zones:
      driveway:
        coordinates: 0,0,320,0,320,360,0,360
      yard:
        coordinates: 320,0,640,0,640,360,320,360
%s
"""


class ReviewFlowTestCase(unittest.TestCase):
    review_config = ""

    def setUp(self) -> None:
        self.clips_dir = clips_dir = tempfile.TemporaryDirectory()
        self.addCleanup(clips_dir.cleanup)
        clips_patch = patch("frigate.review.maintainer.CLIPS_DIR", clips_dir.name)
        clips_patch.start()
        self.addCleanup(clips_patch.stop)

        self.maintainer = self._make_maintainer(self.review_config)

    def _make_maintainer(self, review_config: str) -> ReviewSegmentMaintainer:
        """Build a maintainer without invoking __init__ (avoids needing ZMQ
        sockets and shared memory)."""
        maintainer = ReviewSegmentMaintainer.__new__(ReviewSegmentMaintainer)
        threading.Thread.__init__(maintainer)
        maintainer.config = FrigateConfig.parse_yaml(BASE_CONFIG % review_config)
        maintainer.active_review_segments = {}
        maintainer.indefinite_events = {}
        maintainer.recent_classification_state_changes = {}
        maintainer.requestor = MagicMock()
        maintainer.review_publisher = MagicMock()
        maintainer.config_subscriber = MagicMock()
        maintainer.config_subscriber.check_for_updates.return_value = {}
        maintainer.detection_subscriber = MagicMock()
        maintainer.frame_manager = MagicMock()
        maintainer.frame_manager.get.side_effect = lambda _name, shape: np.zeros(
            shape, np.uint8
        )
        return maintainer

    @property
    def stationary_threshold(self) -> int:
        return self.maintainer.config.cameras[CAMERA].detect.stationary.threshold

    def tracked(
        self,
        obj_id: str,
        label: str,
        frame_time: float,
        *,
        start_time: float = 0,
        zones: list[str] | None = None,
        stationary: bool = False,
        loitering: bool = False,
        moved: bool = True,
        false_positive: bool = False,
    ) -> dict[str, Any]:
        """Build a tracked object as published by the object processor."""
        return {
            "id": obj_id,
            "label": label,
            "sub_label": None,
            "frame_time": frame_time,
            "start_time": start_time,
            "motionless_count": self.stationary_threshold if stationary else 0,
            "pending_loitering": loitering,
            "position_changes": 1 if moved else 0,
            "false_positive": false_positive,
            "current_zones": zones or [],
            "box": (100, 100, 200, 200),
        }

    def feed(self, *frames: tuple[float, list[dict[str, Any]]]) -> None:
        """Run the maintainer loop over the given (frame_time, objects) frames."""
        queue = [
            (
                DetectionTypeEnum.video.value,
                (CAMERA, f"{CAMERA}_{frame_time}", frame_time, objects, [], []),
            )
            for frame_time, objects in frames
        ]
        self.maintainer.stop_event = threading.Event()

        def next_update(timeout: float) -> Any:
            if not queue:
                self.maintainer.stop_event.set()
                return None

            return queue.pop(0)

        self.maintainer.detection_subscriber.check_for_update.side_effect = next_update
        self.maintainer.run()

    def reviews(self) -> list[dict[str, Any]]:
        """All review updates published on the reviews topic."""
        return [
            json.loads(c.args[1])
            for c in self.maintainer.requestor.send_data.call_args_list
            if c.args[0] == "reviews"
        ]

    def review_summary(self) -> list[tuple[str, str]]:
        return [(r["type"], r["after"]["severity"]) for r in self.reviews()]

    def assert_no_review(self) -> None:
        self.assertEqual(self.reviews(), [])
        self.assertIsNone(self.maintainer.active_review_segments.get(CAMERA))


class TestReviewSeverity(ReviewFlowTestCase):
    def test_alert_label_creates_alert(self) -> None:
        self.feed((1, [self.tracked("p1", "person", 1)]))

        self.assertEqual(self.review_summary(), [("new", "alert")])
        self.assertEqual(self.reviews()[0]["after"]["data"]["objects"], ["person"])

    def test_non_alert_label_creates_detection(self) -> None:
        self.feed((1, [self.tracked("d1", "dog", 1)]))

        self.assertEqual(self.review_summary(), [("new", "detection")])
        self.assertEqual(self.reviews()[0]["after"]["data"]["objects"], ["dog"])

    def test_alert_and_detection_objects_create_single_alert(self) -> None:
        self.feed((1, [self.tracked("p1", "person", 1), self.tracked("d1", "dog", 1)]))

        self.assertEqual(self.review_summary(), [("new", "alert")])
        self.assertCountEqual(
            self.reviews()[0]["after"]["data"]["objects"], ["person", "dog"]
        )

    def test_no_objects_creates_nothing(self) -> None:
        self.feed((1, []), (2, []))

        self.assert_no_review()


class TestIgnoredObjects(ReviewFlowTestCase):
    def test_stationary_object_creates_nothing(self) -> None:
        self.feed((1, [self.tracked("p1", "person", 1, stationary=True)]))

        self.assert_no_review()

    def test_stationary_loitering_object_creates_alert(self) -> None:
        self.feed(
            (1, [self.tracked("p1", "person", 1, stationary=True, loitering=True)])
        )

        self.assertEqual(self.review_summary(), [("new", "alert")])

    def test_object_that_never_moved_creates_nothing(self) -> None:
        self.feed((1, [self.tracked("p1", "person", 1, moved=False)]))

        self.assert_no_review()

    def test_object_not_detected_in_current_frame_creates_nothing(self) -> None:
        self.feed((2, [self.tracked("p1", "person", 1)]))

        self.assert_no_review()

    def test_false_positive_creates_nothing(self) -> None:
        self.feed((1, [self.tracked("p1", "person", 1, false_positive=True)]))

        self.assert_no_review()


class TestAlertRequiredZones(ReviewFlowTestCase):
    review_config = """
    review:
      alerts:
        required_zones: driveway
"""

    def test_alert_label_in_required_zone_creates_alert(self) -> None:
        self.feed((1, [self.tracked("p1", "person", 1, zones=["driveway"])]))

        self.assertEqual(self.review_summary(), [("new", "alert")])
        self.assertEqual(self.reviews()[0]["after"]["data"]["zones"], ["driveway"])

    def test_alert_label_outside_required_zone_creates_detection(self) -> None:
        self.feed((1, [self.tracked("p1", "person", 1, zones=["yard"])]))

        self.assertEqual(self.review_summary(), [("new", "detection")])

    def test_alert_label_in_no_zone_creates_detection(self) -> None:
        self.feed((1, [self.tracked("p1", "person", 1)]))

        self.assertEqual(self.review_summary(), [("new", "detection")])

    def test_detection_upgrades_to_alert_when_object_enters_required_zone(
        self,
    ) -> None:
        self.feed(
            (1, [self.tracked("p1", "person", 1, zones=["yard"])]),
            (2, [self.tracked("p1", "person", 2, zones=["driveway"])]),
        )

        self.assertEqual(
            self.review_summary(), [("new", "detection"), ("update", "alert")]
        )
        self.assertEqual(
            self.reviews()[0]["after"]["id"], self.reviews()[1]["after"]["id"]
        )


class TestDetectionRequiredZones(ReviewFlowTestCase):
    review_config = """
    review:
      detections:
        required_zones: yard
"""

    def test_detection_label_in_required_zone_creates_detection(self) -> None:
        self.feed((1, [self.tracked("d1", "dog", 1, zones=["yard"])]))

        self.assertEqual(self.review_summary(), [("new", "detection")])

    def test_detection_label_outside_required_zone_creates_nothing(self) -> None:
        self.feed((1, [self.tracked("d1", "dog", 1, zones=["driveway"])]))

        self.assert_no_review()

    def test_alert_label_ignores_detection_required_zones(self) -> None:
        self.feed((1, [self.tracked("p1", "person", 1, zones=["driveway"])]))

        self.assertEqual(self.review_summary(), [("new", "alert")])


class TestDetectionLabels(ReviewFlowTestCase):
    review_config = """
    review:
      detections:
        labels:
          - dog
"""

    def test_listed_label_creates_detection(self) -> None:
        self.feed((1, [self.tracked("d1", "dog", 1)]))

        self.assertEqual(self.review_summary(), [("new", "detection")])

    def test_unlisted_label_creates_nothing(self) -> None:
        self.feed((1, [self.tracked("c1", "cat", 1)]))

        self.assert_no_review()

    def test_unlisted_object_is_left_out_of_detection(self) -> None:
        self.feed((1, [self.tracked("d1", "dog", 1), self.tracked("c1", "cat", 1)]))

        self.assertEqual(self.review_summary(), [("new", "detection")])
        self.assertEqual(self.reviews()[0]["after"]["data"]["objects"], ["dog"])


class TestAlertsDisabled(ReviewFlowTestCase):
    review_config = """
    review:
      alerts:
        enabled: False
"""

    def test_alert_label_creates_detection(self) -> None:
        self.feed((1, [self.tracked("p1", "person", 1)]))

        self.assertEqual(self.review_summary(), [("new", "detection")])


class TestDetectionsDisabled(ReviewFlowTestCase):
    review_config = """
    review:
      detections:
        enabled: False
"""

    def test_alert_label_creates_alert(self) -> None:
        self.feed((1, [self.tracked("p1", "person", 1)]))

        self.assertEqual(self.review_summary(), [("new", "alert")])

    def test_non_alert_label_creates_nothing(self) -> None:
        self.feed((1, [self.tracked("d1", "dog", 1)]))

        self.assert_no_review()


class TestAlertsAndDetectionsDisabled(ReviewFlowTestCase):
    review_config = """
    review:
      alerts:
        enabled: False
      detections:
        enabled: False
"""

    def test_nothing_is_created(self) -> None:
        self.feed((1, [self.tracked("p1", "person", 1), self.tracked("d1", "dog", 1)]))

        self.assert_no_review()


class TestReviewLifecycle(ReviewFlowTestCase):
    @property
    def alert_cutoff(self) -> int:
        return self.maintainer.config.cameras[CAMERA].review.alerts.cutoff_time

    @property
    def detection_cutoff(self) -> int:
        return self.maintainer.config.cameras[CAMERA].review.detections.cutoff_time

    def test_detection_upgrades_to_alert_when_alert_object_appears(self) -> None:
        self.feed(
            (1, [self.tracked("d1", "dog", 1)]),
            (2, [self.tracked("d1", "dog", 2), self.tracked("p1", "person", 2)]),
        )

        self.assertEqual(
            self.review_summary(), [("new", "detection"), ("update", "alert")]
        )
        new, update = self.reviews()
        self.assertEqual(new["after"]["id"], update["after"]["id"])
        self.assertCountEqual(update["after"]["data"]["objects"], ["dog", "person"])

    def test_alert_does_not_downgrade_when_only_detection_objects_remain(
        self,
    ) -> None:
        self.feed(
            (1, [self.tracked("p1", "person", 1), self.tracked("d1", "dog", 1)]),
            (2, [self.tracked("d1", "dog", 2)]),
            (3, [self.tracked("d1", "dog", 3)]),
        )

        self.assertEqual({severity for _, severity in self.review_summary()}, {"alert"})
        self.assertEqual(
            self.maintainer.active_review_segments[CAMERA].severity.value, "alert"
        )

    def test_alert_stays_open_until_cutoff(self) -> None:
        self.feed(
            (1, [self.tracked("p1", "person", 1)]),
            (1 + self.alert_cutoff, []),
        )

        self.assertNotIn("end", [t for t, _ in self.review_summary()])
        self.assertIsNotNone(self.maintainer.active_review_segments.get(CAMERA))

    def test_alert_ends_after_cutoff_at_last_alert_activity(self) -> None:
        self.feed(
            (1, [self.tracked("p1", "person", 1)]),
            (5, [self.tracked("p1", "person", 5)]),
            (6, []),
            (5 + self.alert_cutoff + 1, []),
        )

        end = self.reviews()[-1]
        self.assertEqual(end["type"], "end")
        self.assertEqual(end["after"]["severity"], "alert")
        self.assertEqual(end["after"]["end_time"], 5)
        self.assertIsNone(self.maintainer.active_review_segments.get(CAMERA))

    def test_ongoing_alert_activity_extends_alert(self) -> None:
        last_activity = 1 + self.alert_cutoff * 2
        self.feed(
            (1, [self.tracked("p1", "person", 1)]),
            (
                1 + self.alert_cutoff,
                [self.tracked("p1", "person", 1 + self.alert_cutoff)],
            ),
            (last_activity, [self.tracked("p1", "person", last_activity)]),
            (last_activity + 1, []),
        )

        self.assertNotIn("end", [t for t, _ in self.review_summary()])
        self.assertEqual(
            self.maintainer.active_review_segments[CAMERA].last_alert_time,
            last_activity,
        )

    def test_detection_ends_after_cutoff_at_last_detection_activity(self) -> None:
        self.feed(
            (1, [self.tracked("d1", "dog", 1)]),
            (5, [self.tracked("d1", "dog", 5)]),
            (5 + self.detection_cutoff, []),
        )
        self.assertNotIn("end", [t for t, _ in self.review_summary()])

        self.feed((5 + self.detection_cutoff + 1, []))

        end = self.reviews()[-1]
        self.assertEqual(end["type"], "end")
        self.assertEqual(end["after"]["severity"], "detection")
        self.assertEqual(end["after"]["end_time"], 5)
        self.assertIsNone(self.maintainer.active_review_segments.get(CAMERA))

    def test_stationary_object_does_not_extend_alert(self) -> None:
        self.feed(
            (1, [self.tracked("c1", "car", 1)]),
            (2, [self.tracked("c1", "car", 2, stationary=True)]),
            (
                2 + self.alert_cutoff,
                [self.tracked("c1", "car", 2 + self.alert_cutoff, stationary=True)],
            ),
        )

        end = self.reviews()[-1]
        self.assertEqual(end["type"], "end")
        self.assertEqual(end["after"]["end_time"], 1)

    def test_new_activity_after_end_creates_new_review(self) -> None:
        self.feed(
            (1, [self.tracked("p1", "person", 1)]),
            (2 + self.alert_cutoff, []),
            (3 + self.alert_cutoff, [self.tracked("d1", "dog", 3 + self.alert_cutoff)]),
        )

        self.assertEqual(
            [(t, s) for t, s in self.review_summary() if t != "update"],
            [("new", "alert"), ("end", "alert"), ("new", "detection")],
        )
        ids = {r["after"]["id"] for r in self.reviews() if r["type"] != "update"}
        self.assertEqual(len(ids), 2)

    def test_alert_splits_into_detection_when_detection_activity_continues(
        self,
    ) -> None:
        # the person leaves after the first frame while the dog keeps moving
        dog_frames = [
            (t, [self.tracked("d1", "dog", t, start_time=1)])
            for t in range(11, 2 + self.alert_cutoff + 10, 10)
        ]
        self.feed(
            (
                1,
                [
                    self.tracked("p1", "person", 1, start_time=1),
                    self.tracked("d1", "dog", 1, start_time=1),
                ],
            ),
            *dog_frames,
        )

        self.assertEqual(
            [(t, s) for t, s in self.review_summary() if t != "update"],
            [("new", "alert"), ("end", "alert"), ("new", "detection")],
        )
        alert_end = next(r for r in self.reviews() if r["type"] == "end")
        self.assertEqual(alert_end["after"]["end_time"], 1)

        detection = self.maintainer.active_review_segments[CAMERA]
        self.assertEqual(detection.severity.value, "detection")
        self.assertEqual(detection.start_time, 11)
        self.assertEqual(list(detection.detections.values()), ["dog"])

        # the detection ends once the dog stops moving
        last_dog_time = dog_frames[-1][0]
        self.feed((last_dog_time + self.detection_cutoff + 1, []))

        end = self.reviews()[-1]
        self.assertEqual(end["type"], "end")
        self.assertEqual(end["after"]["severity"], "detection")
        self.assertEqual(end["after"]["id"], detection.id)
        self.assertEqual(end["after"]["end_time"], last_dog_time)

    def test_detection_starting_after_alert_activity_is_split_out(self) -> None:
        # the dog only shows up after the person has left
        dog_frames = [
            (t, [self.tracked("d1", "dog", t, start_time=11)])
            for t in range(11, 2 + self.alert_cutoff + 10, 10)
        ]
        self.feed((1, [self.tracked("p1", "person", 1, start_time=1)]), *dog_frames)

        self.assertEqual(
            [(t, s) for t, s in self.review_summary() if t != "update"],
            [("new", "alert"), ("end", "alert"), ("new", "detection")],
        )
        alert_end = next(r for r in self.reviews() if r["type"] == "end")
        self.assertEqual(alert_end["after"]["end_time"], 1)
        self.assertEqual(alert_end["after"]["data"]["objects"], ["person"])

        detection = self.maintainer.active_review_segments[CAMERA]
        self.assertEqual(detection.severity.value, "detection")
        self.assertEqual(detection.start_time, 11)
        self.assertEqual(list(detection.detections.values()), ["dog"])

    def test_detection_leaving_before_alert_cutoff_gets_detection(self) -> None:
        # the dog comes and goes after the person left, all before the alert
        # cutoff, so nothing is active when the alert ends
        self.feed(
            (1, [self.tracked("p1", "person", 1, start_time=1)]),
            (11, [self.tracked("d1", "dog", 11, start_time=11)]),
            (21, [self.tracked("d1", "dog", 21, start_time=11)]),
            (31, []),
            (2 + self.alert_cutoff, []),
            (22 + self.detection_cutoff, []),
        )

        self.assertEqual(
            [(t, s) for t, s in self.review_summary() if t != "update"],
            [
                ("new", "alert"),
                ("end", "alert"),
                ("new", "detection"),
                ("end", "detection"),
            ],
        )
        ends = [r["after"] for r in self.reviews() if r["type"] == "end"]
        self.assertEqual(ends[0]["end_time"], 1)
        self.assertEqual(ends[0]["data"]["objects"], ["person"])
        self.assertEqual(ends[1]["data"]["objects"], ["dog"])
        self.assertEqual(ends[1]["start_time"], 11)
        self.assertEqual(ends[1]["end_time"], 21)

    def test_detection_older_than_detection_cutoff_gets_detection(self) -> None:
        # the dog is gone longer than the detection cutoff by the time the
        # alert ends, its activity still needs a detection
        self.feed(
            (1, [self.tracked("p1", "person", 1, start_time=1)]),
            (3, [self.tracked("d1", "dog", 3, start_time=3)]),
            (5, [self.tracked("d1", "dog", 5, start_time=3)]),
            (6, []),
            (2 + self.alert_cutoff, []),
            (3 + self.alert_cutoff, []),
        )
        self.assertGreater(2 + self.alert_cutoff, 5 + self.detection_cutoff)

        self.assertEqual(
            [(t, s) for t, s in self.review_summary() if t != "update"],
            [
                ("new", "alert"),
                ("end", "alert"),
                ("new", "detection"),
                ("end", "detection"),
            ],
        )
        ends = [r["after"] for r in self.reviews() if r["type"] == "end"]
        self.assertEqual(ends[0]["end_time"], 1)
        self.assertEqual(ends[0]["data"]["objects"], ["person"])
        self.assertEqual(ends[1]["data"]["objects"], ["dog"])
        self.assertEqual(ends[1]["start_time"], 3)
        self.assertEqual(ends[1]["end_time"], 5)
        self.assertIsNone(self.maintainer.active_review_segments.get(CAMERA))

    def test_separate_detection_activity_after_alert_is_not_combined(self) -> None:
        # the dog and cat are seen further apart than the detection cutoff
        # while the alert is waiting to be cut off
        cat_time = 3 + self.detection_cutoff + 6
        self.assertLess(cat_time, 1 + self.alert_cutoff)
        self.feed(
            (1, [self.tracked("p1", "person", 1, start_time=1)]),
            (3, [self.tracked("d1", "dog", 3, start_time=3)]),
            (4, []),
            (cat_time, [self.tracked("c1", "cat", cat_time, start_time=cat_time)]),
            (2 + self.alert_cutoff, []),
            (cat_time + self.detection_cutoff + 1, []),
        )

        self.assertEqual(
            [(t, s) for t, s in self.review_summary() if t != "update"],
            [
                ("new", "alert"),
                ("end", "alert"),
                ("new", "detection"),
                ("end", "detection"),
                ("new", "detection"),
                ("end", "detection"),
            ],
        )
        ends = [r["after"] for r in self.reviews() if r["type"] == "end"]
        self.assertEqual(ends[0]["data"]["objects"], ["person"])
        self.assertEqual(ends[1]["data"]["objects"], ["dog"])
        self.assertEqual((ends[1]["start_time"], ends[1]["end_time"]), (3, 3))
        self.assertEqual(ends[2]["data"]["objects"], ["cat"])
        self.assertEqual(
            (ends[2]["start_time"], ends[2]["end_time"]), (cat_time, cat_time)
        )
        for detection in ends[1:]:
            self.assertTrue(Path(detection["thumb_path"]).is_file())
            self.assertIsNotNone(detection["data"]["thumb_time"])

    def test_resumed_alert_publishes_pending_detection_objects(self) -> None:
        self.feed(
            (1, [self.tracked("p1", "person", 1, start_time=1)]),
            (5, [self.tracked("d1", "dog", 5, start_time=5)]),
            (10, [self.tracked("p1", "person", 10, start_time=1)]),
        )

        latest = self.reviews()[-1]
        self.assertEqual(latest["type"], "update")
        self.assertEqual(latest["after"]["severity"], "alert")
        self.assertCountEqual(latest["after"]["data"]["objects"], ["person", "dog"])

        # the dog's held detection thumbnail is discarded with it
        thumbs = list(Path(self.clips_dir.name, "review").iterdir())
        self.assertEqual(
            [t.name for t in thumbs], [Path(latest["after"]["thumb_path"]).name]
        )

    def test_split_detection_has_thumbnail_of_its_activity(self) -> None:
        dog_frames = [
            (t, [self.tracked("d1", "dog", t, start_time=11)])
            for t in range(11, 2 + self.alert_cutoff + 10, 10)
        ]
        self.feed((1, [self.tracked("p1", "person", 1, start_time=1)]), *dog_frames)

        new_detection = next(
            r["after"]
            for r in self.reviews()
            if r["type"] == "new" and r["after"]["severity"] == "detection"
        )
        self.assertTrue(Path(new_detection["thumb_path"]).is_file())
        # captured from the dog's first frame, not a later fallback frame
        self.assertIsNotNone(new_detection["data"]["thumb_time"])
        self.assertIn(
            f"{CAMERA}_11",
            [c.args[0] for c in self.maintainer.frame_manager.get.call_args_list],
        )


if __name__ == "__main__":
    unittest.main()
