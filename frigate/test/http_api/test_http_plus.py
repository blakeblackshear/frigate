"""Tests for the Frigate+ API endpoints."""

import unittest
from unittest.mock import patch

import numpy as np

from frigate.models import Event
from frigate.plus import PlusKeyStatus, PlusRateLimitError
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


class TestHttpPlusRateLimit(BaseTestHttp):
    """A Frigate+ rate limit reaches the client as a 429 with the wait."""

    def setUp(self):
        super().setUp([Event])
        self.app = self.create_app()
        self.plus_api = self.app.frigate_config.plus_api
        patcher = patch.object(self.plus_api, "is_active", return_value=True)
        patcher.start()
        self.addCleanup(patcher.stop)

    def _assert_rate_limited(self, response, retry_after: int | None) -> None:
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.json()["retry_after"], retry_after)
        self.assertFalse(response.json()["success"])
        self.assertEqual(
            response.headers.get("Retry-After"),
            None if retry_after is None else str(retry_after),
        )

    def test_listing_models(self):
        for retry_after in (30, None):
            with (
                self.subTest(retry_after=retry_after),
                patch.object(
                    self.plus_api,
                    "get_models",
                    side_effect=PlusRateLimitError(retry_after),
                ),
                AuthTestClient(self.app) as client,
            ):
                self._assert_rate_limited(client.get("/plus/models"), retry_after)

    def test_submitting_an_event(self):
        self.insert_mock_event("event", data={"box": [0, 0, 1, 1]})

        with (
            patch(
                "frigate.api.event.load_event_snapshot_image",
                return_value=(np.ones((10, 10, 3), np.uint8), True),
            ),
            patch.object(
                self.plus_api, "upload_image", side_effect=PlusRateLimitError(30)
            ),
            AuthTestClient(self.app) as client,
        ):
            response = client.post("/events/event/plus", json={})

        self._assert_rate_limited(response, 30)
        self.assertIsNone(Event.get(Event.id == "event").plus_id)

    def test_a_rate_limited_annotation_can_be_retried(self):
        self.insert_mock_event("event", data={"box": [0, 0, 1, 1]})
        snapshot = patch(
            "frigate.api.event.load_event_snapshot_image",
            return_value=(np.ones((10, 10, 3), np.uint8), True),
        )

        with (
            snapshot,
            patch.object(self.plus_api, "upload_image", return_value="img") as upload,
            patch.object(
                self.plus_api,
                "add_annotation",
                side_effect=[PlusRateLimitError(30), None],
            ) as annotate,
            AuthTestClient(self.app) as client,
        ):
            first = client.post("/events/event/plus", json={"include_annotation": 1})
            # the image isn't marked submitted while its annotation is missing
            self.assertIsNone(Event.get(Event.id == "event").plus_id)

            retry = client.post("/events/event/plus", json={"include_annotation": 1})

        self._assert_rate_limited(first, 30)
        self.assertEqual(retry.status_code, 200)
        self.assertEqual(retry.json()["plus_id"], "img")
        upload.assert_called_once()
        self.assertEqual(
            [call.args[0] for call in annotate.call_args_list], ["img", "img"]
        )

        event = Event.get(Event.id == "event")
        self.assertEqual(event.plus_id, "img")
        self.assertNotIn("plus_pending_id", event.data)

    def test_submitting_a_false_positive(self):
        self.insert_mock_event(
            "event", data={"box": [0, 0, 1, 1], "region": [0, 0, 1, 1], "score": 0.9}
        )
        Event.update(plus_id="plus").where(Event.id == "event").execute()

        with (
            patch.object(
                self.plus_api,
                "add_false_positive",
                side_effect=PlusRateLimitError(45),
            ),
            AuthTestClient(self.app) as client,
        ):
            response = client.put("/events/event/false_positive")

        self._assert_rate_limited(response, 45)
        self.assertFalse(Event.get(Event.id == "event").false_positive)


if __name__ == "__main__":
    unittest.main(verbosity=2)
