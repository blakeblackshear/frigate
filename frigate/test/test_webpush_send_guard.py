"""Tests that push sends never follow redirects."""

import unittest

import requests
from requests.adapters import BaseAdapter

from frigate.comms.webpush import _NoRedirectSession

ENDPOINT = "https://push.example.com/token"


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


if __name__ == "__main__":
    unittest.main()
