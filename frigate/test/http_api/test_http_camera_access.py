from unittest.mock import patch

from fastapi import HTTPException, Request
from fastapi.testclient import TestClient

from frigate.api.auth import (
    get_allowed_cameras_for_filter,
    get_current_user,
)
from frigate.models import Event, Recordings, ReviewSegment
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp

# Minimal multi-camera config used by go2rtc stream access tests.
# front_door has a stream alias "front_door_main"; back_door uses its own name.
# The "limited_user" role is restricted to front_door only.
_MULTI_CAMERA_CONFIG = {
    "mqtt": {"host": "mqtt"},
    "auth": {
        "roles": {
            "limited_user": ["front_door"],
        }
    },
    "cameras": {
        "front_door": {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}]
            },
            "detect": {"height": 1080, "width": 1920, "fps": 5},
            "live": {"streams": {"default": "front_door_main"}},
        },
        "back_door": {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.2:554/video", "roles": ["detect"]}]
            },
            "detect": {"height": 1080, "width": 1920, "fps": 5},
        },
    },
}


class TestCameraAccessEventReview(BaseTestHttp):
    def setUp(self):
        super().setUp([Event, ReviewSegment, Recordings])
        self.app = super().create_app()

        # Mock get_current_user for all tests
        async def mock_get_current_user(request: Request):
            username = request.headers.get("remote-user")
            role = request.headers.get("remote-role")
            if not username or not role:
                from fastapi.responses import JSONResponse

                return JSONResponse(
                    content={"message": "No authorization headers."}, status_code=401
                )
            return {"username": username, "role": role}

        self.app.dependency_overrides[get_current_user] = mock_get_current_user

    def tearDown(self):
        self.app.dependency_overrides.clear()
        super().tearDown()

    def test_event_camera_access(self):
        super().insert_mock_event("event1", camera="front_door")
        super().insert_mock_event("event2", camera="back_door")

        async def mock_cameras(request: Request):
            return ["front_door"]

        self.app.dependency_overrides[get_allowed_cameras_for_filter] = mock_cameras
        with AuthTestClient(self.app) as client:
            resp = client.get("/events")
            assert resp.status_code == 200
            ids = [e["id"] for e in resp.json()]
            assert "event1" in ids
            assert "event2" not in ids

        async def mock_cameras(request: Request):
            return [
                "front_door",
                "back_door",
            ]

        self.app.dependency_overrides[get_allowed_cameras_for_filter] = mock_cameras
        with AuthTestClient(self.app) as client:
            resp = client.get("/events")
            assert resp.status_code == 200
            ids = [e["id"] for e in resp.json()]
            assert "event1" in ids and "event2" in ids

    def test_review_camera_access(self):
        super().insert_mock_review_segment("rev1", camera="front_door")
        super().insert_mock_review_segment("rev2", camera="back_door")

        async def mock_cameras(request: Request):
            return ["front_door"]

        self.app.dependency_overrides[get_allowed_cameras_for_filter] = mock_cameras
        with AuthTestClient(self.app) as client:
            resp = client.get("/review")
            assert resp.status_code == 200
            ids = [r["id"] for r in resp.json()]
            assert "rev1" in ids
            assert "rev2" not in ids

        async def mock_cameras(request: Request):
            return [
                "front_door",
                "back_door",
            ]

        self.app.dependency_overrides[get_allowed_cameras_for_filter] = mock_cameras
        with AuthTestClient(self.app) as client:
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
            with AuthTestClient(self.app) as client:
                resp = client.get("/events/event1")
                assert resp.status_code == 200
                assert resp.json()["id"] == "event1"

        # Disallowed
        async def mock_require_disallowed(camera: str, request: Request = None):
            raise HTTPException(status_code=403, detail="Access denied")

        with patch("frigate.api.event.require_camera_access", mock_require_disallowed):
            with AuthTestClient(self.app) as client:
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
            with AuthTestClient(self.app) as client:
                resp = client.get("/review/rev1")
                assert resp.status_code == 200
                assert resp.json()["id"] == "rev1"

        # Disallowed
        async def mock_require_disallowed(camera: str, request: Request = None):
            raise HTTPException(status_code=403, detail="Access denied")

        with patch("frigate.api.review.require_camera_access", mock_require_disallowed):
            with AuthTestClient(self.app) as client:
                resp = client.get("/review/rev1")
                assert resp.status_code == 403

    def test_event_search_access(self):
        super().insert_mock_event("event1", camera="front_door")
        super().insert_mock_event("event2", camera="back_door")

        async def mock_cameras(request: Request):
            return ["front_door"]

        self.app.dependency_overrides[get_allowed_cameras_for_filter] = mock_cameras
        with AuthTestClient(self.app) as client:
            resp = client.get("/events", params={"cameras": "all"})
            assert resp.status_code == 200
            ids = [e["id"] for e in resp.json()]
            assert "event1" in ids
            assert "event2" not in ids

        async def mock_cameras(request: Request):
            return [
                "front_door",
                "back_door",
            ]

        self.app.dependency_overrides[get_allowed_cameras_for_filter] = mock_cameras
        with AuthTestClient(self.app) as client:
            resp = client.get("/events", params={"cameras": "all"})
            assert resp.status_code == 200
            ids = [e["id"] for e in resp.json()]
            assert "event1" in ids and "event2" in ids

    def test_event_summary_access(self):
        super().insert_mock_event("event1", camera="front_door")
        super().insert_mock_event("event2", camera="back_door")

        async def mock_cameras(request: Request):
            return ["front_door"]

        self.app.dependency_overrides[get_allowed_cameras_for_filter] = mock_cameras
        with AuthTestClient(self.app) as client:
            resp = client.get("/events/summary")
            assert resp.status_code == 200
            summary_list = resp.json()
            assert len(summary_list) == 1

        async def mock_cameras(request: Request):
            return [
                "front_door",
                "back_door",
            ]

        self.app.dependency_overrides[get_allowed_cameras_for_filter] = mock_cameras
        with AuthTestClient(self.app) as client:
            resp = client.get("/events/summary")
            summary_list = resp.json()
            assert len(summary_list) == 2


class TestGo2rtcStreamAccess(BaseTestHttp):
    """Tests for require_go2rtc_stream_access — the auth dependency on
    GET /go2rtc/streams/{stream_name}.

    go2rtc is not running in unit tests, so an authorized request returns
    500 (the proxy call fails), while an unauthorized request returns 401/403
    before the proxy is ever reached.
    """

    def _make_app(self, config_override: dict | None = None):
        """Build a test app, optionally replacing self.minimal_config."""
        if config_override is not None:
            self.minimal_config = config_override
        app = super().create_app()

        # Allow tests to control the current user via request headers.
        async def mock_get_current_user(request: Request):
            username = request.headers.get("remote-user")
            role = request.headers.get("remote-role")
            if not username or not role:
                from fastapi.responses import JSONResponse

                return JSONResponse(
                    content={"message": "No authorization headers."},
                    status_code=401,
                )
            return {"username": username, "role": role}

        app.dependency_overrides[get_current_user] = mock_get_current_user
        return app

    def setUp(self):
        super().setUp([Event, ReviewSegment, Recordings])

    def tearDown(self):
        super().tearDown()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _get_stream(
        self, app, stream_name: str, role: str = "admin", user: str = "test"
    ):
        """Issue GET /go2rtc/streams/{stream_name} with the given role."""
        with AuthTestClient(app) as client:
            return client.get(
                f"/go2rtc/streams/{stream_name}",
                headers={"remote-user": user, "remote-role": role},
            )

    # ------------------------------------------------------------------
    # Tests
    # ------------------------------------------------------------------

    def test_admin_can_access_any_stream(self):
        """Admin role bypasses camera restrictions."""
        app = self._make_app(_MULTI_CAMERA_CONFIG)
        # front_door stream — go2rtc is not running so expect 500, not 401/403
        resp = self._get_stream(app, "front_door", role="admin")
        assert resp.status_code not in (401, 403), (
            f"Admin should not be blocked; got {resp.status_code}"
        )

        # back_door stream
        resp = self._get_stream(app, "back_door", role="admin")
        assert resp.status_code not in (401, 403)

    def test_missing_auth_headers_returns_401(self):
        """Requests without auth headers must be rejected with 401."""
        app = self._make_app(_MULTI_CAMERA_CONFIG)
        # Use plain TestClient (not AuthTestClient) so no headers are injected.
        with TestClient(app, raise_server_exceptions=False) as client:
            resp = client.get("/go2rtc/streams/front_door")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"

    def test_unconfigured_role_can_access_any_stream(self):
        """When no camera restrictions are configured for a role the user
        should have access to all streams (no roles_dict entry ⇒ no restriction)."""
        no_roles_config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "front_door": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {"height": 1080, "width": 1920, "fps": 5},
                },
                "back_door": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.2:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {"height": 1080, "width": 1920, "fps": 5},
                },
            },
        }
        app = self._make_app(no_roles_config)

        # "myuser" role is not listed in roles_dict — should be allowed everywhere
        for stream in ("front_door", "back_door"):
            resp = self._get_stream(app, stream, role="myuser")
            assert resp.status_code not in (401, 403), (
                f"Unconfigured role should not be blocked on '{stream}'; "
                f"got {resp.status_code}"
            )

    def test_restricted_role_can_access_allowed_camera(self):
        """limited_user role (restricted to front_door) can access front_door stream."""
        app = self._make_app(_MULTI_CAMERA_CONFIG)
        resp = self._get_stream(app, "front_door", role="limited_user")
        assert resp.status_code not in (401, 403), (
            f"limited_user should be allowed on front_door; got {resp.status_code}"
        )

    def test_restricted_role_blocked_from_disallowed_camera(self):
        """limited_user role (restricted to front_door) cannot access back_door stream."""
        app = self._make_app(_MULTI_CAMERA_CONFIG)
        resp = self._get_stream(app, "back_door", role="limited_user")
        assert resp.status_code == 403, (
            f"limited_user should be denied on back_door; got {resp.status_code}"
        )

    def test_stream_alias_allowed_for_owning_camera(self):
        """Stream alias 'front_door_main' is owned by front_door; limited_user (who
        is allowed front_door) should be permitted."""
        app = self._make_app(_MULTI_CAMERA_CONFIG)
        # front_door_main is the alias defined in live.streams for front_door
        resp = self._get_stream(app, "front_door_main", role="limited_user")
        assert resp.status_code not in (401, 403), (
            f"limited_user should be allowed on alias front_door_main; "
            f"got {resp.status_code}"
        )

    def test_stream_alias_blocked_when_owning_camera_disallowed(self):
        """limited_user cannot access a stream alias that belongs to a camera they
        are not allowed to see."""
        # Give back_door a stream alias and restrict limited_user to front_door only
        config = {
            "mqtt": {"host": "mqtt"},
            "auth": {
                "roles": {
                    "limited_user": ["front_door"],
                }
            },
            "cameras": {
                "front_door": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {"height": 1080, "width": 1920, "fps": 5},
                },
                "back_door": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.2:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {"height": 1080, "width": 1920, "fps": 5},
                    "live": {"streams": {"default": "back_door_main"}},
                },
            },
        }
        app = self._make_app(config)
        resp = self._get_stream(app, "back_door_main", role="limited_user")
        assert resp.status_code == 403, (
            f"limited_user should be denied on alias back_door_main; "
            f"got {resp.status_code}"
        )
