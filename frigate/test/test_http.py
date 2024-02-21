import datetime
import json
import logging
import os
import unittest
from unittest.mock import Mock

from peewee_migrate import Router
from playhouse.shortcuts import model_to_dict
from playhouse.sqlite_ext import SqliteExtDatabase
from playhouse.sqliteq import SqliteQueueDatabase

from frigate.config import FrigateConfig
from frigate.http import create_app
from frigate.models import Event, Recordings
from frigate.plus import PlusApi
from frigate.stats.emitter import StatsEmitter
from frigate.test.const import TEST_DB, TEST_DB_CLEANUPS


class TestHttp(unittest.TestCase):
    def setUp(self):
        # setup clean database for each test run
        migrate_db = SqliteExtDatabase("test.db")
        del logging.getLogger("peewee_migrate").handlers[:]
        router = Router(migrate_db)
        router.run()
        migrate_db.close()
        self.db = SqliteQueueDatabase(TEST_DB)
        models = [Event, Recordings]
        self.db.bind(models)

        self.minimal_config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "front_door": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }
        self.test_stats = {
            "detection_fps": 13.7,
            "detectors": {
                "cpu1": {
                    "detection_start": 0.0,
                    "inference_speed": 91.43,
                    "pid": 42,
                },
                "cpu2": {
                    "detection_start": 0.0,
                    "inference_speed": 84.99,
                    "pid": 44,
                },
            },
            "front_door": {
                "camera_fps": 0.0,
                "capture_pid": 53,
                "detection_fps": 0.0,
                "pid": 52,
                "process_fps": 0.0,
                "skipped_fps": 0.0,
            },
            "service": {
                "storage": {
                    "/dev/shm": {
                        "free": 50.5,
                        "mount_type": "tmpfs",
                        "total": 67.1,
                        "used": 16.6,
                    },
                    "/media/frigate/clips": {
                        "free": 42429.9,
                        "mount_type": "ext4",
                        "total": 244529.7,
                        "used": 189607.0,
                    },
                    "/media/frigate/recordings": {
                        "free": 0.2,
                        "mount_type": "ext4",
                        "total": 8.0,
                        "used": 7.8,
                    },
                    "/tmp/cache": {
                        "free": 976.8,
                        "mount_type": "tmpfs",
                        "total": 1000.0,
                        "used": 23.2,
                    },
                },
                "uptime": 101113,
                "version": "0.10.1",
                "latest_version": "0.11",
            },
        }

    def tearDown(self):
        if not self.db.is_closed():
            self.db.close()

        try:
            for file in TEST_DB_CLEANUPS:
                os.remove(file)
        except OSError:
            pass

    def test_get_event_list(self):
        app = create_app(
            FrigateConfig(**self.minimal_config),
            self.db,
            None,
            None,
            None,
            None,
            PlusApi(),
            None,
        )
        id = "123456.random"
        id2 = "7890.random"

        with app.test_client() as client:
            _insert_mock_event(id)
            events = client.get("/events").json
            assert events
            assert len(events) == 1
            assert events[0]["id"] == id
            _insert_mock_event(id2)
            events = client.get("/events").json
            assert events
            assert len(events) == 2
            events = client.get(
                "/events",
                query_string={"limit": 1},
            ).json
            assert events
            assert len(events) == 1
            events = client.get(
                "/events",
                query_string={"has_clip": 0},
            ).json
            assert not events

    def test_get_good_event(self):
        app = create_app(
            FrigateConfig(**self.minimal_config),
            self.db,
            None,
            None,
            None,
            None,
            PlusApi(),
            None,
        )
        id = "123456.random"

        with app.test_client() as client:
            _insert_mock_event(id)
            event = client.get(f"/events/{id}").json

        assert event
        assert event["id"] == id
        assert event == model_to_dict(Event.get(Event.id == id))

    def test_get_bad_event(self):
        app = create_app(
            FrigateConfig(**self.minimal_config),
            self.db,
            None,
            None,
            None,
            None,
            PlusApi(),
            None,
        )
        id = "123456.random"
        bad_id = "654321.other"

        with app.test_client() as client:
            _insert_mock_event(id)
            event = client.get(f"/events/{bad_id}").json

        assert not event

    def test_delete_event(self):
        app = create_app(
            FrigateConfig(**self.minimal_config),
            self.db,
            None,
            None,
            None,
            None,
            PlusApi(),
            None,
        )
        id = "123456.random"

        with app.test_client() as client:
            _insert_mock_event(id)
            event = client.get(f"/events/{id}").json
            assert event
            assert event["id"] == id
            client.delete(f"/events/{id}")
            event = client.get(f"/events/{id}").json
            assert not event

    def test_event_retention(self):
        app = create_app(
            FrigateConfig(**self.minimal_config),
            self.db,
            None,
            None,
            None,
            None,
            PlusApi(),
            None,
        )
        id = "123456.random"

        with app.test_client() as client:
            _insert_mock_event(id)
            client.post(f"/events/{id}/retain")
            event = client.get(f"/events/{id}").json
            assert event
            assert event["id"] == id
            assert event["retain_indefinitely"] is True
            client.delete(f"/events/{id}/retain")
            event = client.get(f"/events/{id}").json
            assert event
            assert event["id"] == id
            assert event["retain_indefinitely"] is False

    def test_event_time_filtering(self):
        app = create_app(
            FrigateConfig(**self.minimal_config),
            self.db,
            None,
            None,
            None,
            None,
            PlusApi(),
            None,
        )
        morning_id = "123456.random"
        evening_id = "654321.random"
        morning = 1656590400  # 06/30/2022 6 am (GMT)
        evening = 1656633600  # 06/30/2022 6 pm (GMT)

        with app.test_client() as client:
            _insert_mock_event(morning_id, morning)
            _insert_mock_event(evening_id, evening)
            # both events come back
            events = client.get("/events").json
            assert events
            assert len(events) == 2
            # morning event is excluded
            events = client.get(
                "/events",
                query_string={"time_range": "07:00,24:00"},
            ).json
            assert events
            # assert len(events) == 1
            # evening event is excluded
            events = client.get(
                "/events",
                query_string={"time_range": "00:00,18:00"},
            ).json
            assert events
            assert len(events) == 1

    def test_set_delete_sub_label(self):
        app = create_app(
            FrigateConfig(**self.minimal_config),
            self.db,
            None,
            None,
            None,
            None,
            PlusApi(),
            None,
        )
        id = "123456.random"
        sub_label = "sub"

        with app.test_client() as client:
            _insert_mock_event(id)
            client.post(
                f"/events/{id}/sub_label",
                data=json.dumps({"subLabel": sub_label}),
                content_type="application/json",
            )
            event = client.get(f"/events/{id}").json
            assert event
            assert event["id"] == id
            assert event["sub_label"] == sub_label
            client.post(
                f"/events/{id}/sub_label",
                data=json.dumps({"subLabel": ""}),
                content_type="application/json",
            )
            event = client.get(f"/events/{id}").json
            assert event
            assert event["id"] == id
            assert event["sub_label"] == ""

    def test_sub_label_list(self):
        app = create_app(
            FrigateConfig(**self.minimal_config),
            self.db,
            None,
            None,
            None,
            None,
            PlusApi(),
            None,
        )
        id = "123456.random"
        sub_label = "sub"

        with app.test_client() as client:
            _insert_mock_event(id)
            client.post(
                f"/events/{id}/sub_label",
                data=json.dumps({"subLabel": sub_label}),
                content_type="application/json",
            )
            sub_labels = client.get("/sub_labels").json
            assert sub_labels
            assert sub_labels == [sub_label]

    def test_config(self):
        app = create_app(
            FrigateConfig(**self.minimal_config).runtime_config(),
            self.db,
            None,
            None,
            None,
            None,
            PlusApi(),
            None,
        )

        with app.test_client() as client:
            config = client.get("/config").json
            assert config
            assert config["cameras"]["front_door"]

    def test_recordings(self):
        app = create_app(
            FrigateConfig(**self.minimal_config).runtime_config(),
            self.db,
            None,
            None,
            None,
            None,
            PlusApi(),
            None,
        )
        id = "123456.random"

        with app.test_client() as client:
            _insert_mock_recording(id)
            recording = client.get("/front_door/recordings").json
            assert recording
            assert recording[0]["id"] == id

    def test_stats(self):
        stats = Mock(spec=StatsEmitter)
        stats.get_latest_stats.return_value = self.test_stats
        app = create_app(
            FrigateConfig(**self.minimal_config).runtime_config(),
            self.db,
            None,
            None,
            None,
            None,
            PlusApi(),
            stats,
        )

        with app.test_client() as client:
            full_stats = client.get("/stats").json
            assert full_stats == self.test_stats


def _insert_mock_event(
    id: str,
    start_time: datetime.datetime = datetime.datetime.now().timestamp(),
) -> Event:
    """Inserts a basic event model with a given id."""
    return Event.insert(
        id=id,
        label="Mock",
        camera="front_door",
        start_time=start_time,
        end_time=start_time + 20,
        top_score=100,
        false_positive=False,
        zones=list(),
        thumbnail="",
        region=[],
        box=[],
        area=0,
        has_clip=True,
        has_snapshot=True,
    ).execute()


def _insert_mock_recording(id: str) -> Event:
    """Inserts a basic recording model with a given id."""
    return Recordings.insert(
        id=id,
        camera="front_door",
        path=f"/recordings/{id}",
        start_time=datetime.datetime.now().timestamp() - 50,
        end_time=datetime.datetime.now().timestamp() - 60,
        duration=10,
        motion=True,
        objects=True,
    ).execute()
