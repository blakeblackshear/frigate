"""Tests for notification registration and the admin row it relies on."""

from types import SimpleNamespace

from frigate.app import FrigateApp
from frigate.config import FrigateConfig
from frigate.models import User
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp

SUBSCRIPTION = {
    "endpoint": "https://fcm.googleapis.com/fcm/send/dGhpcy1pcy1hLXRva2Vu",
    "keys": {"p256dh": "cHVibGljLWtleQ", "auth": "YXV0aC1zZWNyZXQ"},
}


class TestNotificationRegistration(BaseTestHttp):
    def setUp(self):
        super().setUp([User])

    def _init_auth(self, enabled: bool) -> FrigateConfig:
        config = FrigateConfig(**{**self.minimal_config, "auth": {"enabled": enabled}})
        FrigateApp.init_auth(SimpleNamespace(config=config))
        return config

    def _register(self):
        self.minimal_config["auth"] = {"enabled": False}
        with AuthTestClient(self.create_app()) as client:
            return client.post("/notifications/register", json={"sub": SUBSCRIPTION})

    def test_auth_disabled_fresh_install_persists_token(self):
        self._init_auth(enabled=False)

        assert self._register().status_code == 200
        admin = User.get(User.username == "admin")
        assert admin.password_hash == ""
        assert admin.notification_tokens == [SUBSCRIPTION]

    def test_auth_disabled_does_not_recreate_deleted_admin(self):
        User.insert(
            username="viewer1",
            role="viewer",
            password_hash="x$1$y$z",
            notification_tokens=[],
        ).execute()
        self._init_auth(enabled=False)

        assert User.get_or_none(User.username == "admin") is None
        assert self._register().status_code == 404

    def test_enabling_auth_sets_password_and_keeps_tokens(self):
        self._init_auth(enabled=False)
        assert self._register().status_code == 200

        config = self._init_auth(enabled=True)

        admin = User.get(User.username == "admin")
        assert admin.password_hash.count("$") == 3
        assert admin.notification_tokens == [SUBSCRIPTION]
        assert config.auth.admin_first_time_login is True
