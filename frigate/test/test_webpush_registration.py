"""Tests for push notification subscription validation."""

import unittest

from frigate.api.notification import _validate_push_endpoint, _validate_subscription

VALID_ENDPOINTS = [
    "https://fcm.googleapis.com/fcm/send/dGhpcy1pcy1hLXRva2Vu",
    "https://updates.push.services.mozilla.com/wpush/v2/dGhpcy1pcy1hLXRva2Vu",
    "https://web.push.apple.com/dGhpcy1pcy1hLXRva2Vu",
    "https://wns2-by3p.notify.windows.com/w/?token=dGhpcy1pcy1hLXRva2Vu",
    "https://fcm.googleapis.com:443/fcm/send/dGhpcy1pcy1hLXRva2Vu",
]


def _subscription(endpoint: str) -> dict:
    return {
        "endpoint": endpoint,
        "keys": {"p256dh": "cHVibGljLWtleQ", "auth": "YXV0aC1zZWNyZXQ"},
    }


class TestValidatePushEndpoint(unittest.TestCase):
    def test_accepts_real_push_service_endpoints(self):
        for endpoint in VALID_ENDPOINTS:
            with self.subTest(endpoint=endpoint):
                self.assertIsNone(_validate_push_endpoint(endpoint))

    def test_rejects_http(self):
        self.assertIsNotNone(
            _validate_push_endpoint("http://fcm.googleapis.com/fcm/send/token")
        )

    def test_rejects_non_http_schemes(self):
        for endpoint in (
            "file:///etc/passwd",
            "ftp://example.com/token",
            "//example.com/token",
        ):
            with self.subTest(endpoint=endpoint):
                self.assertIsNotNone(_validate_push_endpoint(endpoint))

    def test_rejects_localhost(self):
        for endpoint in (
            "https://localhost/token",
            "https://localhost:443/token",
            "https://127.0.0.1/token",
            "https://[::1]/token",
        ):
            with self.subTest(endpoint=endpoint):
                self.assertIsNotNone(_validate_push_endpoint(endpoint))

    def test_rejects_private_addresses(self):
        for endpoint in (
            "https://192.168.1.10/token",
            "https://10.0.0.5/token",
            "https://172.16.0.1/token",
            "https://169.254.169.254/token",
            "https://0.0.0.0/token",
        ):
            with self.subTest(endpoint=endpoint):
                self.assertIsNotNone(_validate_push_endpoint(endpoint))

    def test_rejects_internal_hostnames(self):
        for endpoint in (
            "https://frigate/token",
            "https://nas.local/token",
            "https://push.internal/token",
            "https://host.home.arpa/token",
        ):
            with self.subTest(endpoint=endpoint):
                self.assertIsNotNone(_validate_push_endpoint(endpoint))

    def test_rejects_non_default_port(self):
        self.assertIsNotNone(
            _validate_push_endpoint("https://fcm.googleapis.com:8080/fcm/send/token")
        )

    def test_rejects_embedded_credentials(self):
        self.assertIsNotNone(
            _validate_push_endpoint(
                "https://user:pass@fcm.googleapis.com/fcm/send/token"
            )
        )

    def test_rejects_endpoint_without_path(self):
        for endpoint in ("https://fcm.googleapis.com", "https://fcm.googleapis.com/"):
            with self.subTest(endpoint=endpoint):
                self.assertIsNotNone(_validate_push_endpoint(endpoint))

    def test_rejects_endpoint_that_breaks_audience_parsing(self):
        # webpush.py locates the host by searching for a separator after index
        # 10, which raises ValueError when the url has no path at all
        endpoint = "https://fcm.googleapis.com"

        with self.assertRaises(ValueError):
            endpoint.index("/", 10)

        self.assertIsNotNone(_validate_push_endpoint(endpoint))

    def test_rejects_missing_or_non_string_endpoint(self):
        for endpoint in (None, "", 5, {"url": "https://example.com/token"}):
            with self.subTest(endpoint=endpoint):
                self.assertIsNotNone(_validate_push_endpoint(endpoint))

    def test_rejects_overlong_endpoint(self):
        self.assertIsNotNone(
            _validate_push_endpoint(f"https://fcm.googleapis.com/{'a' * 4096}")
        )


class TestValidateSubscription(unittest.TestCase):
    def test_accepts_valid_subscription(self):
        self.assertIsNone(_validate_subscription(_subscription(VALID_ENDPOINTS[0])))

    def test_accepts_extra_fields_sent_by_the_browser(self):
        sub = _subscription(VALID_ENDPOINTS[0])
        sub["expirationTime"] = None
        self.assertIsNone(_validate_subscription(sub))

    def test_rejects_non_object(self):
        for sub in ("https://fcm.googleapis.com/fcm/send/token", ["endpoint"], 5):
            with self.subTest(sub=sub):
                self.assertIsNotNone(_validate_subscription(sub))

    def test_rejects_bad_endpoint(self):
        self.assertIsNotNone(
            _validate_subscription(_subscription("https://localhost/t"))
        )

    def test_rejects_missing_keys(self):
        sub = _subscription(VALID_ENDPOINTS[0])
        del sub["keys"]
        self.assertIsNotNone(_validate_subscription(sub))

    def test_rejects_incomplete_keys(self):
        for keys in (
            {"p256dh": "cHVibGljLWtleQ"},
            {"auth": "YXV0aC1zZWNyZXQ"},
            {"p256dh": "cHVibGljLWtleQ", "auth": ""},
            {"p256dh": None, "auth": "YXV0aC1zZWNyZXQ"},
        ):
            with self.subTest(keys=keys):
                sub = _subscription(VALID_ENDPOINTS[0])
                sub["keys"] = keys
                self.assertIsNotNone(_validate_subscription(sub))


if __name__ == "__main__":
    unittest.main()
