"""Tests for sending a report."""

import unittest
from unittest.mock import Mock, patch

import requests

from frigate.analytics.transport import TIMEOUT_S, SendOutcome, send_report
from frigate.version import VERSION

URL = "https://example.test/report"


def post(status: int = 204, text: str = "", side_effect: Exception | None = None):
    return patch(
        "frigate.analytics.transport.requests.post",
        return_value=Mock(status_code=status, text=text),
        side_effect=side_effect,
    )


class TestSendReport(unittest.TestCase):
    def test_posts_the_body_as_json_with_a_user_agent(self):
        with post() as mock_post:
            outcome = send_report(URL, '{"a":1}')

        self.assertIs(outcome, SendOutcome.accepted)
        args, kwargs = mock_post.call_args
        self.assertEqual(args[0], URL)
        self.assertEqual(kwargs["data"], b'{"a":1}')
        self.assertEqual(kwargs["headers"]["Content-Type"], "application/json")
        self.assertEqual(kwargs["headers"]["User-Agent"], f"Frigate/{VERSION}")
        self.assertFalse(kwargs["allow_redirects"])
        self.assertEqual(kwargs["timeout"], TIMEOUT_S)

    def test_maps_statuses_to_outcomes(self):
        cases = (
            (200, SendOutcome.accepted),
            (400, SendOutcome.rejected),
            (429, SendOutcome.rate_limited),
            (302, SendOutcome.failed),
            (500, SendOutcome.failed),
        )

        for status, outcome in cases:
            with self.subTest(status=status), post(status):
                self.assertIs(send_report(URL, "{}"), outcome)

    def test_logs_the_rejection_reason(self):
        with (
            post(400, "install_id: bad"),
            self.assertLogs("frigate.analytics.transport", "WARNING") as logs,
        ):
            send_report(URL, "{}")

        self.assertIn("install_id: bad", logs.output[0])

    def test_a_network_error_fails_without_raising(self):
        with post(side_effect=requests.ConnectionError("down")):
            self.assertIs(send_report(URL, "{}"), SendOutcome.failed)
