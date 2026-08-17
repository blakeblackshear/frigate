"""Tests for independent sub stream retention in recording cleanup."""

import datetime
import unittest
from unittest.mock import MagicMock

from playhouse.sqlite_ext import SqliteExtDatabase

from frigate.config import FrigateConfig
from frigate.models import Previews, Recordings, ReviewSegment, UserReviewStatus
from frigate.record.cleanup import RecordingCleanup


class TestRecordingCleanupSubRetention(unittest.TestCase):
    def setUp(self):
        # in-memory database keeps these tests isolated from the shared
        # on-disk test.db used by the http api tests
        self.db = SqliteExtDatabase(":memory:")
        models = [Previews, Recordings, ReviewSegment, UserReviewStatus]
        self.db.bind(models)
        self.db.create_tables(models)

    def tearDown(self):
        self.db.close()

    def _build_cleanup(self, record_config: dict) -> RecordingCleanup:
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
                                },
                                {
                                    "path": "rtsp://10.0.0.1:554/video2",
                                    "roles": ["record_sub"],
                                },
                            ]
                        },
                        "record": record_config,
                    }
                },
            }
        )
        return RecordingCleanup(config, MagicMock())

    def _insert_recording(
        self,
        id: str,
        stream_type: str,
        age_days: float,
        motion: int = 0,
        camera: str = "front_door",
    ) -> None:
        end_time = (
            datetime.datetime.now() - datetime.timedelta(days=age_days)
        ).timestamp()
        Recordings.create(
            id=id,
            camera=camera,
            path=f"/media/frigate/recordings/{id}.mp4",
            start_time=end_time - 10,
            end_time=end_time,
            duration=10,
            motion=motion,
            objects=0,
            dBFS=0,
            segment_size=0,
            stream_type=stream_type,
        )

    def test_sub_recordings_expire_independently(self):
        # main retention 7 days, sub retention 30 days; rows 10 days old
        # -> main row deleted, sub row kept
        cleanup = self._build_cleanup(
            {
                "enabled": True,
                "continuous": {"days": 7},
                "sub": {"enabled": True, "continuous": {"days": 30}},
            }
        )
        self._insert_recording("m1", "main", 10)
        self._insert_recording("s1", "sub", 10)

        cleanup.expire_recordings()

        assert Recordings.get_or_none(Recordings.id == "m1") is None
        assert Recordings.get_or_none(Recordings.id == "s1") is not None

    def test_sub_recordings_expire_after_sub_retention(self):
        # sub retention 30 days; sub row 40 days old -> deleted
        cleanup = self._build_cleanup(
            {
                "enabled": True,
                "continuous": {"days": 7},
                "sub": {"enabled": True, "continuous": {"days": 30}},
            }
        )
        self._insert_recording("s_old", "sub", 40)
        self._insert_recording("s_new", "sub", 10)

        cleanup.expire_recordings()

        assert Recordings.get_or_none(Recordings.id == "s_old") is None
        assert Recordings.get_or_none(Recordings.id == "s_new") is not None

    def test_sub_recordings_overlapping_recent_reviews_survive(self):
        # sub retention shorter than main: the reviews window must reach the
        # sub pass cutoff or sub segments overlapping recent alerts are
        # deleted on the first cleanup after being stored
        cleanup = self._build_cleanup(
            {
                "enabled": True,
                "continuous": {"days": 7},
                "sub": {"enabled": True, "alerts": {"mode": "motion"}},
            }
        )
        self._insert_recording("m1", "main", 1, motion=10)
        self._insert_recording("s1", "sub", 1, motion=10)

        # alert review covering the same time window as the recordings
        recording = Recordings.get(Recordings.id == "s1")
        ReviewSegment.create(
            id="r1",
            camera="front_door",
            start_time=recording.start_time,
            end_time=recording.end_time,
            severity="alert",
            thumb_path="/media/frigate/clips/review/thumb-r1.webp",
            data={},
        )

        cleanup.expire_recordings()

        assert Recordings.get_or_none(Recordings.id == "m1") is not None
        assert Recordings.get_or_none(Recordings.id == "s1") is not None

    def test_sub_alerts_days_extends_review_and_sub_retention(self):
        # a 20-day-old alert review survives for the 60 day sub window and
        # keeps the sub row alive, but must not hold the main row past the
        # 10 day main alerts window
        cleanup = self._build_cleanup(
            {
                "enabled": True,
                "continuous": {"days": 7},
                "sub": {"enabled": True, "alerts": {"days": 60}},
            }
        )
        self._insert_recording("m1", "main", 20, motion=10)
        self._insert_recording("s1", "sub", 20, motion=10)

        # alert review covering the same time window as the recordings
        recording = Recordings.get(Recordings.id == "s1")
        ReviewSegment.create(
            id="r1",
            camera="front_door",
            start_time=recording.start_time,
            end_time=recording.end_time,
            severity="alert",
            thumb_path="/media/frigate/clips/review/thumb-r1.webp",
            data={},
        )

        cleanup.expire_recordings()

        assert ReviewSegment.get_or_none(ReviewSegment.id == "r1") is not None
        assert Recordings.get_or_none(Recordings.id == "m1") is None
        assert Recordings.get_or_none(Recordings.id == "s1") is not None

    def test_main_review_lifetime_unchanged_when_sub_disabled(self):
        # with sub recording disabled, the 20-day-old alert review expires
        # under the 10 day main alerts retention exactly as before
        cleanup = self._build_cleanup(
            {
                "enabled": True,
                "continuous": {"days": 7},
                "sub": {"enabled": False, "alerts": {"days": 60}},
            }
        )
        end_time = (datetime.datetime.now() - datetime.timedelta(days=20)).timestamp()
        ReviewSegment.create(
            id="r1",
            camera="front_door",
            start_time=end_time - 10,
            end_time=end_time,
            severity="alert",
            thumb_path="/media/frigate/clips/review/thumb-r1.webp",
            data={},
        )

        cleanup.expire_recordings()

        assert ReviewSegment.get_or_none(ReviewSegment.id == "r1") is None

    def test_disabled_sub_still_expires_old_sub_rows(self):
        # sub disabled but old sub rows remain: the sub pass still runs and
        # expires them by the sub config dates
        cleanup = self._build_cleanup(
            {
                "enabled": True,
                "continuous": {"days": 7},
                "sub": {"enabled": False, "continuous": {"days": 30}},
            }
        )
        self._insert_recording("s_old", "sub", 40)
        self._insert_recording("s_new", "sub", 10)

        cleanup.expire_recordings()

        assert Recordings.get_or_none(Recordings.id == "s_old") is None
        assert Recordings.get_or_none(Recordings.id == "s_new") is not None

    def test_deleted_camera_recordings_expire(self):
        # rows for a camera no longer in the config expire by the GLOBAL
        # record retention window; newer orphan rows and configured-camera
        # rows are untouched by the deleted-cameras sweep
        config = FrigateConfig(
            **{
                "mqtt": {"host": "mqtt"},
                "record": {"continuous": {"days": 7}},
                "cameras": {
                    "front_door": {
                        "ffmpeg": {
                            "inputs": [
                                {
                                    "path": "rtsp://10.0.0.1:554/video",
                                    "roles": ["detect", "record"],
                                },
                            ]
                        },
                        "record": {"enabled": True, "continuous": {"days": 7}},
                    }
                },
            }
        )
        cleanup = RecordingCleanup(config, MagicMock())
        self._insert_recording("gone_old", "main", 10, camera="removed_cam")
        self._insert_recording("gone_new", "main", 5, camera="removed_cam")
        self._insert_recording("gone_blank", "main", 10, camera="")
        self._insert_recording("kept", "main", 5)

        cleanup.expire_recordings()

        assert Recordings.get_or_none(Recordings.id == "gone_old") is None
        assert Recordings.get_or_none(Recordings.id == "gone_new") is not None
        # empty-string camera names sort before every real name and must
        # still be enumerated by the sweep
        assert Recordings.get_or_none(Recordings.id == "gone_blank") is None
        assert Recordings.get_or_none(Recordings.id == "kept") is not None
