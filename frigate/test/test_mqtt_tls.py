"""Tests for MQTT TLS configuration and Paho client setup."""

import ssl
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from pydantic import ValidationError

from frigate.comms.mqtt import MqttClient
from frigate.config import MqttConfig


class TestMqttTls(unittest.TestCase):
    def create_client(self, **options):
        """Create a real Paho client without connecting to a broker."""
        config = MqttConfig(host="mqtt", **options)
        transport = MqttClient(SimpleNamespace(mqtt=config))
        self.addCleanup(transport._wake_recv.close)
        self.addCleanup(transport._wake_send.close)
        return transport._create_client()

    def ca_bundle(self) -> str:
        """Use the system trust store to exercise real TLS initialization."""
        ca_file = ssl.get_default_verify_paths().cafile
        if ca_file is None:
            self.skipTest("No system CA bundle available")
        return ca_file

    def test_plaintext_without_tls_options(self) -> None:
        client = self.create_client()

        self.assertIsNone(client._ssl_context)

    def test_plaintext_with_username_and_password(self) -> None:
        client = self.create_client(user="frigate", password="test-password")

        self.assertIsNone(client._ssl_context)
        self.assertEqual(client._username, b"frigate")
        self.assertEqual(client._password, b"test-password")

    def test_tls_insecure_requires_ca_certs(self) -> None:
        for insecure in (True, False):
            with (
                self.subTest(tls_insecure=insecure),
                self.assertRaisesRegex(ValidationError, "tls_ca_certs") as error,
            ):
                MqttConfig(host="10.10.10.146", tls_insecure=insecure)

            self.assertIn("Remove tls_insecure for plaintext", str(error.exception))
            self.assertIn("CA certificate path to enable TLS", str(error.exception))

    def test_tls_with_ca_certs_verifies_certificates_by_default(self) -> None:
        client = self.create_client(tls_ca_certs=self.ca_bundle())

        self.assertIsInstance(client._ssl_context, ssl.SSLContext)
        self.assertEqual(client._ssl_context.verify_mode, ssl.CERT_REQUIRED)
        self.assertTrue(client._ssl_context.check_hostname)

    def test_tls_with_explicit_verification_setting(self) -> None:
        for insecure in (True, False):
            with self.subTest(tls_insecure=insecure):
                client = self.create_client(
                    tls_ca_certs=self.ca_bundle(), tls_insecure=insecure
                )

                self.assertIsInstance(client._ssl_context, ssl.SSLContext)
                self.assertEqual(client._ssl_context.check_hostname, not insecure)

    def test_missing_ca_file_does_not_fall_back_to_plaintext(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(FileNotFoundError):
                self.create_client(tls_ca_certs=str(Path(directory) / "missing.pem"))

    def test_invalid_ca_file_does_not_fall_back_to_plaintext(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            ca_file = Path(directory) / "invalid.pem"
            ca_file.write_text("not a CA certificate", encoding="utf-8")

            with self.assertRaises(ssl.SSLError):
                self.create_client(tls_ca_certs=str(ca_file), tls_insecure=True)
