"""Tests for authentication endpoints."""

import os
from unittest.mock import patch

from frigate.api.auth import hash_password
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
