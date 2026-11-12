"""Invalid MQTT settings must enter recovery before application startup."""

import io
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import call, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from joserfc.jwk import OctKey
from peewee import SqliteDatabase

import frigate.__main__ as frigate_main
from frigate.api import auth
from frigate.config import FrigateConfig
from frigate.models import User


class TestMqttSafeMode(unittest.TestCase):
    def test_tls_insecure_true_recovers_with_authentication_available(self) -> None:
        self.assert_recovers_with_authentication(True)

    def test_tls_insecure_false_recovers_with_authentication_available(self) -> None:
        self.assert_recovers_with_authentication(False)

    def assert_recovers_with_authentication(self, insecure: bool) -> None:
        thread = threading.current_thread()
        self.addCleanup(setattr, thread, "name", thread.name)
        with tempfile.TemporaryDirectory() as directory:
            config_path = Path(directory) / "config.yml"
            database_path = str(Path(directory) / "frigate.db")
            config_path.write_text(
                "mqtt:\n"
                "  enabled: true\n"
                "  host: 10.10.10.146\n"
                f"  tls_insecure: {str(insecure).lower()}\n"
                "cameras: {}\n"
                "auth:\n"
                "  enabled: true\n"
                "  cookie_name: recovery_token\n"
                "proxy:\n"
                "  auth_secret: recovery-proxy-secret\n"
                f"database:\n  path: {database_path}\n",
                encoding="utf-8",
            )
            output = io.StringIO()
            with (
                patch.object(sys, "argv", ["frigate"]),
                patch("frigate.__main__.mp.get_context"),
                patch("frigate.__main__.mp.Event"),
                patch("frigate.__main__.faulthandler.enable"),
                patch("frigate.__main__.signal.signal"),
                patch("frigate.__main__.setup_logging"),
                patch("frigate.__main__.FrigateApp") as app,
                patch("frigate.__main__.find_config_file", return_value=config_path),
                patch(
                    "frigate.config.config.find_config_file", return_value=config_path
                ),
                patch("frigate.config.config.migrate_frigate_config"),
                patch("frigate.detectors.detector_config.load_labels", return_value={}),
                patch.object(FrigateConfig, "load", wraps=FrigateConfig.load) as load,
                patch("sys.stdout", output),
            ):
                frigate_main.main()

            self.assertEqual(
                load.call_args_list,
                [call(install=True), call(install=True, safe_load=True)],
            )
            app.return_value.start.assert_called_once_with()
            recovered = app.call_args.args[0]
            self.assertTrue(recovered.safe_mode)
            self.assertFalse(recovered.mqtt.enabled)
            self.assertEqual(recovered.cameras, {})
            self.assertTrue(recovered.auth.enabled)
            self.assertEqual(recovered.auth.cookie_name, "recovery_token")
            self.assertEqual(recovered.proxy.auth_secret, "recovery-proxy-secret")
            self.assertEqual(recovered.database.path, database_path)
            self.assertIn("tls_insecure requires tls_ca_certs", output.getvalue())
            self.assertIn("Remove tls_insecure for plaintext", output.getvalue())
            self.assertIn("CA certificate path to enable TLS", output.getvalue())
            self.assertIn("Starting Frigate in safe mode.", output.getvalue())

            # Exercise the real login and nginx auth_request backend with the
            # recovered configuration, preserving the existing user database.
            database = SqliteDatabase(
                database_path, thread_safe=False, check_same_thread=False
            )
            with database.bind_ctx([User]):
                try:
                    database.create_tables([User])
                    User.create(
                        username="admin",
                        role="admin",
                        password_hash=auth.hash_password(
                            "test-password", iterations=1000
                        ),
                        notification_tokens=[],
                    )
                    api = FastAPI()
                    api.frigate_config = recovered
                    api.auth_internal_port = recovered.networking.listen.internal_port
                    api.jwt_token = OctKey.import_key(
                        b"recovery-test-secret-32-bytes-long"
                    )
                    api.user_sessions = auth.load_user_sessions()
                    api.state.limiter = auth.limiter
                    api.include_router(auth.router)
                    headers = {
                        "x-server-port": "8971",
                        "x-proxy-secret": "recovery-proxy-secret",
                    }
                    with TestClient(api) as client:
                        denied = client.get("/auth", headers=headers)
                        self.assertEqual(denied.status_code, 401)
                        login = client.post(
                            "/login",
                            json={"user": "admin", "password": "test-password"},
                        )
                        self.assertEqual(login.status_code, 200)
                        self.assertIn("recovery_token", login.cookies)
                        authorized = client.get("/auth", headers=headers)
                        self.assertEqual(authorized.status_code, 202)
                        self.assertEqual(authorized.headers["remote-user"], "admin")
                        self.assertEqual(authorized.headers["remote-role"], "admin")
                finally:
                    database.close()
