import datetime
import logging
import os
import unittest

from fastapi import Request
from fastapi.testclient import TestClient
from peewee_migrate import Router
from playhouse.sqlite_ext import SqliteExtDatabase
from playhouse.sqliteq import SqliteQueueDatabase
from pydantic import Json

from frigate.api.fastapi_app import create_fastapi_app
from frigate.config import FrigateConfig
from frigate.const import BASE_DIR, CACHE_DIR
from frigate.models import Event, Recordings, ReviewSegment
from frigate.review.types import SeverityEnum
from frigate.test.const import TEST_DB, TEST_DB_CLEANUPS


class AuthTestClient(TestClient):
    """TestClient that automatically adds auth headers to all requests."""

    def request(self, *args, **kwargs):
        # Add default auth headers if not already present
        headers = kwargs.get("headers") or {}
        if "remote-user" not in headers:
            headers["remote-user"] = "admin"
        if "remote-role" not in headers:
            headers["remote-role"] = "admin"
        kwargs["headers"] = headers
        return super().request(*args, **kwargs)


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
            "camera_fps": 5.0,
            "process_fps": 5.0,
            "skipped_fps": 0.0,
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
                    os.path.join(BASE_DIR, "clips"): {
                        "free": 42429.9,
                        "mount_type": "ext4",
                        "total": 244529.7,
                        "used": 189607.0,
                    },
                    os.path.join(BASE_DIR, "recordings"): {
                        "free": 0.2,
                        "mount_type": "ext4",
                        "total": 8.0,
                        "used": 7.8,
                    },
                    CACHE_DIR: {
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

    def create_app(self, stats=None, event_metadata_publisher=None):
        from frigate.api.auth import get_allowed_cameras_for_filter, get_current_user

        app = create_fastapi_app(
            FrigateConfig(**self.minimal_config),
            self.db,
            None,
            None,
            None,
            None,
            stats,
            event_metadata_publisher,
            None,
            enforce_default_admin=False,
        )

        # Default test mocks for authentication
        # Tests can override these in their setUp if needed
        # This mock uses headers set by AuthTestClient
        async def mock_get_current_user(request: Request):
            username = request.headers.get("remote-user")
            role = request.headers.get("remote-role")
            if not username or not role:
                from fastapi.responses import JSONResponse

                return JSONResponse(
                    content={"message": "No authorization headers."}, status_code=401
                )
            return {"username": username, "role": role}

        async def mock_get_allowed_cameras_for_filter(request: Request):
            return list(self.minimal_config.get("cameras", {}).keys())

        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_allowed_cameras_for_filter] = (
            mock_get_allowed_cameras_for_filter
        )

        return app

    def insert_mock_event(
        self,
        id: str,
        start_time: float | None = None,
        end_time: float | None = None,
        has_clip: bool = True,
        top_score: int = 100,
        score: int = 0,
        data: Json = {},
        camera: str = "front_door",
    ) -> Event:
        """Inserts a basic event model with a given id."""
        if start_time is None:
            start_time = datetime.datetime.now().timestamp()
        if end_time is None:
            end_time = start_time + 20

        return Event.insert(
            id=id,
            label="Mock",
            camera=camera,
            start_time=start_time,
            end_time=end_time,
            top_score=top_score,
            score=score,
            false_positive=False,
            zones=list(),
            thumbnail="",
            region=[],
            box=[],
            area=0,
            has_clip=has_clip,
            has_snapshot=True,
            data=data,
        ).execute()

    def insert_mock_review_segment(
        self,
        id: str,
        start_time: float | None = None,
        end_time: float | None = None,
        severity: SeverityEnum = SeverityEnum.alert,
        data: dict | None = None,
        camera: str = "front_door",
    ) -> ReviewSegment:
        """Inserts a review segment model with a given id."""
        if start_time is None:
            start_time = datetime.datetime.now().timestamp()
        if end_time is None:
            end_time = start_time + 20
        if data is None:
            data = {}

        return ReviewSegment.insert(
            id=id,
            camera=camera,
            start_time=start_time,
            end_time=end_time,
            severity=severity,
            thumb_path=False,
            data=data,
        ).execute()

    def insert_mock_recording(
        self,
        id: str,
        start_time: float | None = None,
        end_time: float | None = None,
        motion: int = 0,
    ) -> Event:
        """Inserts a recording model with a given id."""
        if start_time is None:
            start_time = datetime.datetime.now().timestamp()
        if end_time is None:
            end_time = start_time + 20

        return Recordings.insert(
            id=id,
            path=id,
            camera="front_door",
            start_time=start_time,
            end_time=end_time,
            duration=end_time - start_time,
            motion=motion,
        ).execute()
