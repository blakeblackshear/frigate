"""Tests for sub stream retention extending event clip lifetimes."""

import datetime
import unittest
from unittest.mock import MagicMock

from playhouse.sqlite_ext import SqliteExtDatabase

from frigate.config import FrigateConfig
from frigate.events.cleanup import EventCleanup
from frigate.models import Event, Timeline


class TestEventCleanupSubRetention(unittest.TestCase):
    def setUp(self):
        # in-memory database keeps these tests isolated from the shared
        # on-disk test.db used by the http api tests
        self.db = SqliteExtDatabase(":memory:")
        models = [Event, Timeline]
        self.db.bind(models)
        self.db.create_tables(models)

    def tearDown(self):
        self.db.close()

    def _build_cleanup(self, record_config: dict) -> EventCleanup:
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
        return EventCleanup(config, MagicMock(), MagicMock())

    def _insert_event(self, id: str, age_days: float, severity: str = "alert") -> None:
        end_time = (
            datetime.datetime.now() - datetime.timedelta(days=age_days)
        ).timestamp()
        Event.create(
            id=id,
            label="person",
            camera="front_door",
            start_time=end_time - 10,
            end_time=end_time,
            top_score=0.9,
            score=0.9,
            false_positive=False,
            zones=[],
            thumbnail="",
            has_clip=True,
            has_snapshot=False,
            region=[],
            box=[],
            area=0,
            retain_indefinitely=False,
            plus_id="",
            model_hash="",
            detector_type="cpu",
            model_type="ssd",
            data={"max_severity": severity},
        )

    def test_sub_alerts_days_extends_event_clip_retention(self):
        # a 20-day-old alert event keeps its clip for the 60 day sub window
        # so Explore stays coherent with the surviving sub recordings
        cleanup = self._build_cleanup(
            {
                "enabled": True,
                "alerts": {"retain": {"days": 10}},
                "sub": {"enabled": True, "alerts": {"days": 60}},
            }
        )
        self._insert_event("e1", 20)

        expired = cleanup.expire_clips()

        assert "e1" not in expired
        assert Event.get(Event.id == "e1").has_clip is True

    def test_event_clip_expires_when_sub_disabled(self):
        # with sub recording disabled, the 20-day-old alert event expires
        # under the 10 day main alerts retention exactly as before
        cleanup = self._build_cleanup(
            {
                "enabled": True,
                "alerts": {"retain": {"days": 10}},
                "sub": {"enabled": False, "alerts": {"days": 60}},
            }
        )
        self._insert_event("e1", 20)

        expired = cleanup.expire_clips()

        assert "e1" in expired
        assert Event.get(Event.id == "e1").has_clip is False

    def test_sub_detections_days_extends_event_clip_retention(self):
        # detection severity uses the sub detections window
        cleanup = self._build_cleanup(
            {
                "enabled": True,
                "detections": {"retain": {"days": 10}},
                "sub": {"enabled": True, "detections": {"days": 60}},
            }
        )
        self._insert_event("e1", 20, severity="detection")

        expired = cleanup.expire_clips()

        assert "e1" not in expired
        assert Event.get(Event.id == "e1").has_clip is True
