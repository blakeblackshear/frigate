"""Tests for user creation."""

from unittest.mock import MagicMock

from frigate.models import User
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp

PASSWORD = "a-valid-password-123"


class TestCreateUser(BaseTestHttp):
    def setUp(self):
        super().setUp([User])
        self.app = super().create_app()
        self.app.config_publisher = MagicMock()

    def _create(self, username: str):
        with AuthTestClient(self.app) as client:
            return client.post(
                "/users",
                json={"username": username, "password": PASSWORD, "role": "viewer"},
            )

    def test_rejects_dot_only_usernames(self):
        # browsers resolve these as URL path segments, so the per-user
        # endpoints can never be reached for them
        for username in (".", "..", "..."):
            assert self._create(username).status_code == 400
            assert User.get_or_none(User.username == username) is None

    def test_accepts_username_containing_dots(self):
        assert self._create("john.doe_1").status_code == 200
        assert User.get_or_none(User.username == "john.doe_1") is not None
