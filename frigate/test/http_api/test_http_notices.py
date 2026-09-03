"""Tests for the notices API."""

from fastapi.testclient import TestClient

from frigate.models import Notice, NoticeStats
from frigate.notices.registry import NoticeRegistry
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp


class TestHttpNotices(BaseTestHttp):
    def setUp(self):
        super().setUp([Notice, NoticeStats])
        self.registry = NoticeRegistry()
        self.app = self.create_app(notice_registry=self.registry)

    def client(self) -> TestClient:
        return AuthTestClient(self.app)

    def test_get_notices_orders_by_severity(self):
        self.registry.raise_notice("detector_stuck", params={"detector": "ov"})
        self.registry.raise_notice("retention_unmet", params={"needed_mb": 1})

        with self.client() as client:
            response = client.get("/notices")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [n["id"] for n in response.json()], ["retention_unmet", "detector_stuck"]
        )
        self.assertEqual(response.json()[0]["severity"], "error")

    def test_get_stats(self):
        self.registry.raise_notice("detector_stuck", params={"detector": "ov"})

        with self.client() as client:
            response = client.get("/notices/stats")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]["kind"], "detector_stuck")
        self.assertEqual(response.json()[0]["occurrences"], 1)

    def test_dismiss_event(self):
        self.registry.raise_notice("detector_stuck", params={"detector": "ov"})

        with self.client() as client:
            response = client.post("/notices/detector_stuck/dismiss")
            listed = client.get("/notices").json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(listed, [])

    def test_dismiss_unknown_is_404(self):
        with self.client() as client:
            response = client.post("/notices/nope/dismiss")

        self.assertEqual(response.status_code, 404)

    def test_dismiss_state_is_400(self):
        self.registry.raise_notice("retention_unmet", params={})

        with self.client() as client:
            response = client.post("/notices/retention_unmet/dismiss")

        self.assertEqual(response.status_code, 400)

    def test_requires_admin(self):
        with TestClient(self.app) as client:
            response = client.get(
                "/notices", headers={"remote-user": "viewer", "remote-role": "viewer"}
            )

        self.assertEqual(response.status_code, 403)
