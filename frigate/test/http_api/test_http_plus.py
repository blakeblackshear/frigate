"""Tests for the Frigate+ API endpoints."""

import unittest
from unittest.mock import patch

from frigate.models import Event
from frigate.plus import PlusKeyStatus
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp


class TestHttpPlusValidate(BaseTestHttp):
    def setUp(self):
        super().setUp([Event])

    def _validate(self, status: PlusKeyStatus, retry_after: int | None = None) -> dict:
        app = self.create_app()
        plus_api = app.frigate_config.plus_api

        with (
            patch.object(plus_api, "validate_key", return_value=status),
            patch.object(plus_api, "rate_limit_remaining", return_value=retry_after),
        ):
            with AuthTestClient(app) as client:
                response = client.post("/plus/validate")

        self.assertEqual(response.status_code, 200)
        return response.json()

    def test_a_valid_key(self):
        self.assertEqual(
            self._validate(PlusKeyStatus.valid), {"success": True, "status": "valid"}
        )

    def test_an_invalid_key(self):
        self.assertEqual(
            self._validate(PlusKeyStatus.invalid),
            {"success": False, "status": "invalid"},
        )

    def test_a_rate_limited_key_includes_the_wait(self):
        self.assertEqual(
            self._validate(PlusKeyStatus.rate_limited, 90),
            {"success": False, "status": "rate_limited", "retry_after": 90},
        )

    def test_viewers_cannot_validate(self):
        app = self.create_app()

        with AuthTestClient(app) as client:
            response = client.post(
                "/plus/validate",
                headers={"remote-user": "viewer", "remote-role": "viewer"},
            )

        self.assertEqual(response.status_code, 403)


if __name__ == "__main__":
    unittest.main(verbosity=2)
