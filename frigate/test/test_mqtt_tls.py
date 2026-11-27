"""Tests for MQTT TLS configuration validation."""

import unittest
from contextlib import nullcontext

from pydantic import ValidationError

from frigate.config import MqttConfig


class TestMqttTls(unittest.TestCase):
    def test_tls_insecure_requires_tls_only_when_enabled(self) -> None:
        """Require TLS for either explicit verification flag only if MQTT is enabled."""
        for enabled in (True, False):
            for insecure in (True, False):
                expected = (
                    self.assertRaisesRegex(
                        ValidationError, "tls_insecure requires tls_ca_certs"
                    )
                    if enabled
                    else nullcontext()
                )
                with self.subTest(enabled=enabled, tls_insecure=insecure), expected:
                    MqttConfig(enabled=enabled, tls_insecure=insecure)
