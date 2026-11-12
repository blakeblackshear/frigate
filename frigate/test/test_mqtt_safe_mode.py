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
        """Enabled MQTT with insecure TLS alone must recover with auth available."""
        self.assert_startup_with_authentication(True, mqtt_enabled=True)

    def test_tls_insecure_false_recovers_with_authentication_available(self) -> None:
        """Enabled MQTT with secure TLS alone must recover with auth available."""
        self.assert_startup_with_authentication(False, mqtt_enabled=True)

    def test_disabled_mqtt_tls_insecure_true_preserves_cameras(self) -> None:
        """Unused insecure TLS settings must not send disabled MQTT into recovery."""
        self.assert_startup_with_authentication(True, mqtt_enabled=False)

    def test_disabled_mqtt_tls_insecure_false_preserves_cameras(self) -> None:
        """Unused secure TLS settings must not send disabled MQTT into recovery."""
        self.assert_startup_with_authentication(False, mqtt_enabled=False)

    def assert_startup_with_authentication(
        self, insecure: bool, *, mqtt_enabled: bool
    ) -> None:
        """Check CLI loading, camera availability and auth for either MQTT mode."""
        thread = threading.current_thread()
        self.addCleanup(setattr, thread, "name", thread.name)
        with tempfile.TemporaryDirectory() as directory:
            config_path = Path(directory) / "config.yml"
            database_path = str(Path(directory) / "frigate.db")
            config_path.write_text(
                "mqtt:\n"
                f"  enabled: {str(mqtt_enabled).lower()}\n"
                "  host: 192.0.2.1\n"
                f"  tls_insecure: {str(insecure).lower()}\n"
                "cameras:\n"
                "  test_camera:\n"
                "    enabled: true\n"
                "    ffmpeg:\n"
                "      inputs:\n"
                "        - path: rtsp://192.0.2.2/stream\n"
                "          roles: [detect]\n"
                "    detect:\n"
                "      enabled: true\n"
                "      width: 1280\n"
                "      height: 720\n"
                "      fps: 5\n"
                "ffmpeg:\n"
                "  hwaccel_args: []\n"
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
                patch(
                    "frigate.detectors.detector_config.load_labels",
                    return_value={0: "person"},
                ),
                patch.object(FrigateConfig, "load", wraps=FrigateConfig.load) as load,
                patch("sys.stdout", output),
            ):
                frigate_main.main()

            expected_loads = [call(install=True)]
            if mqtt_enabled:
                expected_loads.append(call(install=True, safe_load=True))
            self.assertEqual(load.call_args_list, expected_loads)
            app.return_value.start.assert_called_once_with()
            recovered = app.call_args.args[0]
            self.assertEqual(recovered.safe_mode, mqtt_enabled)
            self.assertFalse(recovered.mqtt.enabled)
            if mqtt_enabled:
                self.assertEqual(recovered.cameras, {})
                self.assertIn("tls_insecure requires tls_ca_certs", output.getvalue())
                self.assertIn("Remove tls_insecure for plaintext", output.getvalue())
                self.assertIn("CA certificate path to enable TLS", output.getvalue())
                self.assertIn("Starting Frigate in safe mode.", output.getvalue())
            else:
                self.assertEqual(recovered.mqtt.tls_insecure, insecure)
                self.assertIsNone(recovered.mqtt.tls_ca_certs)
                self.assertEqual(list(recovered.cameras), ["test_camera"])
                camera = recovered.cameras["test_camera"]
                self.assertTrue(camera.enabled)
                self.assertTrue(camera.detect.enabled)
                self.assertEqual(
                    camera.ffmpeg.inputs[0].path, "rtsp://192.0.2.2/stream"
                )
                self.assertNotIn("Starting Frigate in safe mode.", output.getvalue())
                self.assertNotIn(
                    "tls_insecure requires tls_ca_certs", output.getvalue()
                )
            self.assertTrue(recovered.auth.enabled)
            self.assertEqual(recovered.auth.cookie_name, "recovery_token")
            self.assertEqual(recovered.proxy.auth_secret, "recovery-proxy-secret")
            self.assertEqual(recovered.database.path, database_path)

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
