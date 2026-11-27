"""Tests for the event cleanup cycle and runtime camera changes."""

import datetime
import unittest
from unittest.mock import MagicMock, patch

from peewee import SqliteDatabase

from frigate.config import FrigateConfig
from frigate.events.cleanup import EventCleanup
from frigate.models import Event, Timeline
from frigate.util.file import delete_event_thumbnail


def _camera(path: str, record_days: int) -> dict:
    return {
        "ffmpeg": {"inputs": [{"path": path, "roles": ["detect", "record"]}]},
        "record": {
            "enabled": True,
            "alerts": {"retain": {"days": record_days}},
            "detections": {"retain": {"days": record_days}},
        },
    }


class TestEventCleanup(unittest.TestCase):
    def setUp(self):
        self.db = SqliteDatabase(":memory:")
        models = [Event, Timeline]
        self.db.bind(models)
        self.db.create_tables(models)

        config = FrigateConfig(
            **{
                "mqtt": {"host": "mqtt"},
                "record": {
                    "alerts": {"retain": {"days": 10}},
                    "detections": {"retain": {"days": 10}},
                },
                "cameras": {"front_door": _camera("rtsp://10.0.0.1:554/video", 10)},
            }
        )
        self.config = config
        self.cleanup = EventCleanup(config, MagicMock(), MagicMock())

    def tearDown(self):
        self.db.close()

    def _insert_event(
        self, id: str, camera: str, age_days: float, has_clip: bool = True
    ) -> None:
        end_time = (
            datetime.datetime.now() - datetime.timedelta(days=age_days)
        ).timestamp()
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
            has_clip=has_clip,
            has_snapshot=True,
            region=[],
            box=[],
            area=0,
            plus_id="",
            model_hash="",
            detector_type="cpu",
            model_type="ssd",
            data={"max_severity": "alert"},
        )

    def test_runtime_added_camera_keeps_its_own_retention(self):
        added = FrigateConfig(
            **{
                "mqtt": {"host": "mqtt"},
                "cameras": {"garage": _camera("rtsp://10.0.0.2:554/video", 30)},
            }
        ).cameras["garage"]
        self.config.cameras["garage"] = added
        self._insert_event("garage-event", "garage", age_days=20)

        self.cleanup.expire_events()

        assert Event.get(Event.id == "garage-event").has_clip is True

    def test_runtime_removed_camera_gets_global_retention(self):
        self._insert_event("front-event", "front_door", age_days=20)
        self.cleanup.camera_keys = ["front_door"]
        self.cleanup.removed_camera_labels = []
        del self.config.cameras["front_door"]

        self.cleanup.expire_events()

        # clip and snapshot both expire under the global retention
        assert self.cleanup.camera_keys == []
        assert not Event.select().where(Event.id == "front-event").exists()

    def test_expired_clips_are_only_selected_once(self):
        self._insert_event("pending", "front_door", age_days=20)
        self._insert_event("expired", "front_door", age_days=20, has_clip=False)
        self._insert_event("removed-pending", "removed", age_days=20)
        self._insert_event("removed-expired", "removed", age_days=20, has_clip=False)

        assert self.cleanup.expire_clips() == ["pending"]
        assert not Event.select().where(Event.has_clip == True).exists()

        with patch.object(Event, "update", wraps=Event.update) as update:
            assert self.cleanup.expire_clips() == []

        update.assert_not_called()

    def test_cycle_failure_does_not_stop_the_thread(self):
        self.cleanup.stop_event.wait.side_effect = [False, False, True]

        with patch.object(
            self.cleanup, "expire_events", side_effect=[RuntimeError, None]
        ) as expire_events:
            self.cleanup.run()

        assert expire_events.call_count == 2

    def test_thumbnail_unlink_error_is_reported(self):
        event = MagicMock(thumbnail="", camera="front_door", id="e1")

        with patch(
            "frigate.util.file.Path.unlink", side_effect=PermissionError
        ) as unlink:
            assert delete_event_thumbnail(event) is False

        unlink.assert_called_once()


if __name__ == "__main__":
    unittest.main()
