"""Tests that push sends cannot be aimed at internal addresses."""

import queue
import socket
import unittest
from unittest.mock import MagicMock, patch

import requests
from requests.adapters import BaseAdapter

from frigate.comms.webpush import (
    PushNotification,
    WebPushClient,
    _NoRedirectSession,
    _resolves_to_public_address,
)

ENDPOINT = "https://push.example.com/token"


def _addrinfo(address: str) -> list:
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (address, 443))]


class RedirectAdapter(BaseAdapter):
    def __init__(self):
        super().__init__()
        self.calls = 0

    def send(self, request, **kwargs):
        self.calls += 1
        response = requests.Response()
        response.status_code = 307
        response.headers["Location"] = "http://127.0.0.1:5000/api/restart"
        response.url = request.url
        response.request = request
        return response

    def close(self):
        pass


class TestNoRedirectSession(unittest.TestCase):
    def test_does_not_follow_redirects(self):
        adapter = RedirectAdapter()
        session = _NoRedirectSession()
        session.mount("https://", adapter)
        session.mount("http://", adapter)

        response = session.post(ENDPOINT, data=b"payload")

        self.assertEqual(response.status_code, 307)
        self.assertEqual(adapter.calls, 1)


class TestResolvesToPublicAddress(unittest.TestCase):
    def test_accepts_global_address(self):
        with patch("socket.getaddrinfo", return_value=_addrinfo("8.8.8.8")):
            self.assertTrue(_resolves_to_public_address(ENDPOINT))

    def test_rejects_non_global_addresses(self):
        for address in ("127.0.0.1", "10.0.0.5", "169.254.169.254", "::1"):
            with (
                self.subTest(address=address),
                patch("socket.getaddrinfo", return_value=_addrinfo(address)),
            ):
                self.assertFalse(_resolves_to_public_address(ENDPOINT))

    def test_rejects_when_any_address_is_non_global(self):
        infos = _addrinfo("8.8.8.8") + _addrinfo("127.0.0.1")

        with patch("socket.getaddrinfo", return_value=infos):
            self.assertFalse(_resolves_to_public_address(ENDPOINT))

    def test_rejects_unresolvable_host(self):
        with patch("socket.getaddrinfo", side_effect=socket.gaierror):
            self.assertFalse(_resolves_to_public_address(ENDPOINT))


class TestProcessNotifications(unittest.TestCase):
    def _client(self, pusher: MagicMock) -> WebPushClient:
        client = WebPushClient.__new__(WebPushClient)
        client.stop_event = MagicMock()
        client.stop_event.is_set.side_effect = [False, True]
        client.notification_queue = queue.Queue()
        client.notification_queue.put(
            PushNotification(user="viewer", payload={}, title="t", message="m")
        )
        client.check_registrations = MagicMock()
        client.claim_headers = {"https://push.example.com": {}}
        client.web_pushers = {"viewer": [pusher]}
        client.expired_subs = {}
        return client

    def test_skips_endpoint_resolving_to_internal_address(self):
        pusher = MagicMock()
        pusher.subscription_info = {"endpoint": ENDPOINT}
        client = self._client(pusher)

        with (
            patch("socket.getaddrinfo", return_value=_addrinfo("127.0.0.1")),
            self.assertLogs("frigate.comms.webpush", level="WARNING"),
        ):
            client._process_notifications()

        pusher.send.assert_not_called()

    def test_sends_to_public_endpoint(self):
        pusher = MagicMock()
        pusher.subscription_info = {"endpoint": ENDPOINT}
        pusher.send.return_value.status_code = 201
        client = self._client(pusher)

        with patch("socket.getaddrinfo", return_value=_addrinfo("8.8.8.8")):
            client._process_notifications()

        pusher.send.assert_called_once()


if __name__ == "__main__":
    unittest.main()
