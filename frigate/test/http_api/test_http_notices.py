"""Tests for the notices API."""

from fastapi.testclient import TestClient

from frigate.models import Notice, NoticeStats
from frigate.notices.registry import NoticeRegistry
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp

CONFIG_CHECK = "config:detect:fps-greater-than-five:camera.garage"


class TestHttpNotices(BaseTestHttp):
    def setUp(self):
        super().setUp([Notice, NoticeStats])
        self.registry = NoticeRegistry()
        self.app = self.create_app(notice_registry=self.registry)

    def client(self) -> TestClient:
        return AuthTestClient(self.app)

    def test_get_notices_orders_by_severity(self):
        self.registry.raise_notice(
            "detector_stuck", scope="ov", params={"detector": "ov"}
        )
        self.registry.raise_notice(
            "model_download_failed",
            scope="yolo/model.onnx",
            params={"file": "model.onnx", "error": "timeout"},
        )

        with self.client() as client:
            response = client.get("/notices")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [n["id"] for n in response.json()],
            ["model_download_failed:yolo/model.onnx", "detector_stuck:ov"],
        )
        self.assertEqual(response.json()[0]["severity"], "error")
        self.assertEqual(
            [n["link"] for n in response.json()], [None, "/system#general"]
        )

    def test_get_stats(self):
        self.registry.raise_notice(
            "detector_stuck", scope="ov", params={"detector": "ov"}
        )

        with self.client() as client:
            response = client.get("/notices/stats")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]["kind"], "detector_stuck")
        self.assertEqual(response.json()[0]["occurrences"], 1)

    def test_dismiss_hides_and_history_keeps_it(self):
        self.registry.raise_notice(
            "detector_stuck", scope="ov", params={"detector": "ov"}
        )

        with self.client() as client:
            response = client.post("/notices/detector_stuck:ov/dismiss")
            listed = client.get("/notices").json()
            history = client.get("/notices", params={"include_dismissed": True}).json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(listed, [])
        self.assertEqual([n["id"] for n in history], ["detector_stuck:ov"])
        self.assertIsNotNone(history[0]["dismissed_at"])

    def test_dismiss_an_id_with_a_slash(self):
        self.registry.raise_notice(
            "model_download_failed", scope="yolo/model.onnx", params={}
        )

        with self.client() as client:
            response = client.post(
                "/notices/model_download_failed:yolo/model.onnx/dismiss"
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.registry.active(), [])

    def test_dismiss_unknown_is_404(self):
        with self.client() as client:
            response = client.post("/notices/nope/dismiss")

        self.assertEqual(response.status_code, 404)

    def test_requires_admin(self):
        with TestClient(self.app) as client:
            response = client.get(
                "/notices", headers={"remote-user": "viewer", "remote-role": "viewer"}
            )

        self.assertEqual(response.status_code, 403)

    def test_dismissed_checks_are_listed_once(self):
        with self.client() as client:
            first = client.post(f"/notices/{CONFIG_CHECK}/dismiss")
            again = client.post(f"/notices/{CONFIG_CHECK}/dismiss")
            listed = client.get("/notices/dismissed_checks").json()
            history = client.get("/notices", params={"include_dismissed": True}).json()

        self.assertEqual(first.status_code, 200)
        self.assertEqual(again.status_code, 200)
        self.assertEqual([check["id"] for check in listed], [CONFIG_CHECK])
        self.assertIsNotNone(listed[0]["dismissed_at"])
        # the Health tab builds the row itself, so it never comes back as a notice
        self.assertEqual(history, [])

    def test_dismissed_checks_require_admin(self):
        with TestClient(self.app) as client:
            response = client.get(
                "/notices/dismissed_checks",
                headers={"remote-user": "viewer", "remote-role": "viewer"},
            )

        self.assertEqual(response.status_code, 403)

    def test_purge_dismissed_clears_notices_and_checks(self):
        self.registry.raise_notice(
            "detector_stuck", scope="ov", params={"detector": "ov"}
        )
        self.registry.dismiss("detector_stuck:ov")
        self.registry.dismiss(CONFIG_CHECK)

        with self.client() as client:
            response = client.delete("/notices/dismissed")
            history = client.get("/notices", params={"include_dismissed": True}).json()
            checks = client.get("/notices/dismissed_checks").json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(history, [])
        self.assertEqual(checks, [])

    def test_purge_dismissed_requires_admin(self):
        with TestClient(self.app) as client:
            response = client.delete(
                "/notices/dismissed",
                headers={"remote-user": "viewer", "remote-role": "viewer"},
            )

        self.assertEqual(response.status_code, 403)
