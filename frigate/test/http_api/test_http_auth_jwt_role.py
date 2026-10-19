"""Tests that /auth takes the role and revocation state from the user, not the JWT."""

import os
import time
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import MagicMock, Mock, patch

from joserfc import jwt

from frigate.api.auth import create_encoded_jwt, hash_password
from frigate.api.fastapi_app import create_fastapi_app
from frigate.app import FrigateApp
from frigate.config import FrigateConfig
from frigate.config.camera.updater import CameraConfigUpdatePublisher
from frigate.const import JWT_SECRET_ENV_VAR
from frigate.models import Event, Recordings, ReviewSegment, User
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp

PASSWORD = "correct-horse-battery"


@patch.dict(os.environ, {JWT_SECRET_ENV_VAR: "test-secret"})
class TestAuthJwtRole(BaseTestHttp):
    def setUp(self):
        super().setUp(models=[Event, Recordings, ReviewSegment, User])
        self.minimal_config = {
            "mqtt": {"host": "mqtt"},
            "auth": {"enabled": True, "roles": {"garage": ["front_door"]}},
            "networking": {"listen": {"internal": 5000, "external": 8971}},
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
        User.delete().execute()
        self._insert_user("admin", "admin")
        self._insert_user("bob", "garage")

    def _insert_user(self, username: str, role: str):
        User.insert(
            {
                User.username: username,
                User.role: role,
                User.password_hash: hash_password(PASSWORD, iterations=1),
                User.notification_tokens: [],
            }
        ).execute()

    def _create_app(self):
        mock_publisher = Mock(spec=CameraConfigUpdatePublisher)
        mock_publisher.publisher = MagicMock()

        return create_fastapi_app(
            FrigateConfig(**self.minimal_config),
            self.db,
            None,
            None,
            None,
            None,
            None,
            None,
            mock_publisher,
            None,
            enforce_default_admin=False,
        )

    def _token(self, app, user: str, role: str, iat: int | None = None) -> str:
        if iat is None:
            return create_encoded_jwt(
                user, role, int(time.time()) + 3600, app.jwt_token
            )

        return jwt.encode(
            {"alg": "HS256"},
            {"sub": user, "role": role, "exp": int(time.time()) + 3600, "iat": iat},
            app.jwt_token,
        )

    def _auth(self, client, token: str, source: str = "bearer"):
        headers = {"x-server-port": "8971"}
        if source == "bearer":
            headers["authorization"] = f"Bearer {token}"
        else:
            client.cookies.set("frigate_token", token)

        resp = client.get("/auth", headers=headers)
        client.cookies.clear()
        return resp

    def test_configured_role_is_accepted(self):
        app = self._create_app()
        with AuthTestClient(app) as client:
            resp = self._auth(client, self._token(app, "bob", "garage"))

        self.assertEqual(resp.status_code, 202)
        self.assertEqual(resp.headers["remote-user"], "bob")
        self.assertEqual(resp.headers["remote-role"], "garage")

    def test_role_claim_is_ignored(self):
        app = self._create_app()
        with AuthTestClient(app) as client:
            resp = self._auth(client, self._token(app, "bob", "admin"))

        self.assertEqual(resp.status_code, 202)
        self.assertEqual(resp.headers["remote-role"], "garage")

    def test_role_removed_from_config_is_rejected(self):
        User.update(role="removed_role").where(User.username == "bob").execute()
        app = self._create_app()
        with AuthTestClient(app) as client:
            for source in ("bearer", "cookie"):
                resp = self._auth(client, self._token(app, "bob", "garage"), source)
                self.assertEqual(resp.status_code, 401)
                self.assertNotIn("remote-role", resp.headers)

    def test_login_refused_for_role_removed_from_config(self):
        User.update(role="removed_role").where(User.username == "bob").execute()
        with AuthTestClient(self._create_app()) as client:
            resp = client.post("/login", json={"user": "bob", "password": PASSWORD})

        self.assertEqual(resp.status_code, 401)
        self.assertNotIn("set-cookie", resp.headers)

    def test_demoted_user_gets_new_role_on_next_request(self):
        app = self._create_app()
        token = self._token(app, "bob", "admin")
        User.update(role="admin").where(User.username == "bob").execute()
        app.user_sessions["bob"] = ("admin", None)

        with AuthTestClient(app) as client:
            self.assertEqual(self._auth(client, token).headers["remote-role"], "admin")
            resp = client.put("/users/bob/role", json={"role": "viewer"})
            self.assertEqual(resp.status_code, 200)

            for source in ("bearer", "cookie"):
                resp = self._auth(client, token, source)
                self.assertEqual(resp.status_code, 202)
                self.assertEqual(resp.headers["remote-role"], "viewer")

    def test_deleted_user_is_rejected(self):
        app = self._create_app()
        token = self._token(app, "bob", "garage")

        with AuthTestClient(app) as client:
            self.assertEqual(self._auth(client, token).status_code, 202)
            self.assertEqual(client.delete("/users/bob").status_code, 200)

            for source in ("bearer", "cookie"):
                self.assertEqual(self._auth(client, token, source).status_code, 401)

    def test_recreated_user_rejects_token_from_deleted_account(self):
        app = self._create_app()
        token = self._token(app, "bob", "garage", iat=int(time.time()) - 10)

        with AuthTestClient(app) as client:
            self.assertEqual(client.delete("/users/bob").status_code, 200)
            resp = client.post(
                "/users",
                json={"username": "bob", "password": PASSWORD, "role": "viewer"},
            )
            self.assertEqual(resp.status_code, 200)

            for source in ("bearer", "cookie"):
                self.assertEqual(self._auth(client, token, source).status_code, 401)

    def test_created_user_is_accepted(self):
        app = self._create_app()
        with AuthTestClient(app) as client:
            resp = client.post(
                "/users",
                json={"username": "carol", "password": PASSWORD, "role": "viewer"},
            )
            self.assertEqual(resp.status_code, 200)
            resp = self._auth(client, self._token(app, "carol", "viewer"))

        self.assertEqual(resp.status_code, 202)
        self.assertEqual(resp.headers["remote-role"], "viewer")

    def test_password_change_revokes_older_tokens(self):
        app = self._create_app()
        old_token = self._token(app, "bob", "garage", iat=int(time.time()) - 10)

        with AuthTestClient(app) as client:
            self.assertEqual(self._auth(client, old_token).status_code, 202)
            resp = client.put(
                "/users/bob/password",
                json={"password": "a-brand-new-password"},
            )
            self.assertEqual(resp.status_code, 200)

            for source in ("bearer", "cookie"):
                self.assertEqual(self._auth(client, old_token, source).status_code, 401)

            changed_at = app.user_sessions["bob"][1]
            resp = self._auth(client, self._token(app, "bob", "garage", changed_at))
            self.assertEqual(resp.status_code, 202)

    def test_login_in_the_same_second_as_password_change_is_valid(self):
        app = self._create_app()
        changed_at = datetime.now().replace(microsecond=500000)
        new_token = self._token(app, "bob", "garage", iat=int(changed_at.timestamp()))

        with (
            patch("frigate.api.auth.datetime") as mock_datetime,
            AuthTestClient(app) as client,
        ):
            mock_datetime.now.return_value = changed_at
            resp = client.put(
                "/users/bob/password",
                json={"password": "a-brand-new-password"},
            )
            self.assertEqual(resp.status_code, 200)

            for source in ("bearer", "cookie"):
                self.assertEqual(self._auth(client, new_token, source).status_code, 202)

    def test_own_password_change_cookie_stays_valid(self):
        app = self._create_app()
        with AuthTestClient(app) as client:
            resp = client.put(
                "/users/bob/password",
                json={"password": "a-brand-new-password", "old_password": PASSWORD},
                headers={"remote-user": "bob", "remote-role": "garage"},
            )
            self.assertEqual(resp.status_code, 200)
            new_token = resp.cookies["frigate_token"]

            resp = self._auth(client, new_token, "cookie")

        self.assertEqual(resp.status_code, 202)
        self.assertEqual(resp.headers["remote-role"], "garage")

    def test_admin_password_reset_revokes_older_tokens(self):
        config = FrigateConfig(
            **{**self.minimal_config, "auth": {"reset_admin_password": True}}
        )
        FrigateApp.init_auth(SimpleNamespace(config=config))

        app = self._create_app()
        old_token = self._token(app, "admin", "admin", iat=int(time.time()) - 10)

        with AuthTestClient(app) as client:
            for source in ("bearer", "cookie"):
                self.assertEqual(self._auth(client, old_token, source).status_code, 401)

    def test_auth_does_not_query_users(self):
        app = self._create_app()

        # expires inside the refresh window so the cookie refresh runs too
        token = jwt.encode(
            {"alg": "HS256"},
            {"sub": "bob", "role": "garage", "exp": int(time.time()) + 60, "iat": 0},
            app.jwt_token,
        )

        with (
            patch.object(User, "select", side_effect=AssertionError("db query")),
            AuthTestClient(app) as client,
        ):
            client.cookies.set("frigate_token", token)
            resp = client.get("/auth", headers={"x-server-port": "8971"})

        self.assertEqual(resp.status_code, 202)
        self.assertIn("frigate_token=", resp.headers["set-cookie"])

    def _login_cookie(self, headers: dict | None = None) -> str:
        with AuthTestClient(self._create_app()) as client:
            resp = client.post(
                "/login",
                json={"user": "bob", "password": PASSWORD},
                headers=headers or {},
            )

        self.assertEqual(resp.status_code, 200)
        return resp.headers["set-cookie"].lower()

    def test_login_cookie_is_secure_over_tls(self):
        cookie = self._login_cookie({"x-forwarded-proto": "https"})
        self.assertIn("; secure", cookie)

    def test_login_cookie_is_not_secure_over_http(self):
        cookie = self._login_cookie({"x-forwarded-proto": "http"})
        self.assertNotIn("; secure", cookie)

    def test_cookie_secure_config_forces_secure(self):
        self.minimal_config["auth"]["cookie_secure"] = True
        cookie = self._login_cookie()
        self.assertIn("; secure", cookie)

    def test_refreshed_cookie_is_secure_over_tls(self):
        app = self._create_app()
        token = jwt.encode(
            {"alg": "HS256"},
            {"sub": "bob", "exp": int(time.time()) + 60, "iat": int(time.time())},
            app.jwt_token,
        )

        with AuthTestClient(app) as client:
            client.cookies.set("frigate_token", token)
            resp = client.get(
                "/auth",
                headers={"x-server-port": "8971", "x-forwarded-proto": "https"},
            )

        self.assertEqual(resp.status_code, 202)
        self.assertIn("; secure", resp.headers["set-cookie"].lower())
