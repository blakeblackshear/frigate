"""Tests for authentication endpoints."""

import os
import unittest
from unittest.mock import ANY, patch

from frigate.api.auth import (
    FAILED_LOGIN_BURST_GAP_S,
    MAX_NOTICE_USERNAME,
    MAX_OPEN_BURSTS,
    FailedLoginTracker,
    hash_password,
)
from frigate.const import JWT_SECRET_ENV_VAR
from frigate.models import User
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp


@patch.dict(os.environ, {JWT_SECRET_ENV_VAR: "test-secret"})
class TestHttpAuth(BaseTestHttp):
    def setUp(self):
        super().setUp([User])
        self.app = super().create_app()

    def tearDown(self):
        User.delete().execute()
        super().tearDown()

    def test_login_unknown_user_logs_warning(self):
        with self.assertLogs("frigate.api.auth", level="WARNING") as logs:
            with AuthTestClient(self.app) as client:
                response = client.post(
                    "/login", json={"user": "ghost", "password": "irrelevant"}
                )
        assert response.status_code == 401
        assert any("Login failed" in m and "ghost" in m for m in logs.output)

    def test_login_bad_password_logs_warning(self):
        password_hash = hash_password("correct-horse-battery", iterations=1000)
        User.insert(
            username="admin",
            password_hash=password_hash,
            role="admin",
            notification_tokens=[],
        ).execute()
        with self.assertLogs("frigate.api.auth", level="WARNING") as logs:
            with AuthTestClient(self.app) as client:
                response = client.post(
                    "/login", json={"user": "admin", "password": "wrong"}
                )
        assert response.status_code == 401
        assert any("Login failed" in m and "admin" in m for m in logs.output)


@patch.dict(os.environ, {JWT_SECRET_ENV_VAR: "test-secret"})
class TestFailedLoginNotices(BaseTestHttp):
    def setUp(self):
        super().setUp([User])
        self.app = super().create_app()
        User.insert(
            username="admin",
            password_hash=hash_password("correct-horse-battery", iterations=1000),
            role="admin",
            notification_tokens=[],
        ).execute()
        tracker_patch = patch("frigate.api.auth.failed_logins")
        self.failed_logins = tracker_patch.start()
        self.addCleanup(tracker_patch.stop)

    def tearDown(self):
        User.delete().execute()
        super().tearDown()

    def _login(self, user: str, password: str) -> int:
        with AuthTestClient(self.app) as client:
            response = client.post("/login", json={"user": user, "password": password})

        return response.status_code

    def test_unknown_user_is_recorded(self):
        self.assertEqual(self._login("ghost", "irrelevant"), 401)
        self.failed_logins.record.assert_called_once_with("ghost", ANY)

    def test_bad_password_is_recorded_as_known(self):
        self.assertEqual(self._login("admin", "wrong"), 401)
        self.failed_logins.record.assert_called_once_with("admin", ANY, known=True)

    def test_success_is_not_recorded(self):
        self.assertEqual(self._login("admin", "correct-horse-battery"), 200)
        self.failed_logins.record.assert_not_called()


class TestFailedLoginTracker(unittest.TestCase):
    def setUp(self):
        self.tracker = FailedLoginTracker()
        raise_patch = patch("frigate.api.auth.raise_notice")
        self.raise_notice = raise_patch.start()
        self.addCleanup(raise_patch.stop)

    def _scopes(self) -> list[str]:
        return [call.kwargs["scope"] for call in self.raise_notice.call_args_list]

    def _fill(self, now: float) -> None:
        for index in range(MAX_OPEN_BURSTS):
            self.tracker.record(f"ghost{index}", now)

    def test_attempts_inside_the_gap_share_a_burst(self):
        for now in (1000.0, 1010.0, 1299.0):
            self.tracker.record("admin", now)

        self.raise_notice.assert_called_with(
            "failed_login", scope="admin:1000", params={"user": "admin"}
        )
        self.assertEqual(self._scopes(), ["admin:1000"] * 3)

    def test_each_user_gets_their_own_burst(self):
        self.tracker.record("admin", 1000.0)
        self.tracker.record("ghost", 1010.0)
        self.tracker.record("admin", 1020.0)

        self.assertEqual(self._scopes(), ["admin:1000", "ghost:1010", "admin:1000"])

    def test_a_quiet_gap_opens_a_new_burst(self):
        self.tracker.record("admin", 1000.0)
        self.tracker.record("admin", 1000.0 + FAILED_LOGIN_BURST_GAP_S)

        self.assertEqual(self._scopes(), ["admin:1000", "admin:1300"])

    def test_the_gap_runs_from_the_latest_attempt(self):
        for now in (1000.0, 1200.0, 1450.0):
            self.tracker.record("admin", now)

        self.assertEqual(self._scopes(), ["admin:1000"] * 3)

    def test_quiet_users_are_forgotten(self):
        self.tracker.record("ghost", 1000.0)
        self.tracker.record("admin", 1000.0 + FAILED_LOGIN_BURST_GAP_S)

        self.assertEqual(list(self.tracker._bursts), ["admin"])

    def test_a_long_username_is_cut(self):
        self.tracker.record("x" * 500, 1000.0)

        user = self.raise_notice.call_args.kwargs["params"]["user"]
        self.assertEqual(len(user), MAX_NOTICE_USERNAME)

    def test_unknown_users_past_the_cap_get_no_notice(self):
        self._fill(1000.0)
        self.tracker.record("one-too-many", 1001.0)
        self.tracker.record("ghost0", 1002.0)

        self.assertEqual(self.raise_notice.call_count, MAX_OPEN_BURSTS + 1)
        self.assertEqual(self._scopes()[-1], "ghost0:1000")

    def test_known_users_skip_the_cap(self):
        self._fill(1000.0)
        self.tracker.record("admin", 1001.0, known=True)

        self.assertEqual(self._scopes()[-1], "admin:1001")

    def test_quiet_bursts_free_their_slots(self):
        self._fill(1000.0)
        self.tracker.record("late", 1000.0 + FAILED_LOGIN_BURST_GAP_S)

        self.assertEqual(self._scopes()[-1], "late:1300")
