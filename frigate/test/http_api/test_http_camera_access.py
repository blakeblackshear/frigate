from unittest.mock import patch

from fastapi import HTTPException, Request
from fastapi.testclient import TestClient

from frigate.api.auth import (
    get_allowed_cameras_for_filter,
    get_current_user,
)
from frigate.models import Event, Recordings, ReviewSegment
from frigate.test.http_api.base_http_test import BaseTestHttp


class TestCameraAccessEventReview(BaseTestHttp):
    def setUp(self):
        super().setUp([Event, ReviewSegment, Recordings])
        self.app = super().create_app()

        # Mock get_current_user to return valid user for all tests
        async def mock_get_current_user():
            return {"username": "test_user", "role": "user"}

        self.app.dependency_overrides[get_current_user] = mock_get_current_user

    def tearDown(self):
        self.app.dependency_overrides.clear()
        super().tearDown()

    def test_event_camera_access(self):
        super().insert_mock_event("event1", camera="front_door")
        super().insert_mock_event("event2", camera="back_door")

        self.app.dependency_overrides[get_allowed_cameras_for_filter] = lambda: [
            "front_door"
        ]
        with TestClient(self.app) as client:
            resp = client.get("/events")
            assert resp.status_code == 200
            ids = [e["id"] for e in resp.json()]
            assert "event1" in ids
            assert "event2" not in ids

        self.app.dependency_overrides[get_allowed_cameras_for_filter] = lambda: [
            "front_door",
            "back_door",
        ]
        with TestClient(self.app) as client:
            resp = client.get("/events")
            assert resp.status_code == 200
            ids = [e["id"] for e in resp.json()]
            assert "event1" in ids and "event2" in ids

    def test_review_camera_access(self):
        super().insert_mock_review_segment("rev1", camera="front_door")
        super().insert_mock_review_segment("rev2", camera="back_door")

        self.app.dependency_overrides[get_allowed_cameras_for_filter] = lambda: [
            "front_door"
        ]
        with TestClient(self.app) as client:
            resp = client.get("/review")
            assert resp.status_code == 200
            ids = [r["id"] for r in resp.json()]
            assert "rev1" in ids
            assert "rev2" not in ids

        self.app.dependency_overrides[get_allowed_cameras_for_filter] = lambda: [
            "front_door",
            "back_door",
        ]
        with TestClient(self.app) as client:
            resp = client.get("/review")
            assert resp.status_code == 200
            ids = [r["id"] for r in resp.json()]
            assert "rev1" in ids and "rev2" in ids

    def test_event_single_access(self):
        super().insert_mock_event("event1", camera="front_door")

        # Allowed
        async def mock_require_allowed(camera: str, request: Request = None):
            if camera == "front_door":
                return
            raise HTTPException(status_code=403, detail="Access denied")

        with patch("frigate.api.event.require_camera_access", mock_require_allowed):
            with TestClient(self.app) as client:
                resp = client.get("/events/event1")
                assert resp.status_code == 200
                assert resp.json()["id"] == "event1"

        # Disallowed
        async def mock_require_disallowed(camera: str, request: Request = None):
            raise HTTPException(status_code=403, detail="Access denied")

        with patch("frigate.api.event.require_camera_access", mock_require_disallowed):
            with TestClient(self.app) as client:
                resp = client.get("/events/event1")
                assert resp.status_code == 403

    def test_review_single_access(self):
        super().insert_mock_review_segment("rev1", camera="front_door")

        # Allowed
        async def mock_require_allowed(camera: str, request: Request = None):
            if camera == "front_door":
                return
            raise HTTPException(status_code=403, detail="Access denied")

        with patch("frigate.api.review.require_camera_access", mock_require_allowed):
            with TestClient(self.app) as client:
                resp = client.get("/review/rev1")
                assert resp.status_code == 200
                assert resp.json()["id"] == "rev1"

        # Disallowed
        async def mock_require_disallowed(camera: str, request: Request = None):
            raise HTTPException(status_code=403, detail="Access denied")

        with patch("frigate.api.review.require_camera_access", mock_require_disallowed):
            with TestClient(self.app) as client:
                resp = client.get("/review/rev1")
                assert resp.status_code == 403

    def test_event_search_access(self):
        super().insert_mock_event("event1", camera="front_door")
        super().insert_mock_event("event2", camera="back_door")

        self.app.dependency_overrides[get_allowed_cameras_for_filter] = lambda: [
            "front_door"
        ]
        with TestClient(self.app) as client:
            resp = client.get("/events", params={"cameras": "all"})
            assert resp.status_code == 200
            ids = [e["id"] for e in resp.json()]
            assert "event1" in ids
            assert "event2" not in ids

        self.app.dependency_overrides[get_allowed_cameras_for_filter] = lambda: [
            "front_door",
            "back_door",
        ]
        with TestClient(self.app) as client:
            resp = client.get("/events", params={"cameras": "all"})
            assert resp.status_code == 200
            ids = [e["id"] for e in resp.json()]
            assert "event1" in ids and "event2" in ids

    def test_event_summary_access(self):
        super().insert_mock_event("event1", camera="front_door")
        super().insert_mock_event("event2", camera="back_door")

        self.app.dependency_overrides[get_allowed_cameras_for_filter] = lambda: [
            "front_door"
        ]
        with TestClient(self.app) as client:
            resp = client.get("/events/summary")
            assert resp.status_code == 200
            summary_list = resp.json()
            assert len(summary_list) == 1

        self.app.dependency_overrides[get_allowed_cameras_for_filter] = lambda: [
            "front_door",
            "back_door",
        ]
        with TestClient(self.app) as client:
            resp = client.get("/events/summary")
            summary_list = resp.json()
            assert len(summary_list) == 2
