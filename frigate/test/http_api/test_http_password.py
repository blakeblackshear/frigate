"""Tests for password change authorization."""

from fastapi import Request

from frigate.api.auth import get_current_user, hash_password, verify_password
from frigate.models import Event, Recordings, ReviewSegment, User
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp

# Config carrying a custom role, which is the class of user the literal
# "viewer" check used to let through.
_CUSTOM_ROLE_CONFIG = {
    "mqtt": {"host": "mqtt"},
    "auth": {"roles": {"neighbor": ["front_door"]}, "hash_iterations": 10},
    "cameras": {
        "front_door": {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}]
            },
            "detect": {"height": 1080, "width": 1920, "fps": 5},
        },
    },
}

ADMIN_PASSWORD = "admin-real-password"
NEW_PASSWORD = "AttackerChosenPassword123!"


class TestUpdatePasswordAccess(BaseTestHttp):
    def setUp(self):
        super().setUp([Event, ReviewSegment, Recordings, User])
        self.minimal_config = _CUSTOM_ROLE_CONFIG
        self.app = super().create_app()
        User.insert(
            username="admin",
            password_hash=hash_password(ADMIN_PASSWORD, iterations=10),
            role="admin",
            notification_tokens=[],
        ).execute()

        async def mock_get_current_user(request: Request):
            return {
                "username": request.headers.get("remote-user"),
                "role": request.headers.get("remote-role"),
            }

        self.app.dependency_overrides[get_current_user] = mock_get_current_user

    def tearDown(self):
        self.app.dependency_overrides.clear()
        super().tearDown()

    def _change_password(self, actor: str, role: str, target: str, old_password: str):
        with AuthTestClient(self.app) as client:
            return client.put(
                f"/users/{target}/password",
                json={"password": NEW_PASSWORD, "old_password": old_password},
                headers={"remote-user": actor, "remote-role": role},
            )

    def _admin_password_unchanged(self) -> bool:
        return verify_password(ADMIN_PASSWORD, User.get_by_id("admin").password_hash)

    def test_custom_role_cannot_target_another_account(self):
        resp = self._change_password("neighbor", "neighbor", "admin", "wrong-guess")
        assert resp.status_code == 403
        assert self._admin_password_unchanged()

    def test_custom_role_cannot_target_another_account_with_correct_password(self):
        # The 403 must land before old_password is checked, so knowing the
        # target's password is not a way through
        resp = self._change_password("neighbor", "neighbor", "admin", ADMIN_PASSWORD)
        assert resp.status_code == 403
        assert self._admin_password_unchanged()

    def test_viewer_cannot_target_another_account(self):
        resp = self._change_password("viewer_user", "viewer", "admin", ADMIN_PASSWORD)
        assert resp.status_code == 403
        assert self._admin_password_unchanged()

    def test_admin_can_target_another_account(self):
        User.insert(
            username="neighbor",
            password_hash=hash_password("neighbor-password", iterations=10),
            role="neighbor",
            notification_tokens=[],
        ).execute()

        resp = self._change_password("admin", "admin", "neighbor", "")
        assert resp.status_code == 200

    def test_non_admin_can_change_own_password(self):
        User.insert(
            username="neighbor",
            password_hash=hash_password("neighbor-password", iterations=10),
            role="neighbor",
            notification_tokens=[],
        ).execute()

        resp = self._change_password(
            "neighbor", "neighbor", "neighbor", "neighbor-password"
        )
        assert resp.status_code == 200

    def test_non_admin_own_password_still_requires_old_password(self):
        User.insert(
            username="neighbor",
            password_hash=hash_password("neighbor-password", iterations=10),
            role="neighbor",
            notification_tokens=[],
        ).execute()

        resp = self._change_password("neighbor", "neighbor", "neighbor", "wrong-guess")
        assert resp.status_code == 401
