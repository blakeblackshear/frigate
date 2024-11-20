import datetime
import logging
import os
import unittest

from peewee_migrate import Router
from playhouse.sqlite_ext import SqliteExtDatabase
from playhouse.sqliteq import SqliteQueueDatabase

from frigate.api.fastapi_app import create_fastapi_app
from frigate.config import FrigateConfig
from frigate.models import Event, ReviewSegment
from frigate.review.maintainer import SeverityEnum
from frigate.test.const import TEST_DB, TEST_DB_CLEANUPS


class BaseTestHttp(unittest.TestCase):
    def setUp(self, models):
        # setup clean database for each test run
        migrate_db = SqliteExtDatabase("test.db")
        del logging.getLogger("peewee_migrate").handlers[:]
        router = Router(migrate_db)
        router.run()
        migrate_db.close()
        self.db = SqliteQueueDatabase(TEST_DB)
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

    def create_app(self, stats=None):
        return create_fastapi_app(
            FrigateConfig(**self.minimal_config),
            self.db,
            None,
            None,
            None,
            None,
            None,
            stats,
            None,
        )

    def insert_mock_event(
        self,
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

    def insert_mock_review_segment(
        self,
        id: str,
        start_time: datetime.datetime = datetime.datetime.now().timestamp(),
        end_time: datetime.datetime = datetime.datetime.now().timestamp() + 20,
    ) -> Event:
        """Inserts a basic event model with a given id."""
        return ReviewSegment.insert(
            id=id,
            camera="front_door",
            start_time=start_time,
            end_time=end_time,
            has_been_reviewed=False,
            severity=SeverityEnum.alert,
            thumb_path=False,
            data={},
        ).execute()
