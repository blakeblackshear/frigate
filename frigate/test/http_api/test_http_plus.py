"""Tests for the Frigate+ API endpoints."""

import unittest
from unittest.mock import patch

from frigate.models import Event
from frigate.plus import PlusKeyStatus
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp


class TestHttpPlusValidate(BaseTestHttp):
    def setUp(self):
        super().setUp([Event])

    def _validate(self, status: PlusKeyStatus) -> dict:
        app = self.create_app()

        with patch.object(
            app.frigate_config.plus_api, "validate_key", return_value=status
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
