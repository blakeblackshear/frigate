"""Tests for the same-origin check on WebSocket handshakes."""

import unittest
from unittest.mock import MagicMock

from frigate.comms.ws import OriginCheckedWebSocketApplication, WebSocket
from frigate.util.origin import origin_allowed


def ws_origin_allowed(environ: dict[str, str]) -> bool:
    return origin_allowed(
        environ.get("HTTP_ORIGIN"),
        environ.get("HTTP_HOST"),
        environ.get("HTTP_X_FORWARDED_HOST"),
    )


class TestOriginAllowed(unittest.TestCase):
    def test_missing_origin_allowed(self):
        self.assertTrue(ws_origin_allowed({"HTTP_HOST": "frigate.lan"}))

    def test_direct_access_same_origin(self):
        # nginx forwards Host without the port and X-Forwarded-Host with it
        environ = {
            "HTTP_ORIGIN": "http://192.168.1.10:5000",
            "HTTP_HOST": "192.168.1.10",
            "HTTP_X_FORWARDED_HOST": "192.168.1.10:5000",
        }
        self.assertTrue(ws_origin_allowed(environ))

    def test_default_port_origin(self):
        environ = {
            "HTTP_ORIGIN": "https://frigate.example.com",
            "HTTP_HOST": "frigate.example.com",
        }
        self.assertTrue(ws_origin_allowed(environ))

    def test_host_comparison_is_case_insensitive(self):
        environ = {
            "HTTP_ORIGIN": "https://Frigate.Example.com",
            "HTTP_HOST": "frigate.example.COM",
        }
        self.assertTrue(ws_origin_allowed(environ))

    def test_ipv6_host(self):
        environ = {"HTTP_ORIGIN": "http://[::1]:8971", "HTTP_HOST": "[::1]"}
        self.assertTrue(ws_origin_allowed(environ))

    def test_cross_origin_rejected(self):
        environ = {
            "HTTP_ORIGIN": "https://evil.example",
            "HTTP_HOST": "frigate.lan",
            "HTTP_X_FORWARDED_HOST": "frigate.lan:5000",
        }
        self.assertFalse(ws_origin_allowed(environ))

    def test_null_origin_rejected(self):
        self.assertFalse(
            ws_origin_allowed({"HTTP_ORIGIN": "null", "HTTP_HOST": "frigate.lan"})
        )

    def test_proxy_rewriting_host_with_forwarded_host(self):
        environ = {
            "HTTP_ORIGIN": "https://frigate.example.com",
            "HTTP_HOST": "10.0.0.5",
            "HTTP_X_FORWARDED_HOST": "frigate.example.com",
        }
        self.assertTrue(ws_origin_allowed(environ))

    def test_forwarded_host_list_uses_first_entry(self):
        environ = {
            "HTTP_ORIGIN": "https://frigate.example.com",
            "HTTP_HOST": "10.0.0.5",
            "HTTP_X_FORWARDED_HOST": "frigate.example.com, proxy.internal",
        }
        self.assertTrue(ws_origin_allowed(environ))

        environ["HTTP_ORIGIN"] = "https://proxy.internal"
        self.assertFalse(ws_origin_allowed(environ))

    def test_home_assistant_ingress(self):
        # HA core copies Host and sets X-Forwarded-Host to its own host
        environ = {
            "HTTP_ORIGIN": "https://ha.example.com:8123",
            "HTTP_HOST": "ha.example.com",
            "HTTP_X_FORWARDED_HOST": "ha.example.com:8123",
            "HTTP_X_INGRESS_PATH": "/api/hassio_ingress/abc123",
        }
        self.assertTrue(ws_origin_allowed(environ))

    def test_ingress_path_does_not_bypass_origin_check(self):
        environ = {
            "HTTP_ORIGIN": "https://evil.example",
            "HTTP_HOST": "frigate.example.com",
            "HTTP_X_INGRESS_PATH": "/frigate",
        }
        self.assertFalse(ws_origin_allowed(environ))

    def test_home_assistant_integration_proxy(self):
        # hass-web-proxy-lib drops Host, so Host is the integration's Frigate URL
        environ = {
            "HTTP_ORIGIN": "https://ha.example.com:8123",
            "HTTP_HOST": "frigate.lan",
            "HTTP_X_FORWARDED_HOST": "ha.example.com:8123",
        }
        self.assertTrue(ws_origin_allowed(environ))


class TestOriginCheckedWebSocketApplication(unittest.TestCase):
    def test_cross_origin_handshake_gets_403(self):
        app = OriginCheckedWebSocketApplication(handler_cls=WebSocket)
        start_response = MagicMock()
        environ = {
            "REQUEST_METHOD": "GET",
            "HTTP_ORIGIN": "https://evil.example",
            "HTTP_HOST": "frigate.lan",
        }

        self.assertEqual(app(environ, start_response), [])
        start_response.assert_called_once()
        self.assertEqual(start_response.call_args.args[0], "403 Forbidden")
        self.assertNotIn("ws4py.websocket", environ)


if __name__ == "__main__":
    unittest.main()
