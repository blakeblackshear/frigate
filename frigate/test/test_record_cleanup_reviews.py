"""Tests for review-based retention in recording cleanup."""

import datetime
import unittest
from unittest.mock import MagicMock

from peewee import SqliteDatabase

from frigate.config import FrigateConfig
from frigate.models import Previews, Recordings, ReviewSegment, UserReviewStatus
from frigate.record.cleanup import RecordingCleanup


class TestRecordingCleanupReviewOverlap(unittest.TestCase):
    def setUp(self):
        self.db = SqliteDatabase(":memory:")
        models = [Previews, Recordings, ReviewSegment, UserReviewStatus]
        self.db.bind(models)
        self.db.create_tables(models)
        self.base = datetime.datetime.now().timestamp() - 3600

    def tearDown(self):
        self.db.close()

    def _build_cleanup(self, alerts: dict, detections: dict) -> RecordingCleanup:
        config = FrigateConfig(
            **{
                "mqtt": {"host": "mqtt"},
                "cameras": {
                    "front_door": {
                        "ffmpeg": {
                            "inputs": [
                                {
                                    "path": "rtsp://10.0.0.1:554/video",
                                    "roles": ["detect", "record"],
                                }
                            ]
                        },
                        "record": {
                            "enabled": True,
                            "continuous": {"days": 0},
                            "motion": {"days": 0},
                            "alerts": alerts,
                            "detections": detections,
                        },
                    }
                },
            }
        )
        return RecordingCleanup(config, MagicMock())

    def _insert_review(self, id: str, severity: str, start: float, end: float):
        ReviewSegment.create(
            id=id,
            camera="front_door",
            start_time=self.base + start,
            end_time=self.base + end,
            severity=severity,
            thumb_path=f"/media/frigate/clips/review/{id}.webp",
            data={},
        )

    def _insert_recording(self, id: str, start: float):
        Recordings.create(
            id=id,
            camera="front_door",
            path=f"/media/frigate/recordings/{id}.mp4",
            start_time=self.base + start,
            end_time=self.base + start + 10,
            duration=10,
            motion=0,
            objects=0,
            dBFS=0,
            segment_size=0,
            stream_type="main",
        )

    def test_quiet_segment_kept_by_later_overlapping_alert(self):
        cleanup = self._build_cleanup(
            alerts={"pre_capture": 60, "post_capture": 60, "retain": {"mode": "all"}},
            detections={"post_capture": 60, "retain": {"mode": "motion"}},
        )
        self._insert_review("detection", "detection", 90, 100)
        self._insert_review("alert", "alert", 130, 140)
        self._insert_recording("quiet", 140)

        cleanup.expire_recordings()

        assert Recordings.get_or_none(Recordings.id == "quiet") is not None

    def test_quiet_segment_dropped_when_no_overlapping_mode_keeps_it(self):
        cleanup = self._build_cleanup(
            alerts={
                "pre_capture": 60,
                "post_capture": 60,
                "retain": {"mode": "motion"},
            },
            detections={"post_capture": 60, "retain": {"mode": "motion"}},
        )
        self._insert_review("detection", "detection", 90, 100)
        self._insert_review("alert", "alert", 130, 140)
        self._insert_recording("quiet", 140)

        cleanup.expire_recordings()

        assert Recordings.get_or_none(Recordings.id == "quiet") is None

    def test_longer_pre_capture_survives_an_earlier_shorter_review(self):
        # the detection starts after the segment even with its pre capture,
        # but the later alert's longer pre capture still reaches it
        cleanup = self._build_cleanup(
            alerts={"pre_capture": 30, "retain": {"mode": "all"}},
            detections={"pre_capture": 5, "retain": {"mode": "all"}},
        )
        self._insert_review("detection", "detection", 10, 12)
        self._insert_review("alert", "alert", 20, 25)
        self._insert_recording("early", -6)

        cleanup.expire_recordings()

        assert Recordings.get_or_none(Recordings.id == "early") is not None

    def test_longer_post_capture_survives_a_later_shorter_review(self):
        # the alert's window ends before the detection's, so skipping past
        # it must not skip the detection for later segments
        cleanup = self._build_cleanup(
            alerts={"post_capture": 5, "retain": {"mode": "motion"}},
            detections={"post_capture": 60, "retain": {"mode": "all"}},
        )
        self._insert_review("detection", "detection", 90, 100)
        self._insert_review("alert", "alert", 110, 115)
        self._insert_recording("first", 125)
        self._insert_recording("second", 135)

        cleanup.expire_recordings()

        assert Recordings.get_or_none(Recordings.id == "first") is not None
        assert Recordings.get_or_none(Recordings.id == "second") is not None


if __name__ == "__main__":
    unittest.main()
