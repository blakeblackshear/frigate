"""Tests for attaching state classification changes to review items."""

import unittest
from unittest.mock import MagicMock, patch

from frigate.comms.embeddings_updater import EmbeddingsRequestEnum
from frigate.config import FrigateConfig
from frigate.data_processing.post.review_descriptions import (
    ReviewDescriptionProcessor,
    format_classification_state_changes,
)
from frigate.data_processing.real_time.custom_classification import (
    CustomStateClassificationProcessor,
)
from frigate.models import ReviewSegment
from frigate.review.maintainer import (
    CLASSIFICATION_STATE_PRE_ROLL,
    PendingReviewSegment,
    ReviewSegmentMaintainer,
)
from frigate.review.types import SeverityEnum

CONFIG = """
mqtt:
  enabled: False
cameras:
  front_door:
    ffmpeg:
      inputs:
        - path: rtsp://10.0.0.1:554/video
          roles:
            - detect
    detect:
      width: 1920
      height: 1080
      fps: 5
"""


def gate_change(timestamp: float, before: str = "closed", after: str = "open"):
    return {"model": "front_gate", "from": before, "to": after, "timestamp": timestamp}


class TestVerifyStateChange(unittest.TestCase):
    def setUp(self):
        self.processor = CustomStateClassificationProcessor.__new__(
            CustomStateClassificationProcessor
        )
        self.processor.state_history = {}

    def verify(self, state: str, timestamp: float):
        return self.processor.verify_state_change("front_door", state, timestamp)

    def test_first_verified_state_has_no_previous_state(self):
        self.assertIsNone(self.verify("closed", 1.0))
        self.assertIsNone(self.verify("closed", 2.0))
        self.assertEqual(self.verify("closed", 3.0), (None, 1.0))

    def test_change_reports_previous_state_and_first_sighting(self):
        for timestamp in (1.0, 2.0, 3.0):
            self.verify("closed", timestamp)

        self.assertIsNone(self.verify("open", 10.0))
        self.assertIsNone(self.verify("open", 11.0))
        self.assertEqual(self.verify("open", 12.0), ("closed", 10.0))

    def test_interrupted_verification_restarts_the_first_sighting(self):
        for timestamp in (1.0, 2.0, 3.0):
            self.verify("closed", timestamp)

        self.verify("open", 10.0)
        self.verify("closed", 11.0)
        self.verify("open", 20.0)
        self.verify("open", 21.0)
        self.assertEqual(self.verify("open", 22.0), ("closed", 20.0))

    def test_reload_forgets_states_the_model_no_longer_has(self):
        for timestamp in (1.0, 2.0, 3.0):
            self.verify("closed", timestamp)

        self.processor.state_history["back_door"] = {"current_state": "open"}
        self.processor.labelmap = {0: "open", 1: "shut"}
        self.processor._forget_unknown_states()

        self.assertEqual(list(self.processor.state_history), ["back_door"])
        self.assertIsNone(self.verify("shut", 10.0))
        self.assertIsNone(self.verify("shut", 11.0))
        self.assertEqual(self.verify("shut", 12.0), (None, 10.0))


class TestReviewSegmentAttachment(unittest.TestCase):
    def setUp(self):
        self.maintainer = ReviewSegmentMaintainer.__new__(ReviewSegmentMaintainer)
        self.maintainer.config = FrigateConfig.parse_yaml(CONFIG)
        self.maintainer.active_review_segments = {}
        self.maintainer.recent_classification_state_changes = {}
        self.maintainer._publish_segment_update = MagicMock()

    def segment(self, start_time: float) -> PendingReviewSegment:
        return PendingReviewSegment(
            "front_door",
            start_time,
            SeverityEnum.alert,
            {"1.0-abcdef": "person"},
            {},
            [],
            set(),
        )

    def test_change_during_segment_is_attached_and_published(self):
        segment = self.segment(100.0)
        self.maintainer.active_review_segments["front_door"] = segment

        self.maintainer.handle_classification_state_change(
            "front_door", gate_change(110.0)
        )

        self.assertEqual(segment.classification_state_changes, [gate_change(110.0)])
        self.maintainer._publish_segment_update.assert_called_once()
        prev_data = self.maintainer._publish_segment_update.call_args.args[4]
        self.assertEqual(prev_data["data"]["classification_state_changes"], [])
        self.assertEqual(
            segment.get_data(False)["data"]["classification_state_changes"],
            [gate_change(110.0)],
        )

    def test_change_never_starts_a_segment(self):
        self.maintainer.handle_classification_state_change(
            "front_door", gate_change(110.0)
        )

        self.assertIsNone(self.maintainer.active_review_segments.get("front_door"))
        self.maintainer._publish_segment_update.assert_not_called()

    def test_change_just_before_a_segment_is_attached_when_it_starts(self):
        self.maintainer.handle_classification_state_change(
            "front_door", gate_change(98.0)
        )
        segment = self.segment(100.0)

        self.maintainer._activate_segment(segment)

        self.assertIs(self.maintainer.active_review_segments["front_door"], segment)
        self.assertEqual(segment.classification_state_changes, [gate_change(98.0)])
        self.assertNotIn(
            "front_door", self.maintainer.recent_classification_state_changes
        )

    def test_change_long_before_a_segment_is_not_attached(self):
        self.maintainer.handle_classification_state_change(
            "front_door", gate_change(100.0 - CLASSIFICATION_STATE_PRE_ROLL - 1)
        )
        segment = self.segment(100.0)

        self.maintainer._activate_segment(segment)

        self.assertEqual(segment.classification_state_changes, [])

    def test_held_changes_are_pruned(self):
        self.maintainer.handle_classification_state_change(
            "front_door", gate_change(10.0)
        )
        self.maintainer.handle_classification_state_change(
            "front_door", gate_change(50.0, "open", "closed")
        )

        self.assertEqual(
            self.maintainer.recent_classification_state_changes["front_door"],
            [gate_change(50.0, "open", "closed")],
        )


class TestChangeTiming(unittest.TestCase):
    def test_changes_are_placed_relative_to_the_activity(self):
        lines = format_classification_state_changes(
            [
                gate_change(98.0),
                gate_change(112.4, "open", "closed"),
                gate_change(140.0),
            ],
            start_time=100.0,
            end_time=130.0,
        )

        self.assertEqual(
            lines,
            [
                "front gate changed from closed to open, "
                "just before the activity started",
                "front gate changed from open to closed, 12s into the activity",
                "front gate changed from closed to open, after the activity ended",
            ],
        )


class TestSummaryContext(unittest.TestCase):
    def row(self, camera, start, end, threat, changes=()):
        return {
            "camera": camera,
            "start_time": start,
            "end_time": end,
            "data": {
                "metadata": {"title": camera, "potential_threat_level": threat},
                "classification_state_changes": list(changes),
            },
        }

    def summarize(self, rows):
        processor = ReviewDescriptionProcessor.__new__(ReviewDescriptionProcessor)
        processor.config = FrigateConfig.parse_yaml(CONFIG)
        processor.genai_manager = MagicMock()
        client = processor.genai_manager.description_client

        with patch.object(ReviewSegment, "select") as select:
            query = select.return_value.where.return_value.order_by.return_value
            query.dicts.return_value.iterator.return_value = iter(rows)
            processor.handle_request(
                EmbeddingsRequestEnum.summarize_review.value,
                {"start_ts": 0, "end_ts": 100},
            )

        return client.generate_review_summary.call_args.args[2]

    def test_overlapping_context_reviews_keep_all_state_changes(self):
        events = self.summarize(
            [
                self.row("front_door", 10, 60, 1),
                self.row("driveway", 15, 25, 0, [gate_change(20.0)]),
                self.row("driveway", 30, 40, 0, [gate_change(35.0, "open", "closed")]),
            ]
        )

        self.assertEqual(len(events[0]["context"]), 1)
        self.assertEqual(
            events[0]["context"][0]["state_changes"],
            [
                "front gate changed from closed to open",
                "front gate changed from open to closed",
            ],
        )

    def test_merging_context_does_not_leak_between_primary_events(self):
        events = self.summarize(
            [
                self.row("front_door", 10, 60, 1),
                self.row("back_door", 12, 22, 1),
                self.row("driveway", 15, 25, 0, [gate_change(20.0)]),
                self.row("driveway", 30, 40, 0, [gate_change(35.0, "open", "closed")]),
            ]
        )

        self.assertEqual(
            events[1]["context"][0]["state_changes"],
            ["front gate changed from closed to open"],
        )


if __name__ == "__main__":
    unittest.main()
