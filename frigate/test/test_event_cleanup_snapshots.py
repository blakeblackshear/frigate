"""Tests for snapshot expiration in event cleanup."""

import datetime
import unittest
from unittest.mock import MagicMock, patch

from peewee import SqliteDatabase

from frigate.config import FrigateConfig
from frigate.events.cleanup import EventCleanup
from frigate.models import Event, Timeline


class TestEventCleanupSnapshots(unittest.TestCase):
    def setUp(self):
        self.db = SqliteDatabase(":memory:")
        models = [Event, Timeline]
        self.db.bind(models)
        self.db.create_tables(models)

        config = FrigateConfig(
            **{
                "mqtt": {"host": "mqtt"},
                "snapshots": {"enabled": True, "retain": {"default": 14}},
                "cameras": {
                    "front_door": {
                        "ffmpeg": {
                            "inputs": [
                                {
                                    "path": "rtsp://10.0.0.1:554/video",
                                    "roles": ["detect"],
                                },
                            ]
                        },
                    }
                },
            }
        )
        self.cleanup = EventCleanup(config, MagicMock(), MagicMock())

    def tearDown(self):
        self.db.close()

    def _insert_event(self, id: str, camera: str, has_snapshot: bool) -> None:
        end_time = (datetime.datetime.now() - datetime.timedelta(days=20)).timestamp()
        Event.create(
            id=id,
            label="person",
            camera=camera,
            start_time=end_time - 10,
            end_time=end_time,
            top_score=0.9,
            score=0.9,
            false_positive=False,
            zones=[],
            thumbnail="",
            has_clip=True,
            has_snapshot=has_snapshot,
            region=[],
            box=[],
            area=0,
            retain_indefinitely=False,
            plus_id="",
            model_hash="",
            detector_type="cpu",
            model_type="ssd",
            data={},
        )

    @patch("frigate.events.cleanup.delete_event_snapshot", return_value=True)
    def test_expired_snapshots_are_only_deleted_once(self, delete_snapshot):
        # events stay in the db while their clip is retained, so events whose
        # snapshot already expired must not be selected again
        for camera in ("front_door", "removed_camera"):
            self._insert_event(f"{camera}-pending", camera, has_snapshot=True)
            self._insert_event(f"{camera}-expired", camera, has_snapshot=False)

        self.cleanup.expire_snapshots()

        deleted = sorted(c.args[0].id for c in delete_snapshot.call_args_list)
        assert deleted == ["front_door-pending", "removed_camera-pending"]
        assert not Event.select().where(Event.has_snapshot == True).exists()

        delete_snapshot.reset_mock()
        self.cleanup.expire_snapshots()

        delete_snapshot.assert_not_called()
