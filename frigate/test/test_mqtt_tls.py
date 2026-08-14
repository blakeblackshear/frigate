"""Tests for MQTT TLS setup."""

import unittest
from unittest.mock import MagicMock, patch

from frigate.comms.mqtt import MqttClient


def _start_client(
    *,
    tls_ca_certs: str | None = None,
    tls_client_cert: str | None = None,
    tls_client_key: str | None = None,
    tls_insecure: bool | None = None,
) -> MagicMock:
    """Start an MqttClient against a mocked paho client and hand the mock back
    so the tls calls it received can be inspected."""
    config = MagicMock()
    config.cameras = {}
    config.notifications.enabled_in_config = False
    config.mqtt.topic_prefix = "frigate"
    config.mqtt.client_id = "frigate"
    config.mqtt.user = None
    config.mqtt.tls_ca_certs = tls_ca_certs
    config.mqtt.tls_client_cert = tls_client_cert
    config.mqtt.tls_client_key = tls_client_key
    config.mqtt.tls_insecure = tls_insecure

    with patch("frigate.comms.mqtt.mqtt.Client") as client_cls:
        paho_client = client_cls.return_value

        def tls_insecure_set(value: bool) -> None:
            # paho refuses this until tls_set has built the ssl context
            if not paho_client.tls_set.called:
                raise ValueError(
                    "Must configure SSL context before using tls_insecure_set."
                )

        paho_client.tls_insecure_set.side_effect = tls_insecure_set

        MqttClient(config).subscribe(MagicMock())

    return paho_client


class TestMqttTls(unittest.TestCase):
    def test_tls_untouched_when_no_tls_option_is_set(self):
        paho_client = _start_client()

        paho_client.tls_set.assert_not_called()
        paho_client.tls_insecure_set.assert_not_called()

    def test_ca_certs_are_passed_through(self):
        paho_client = _start_client(tls_ca_certs="/path/to/ca.crt")

        paho_client.tls_set.assert_called_once_with("/path/to/ca.crt")

    def test_client_certs_are_passed_with_ca_certs(self):
        paho_client = _start_client(
            tls_ca_certs="/path/to/ca.crt",
            tls_client_cert="/path/to/client.crt",
            tls_client_key="/path/to/client.key",
        )

        paho_client.tls_set.assert_called_once_with(
            "/path/to/ca.crt", "/path/to/client.crt", "/path/to/client.key"
        )

    def test_tls_insecure_alone_enables_tls(self):
        """tls_insecure on its own must still turn TLS on, otherwise paho
        raises because there is no ssl context to apply it to."""
        paho_client = _start_client(tls_insecure=True)

        paho_client.tls_set.assert_called_once_with(None)
        paho_client.tls_insecure_set.assert_called_once_with(True)

    def test_client_certs_without_ca_certs_use_system_trust_store(self):
        """A broker with a publicly trusted cert needs no ca_certs, so None is
        forwarded to paho and it falls back to the system certificates."""
        paho_client = _start_client(
            tls_client_cert="/path/to/client.crt",
            tls_client_key="/path/to/client.key",
        )

        paho_client.tls_set.assert_called_once_with(
            None, "/path/to/client.crt", "/path/to/client.key"
        )


if __name__ == "__main__":
    unittest.main()
