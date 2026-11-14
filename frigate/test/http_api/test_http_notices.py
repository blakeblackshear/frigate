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

    def test_acknowledge_hides_and_the_hidden_list_keeps_it(self):
        self.registry.raise_notice(
            "detector_stuck", scope="ov", params={"detector": "ov"}
        )

        with self.client() as client:
            response = client.post("/notices/detector_stuck:ov/acknowledge")
            listed = client.get("/notices").json()
            hidden = client.get("/notices", params={"include_hidden": True}).json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(listed, [])
        self.assertEqual([n["id"] for n in hidden], ["detector_stuck:ov"])
        self.assertIsNotNone(hidden[0]["acknowledged_at"])

    def test_acknowledging_a_check_is_404(self):
        with self.client() as client:
            response = client.post(f"/notices/{CONFIG_CHECK}/acknowledge")

        self.assertEqual(response.status_code, 404)

    def test_mute_an_id_with_a_slash(self):
        self.registry.raise_notice(
            "model_download_failed", scope="yolo/model.onnx", params={}
        )

        with self.client() as client:
            response = client.post(
                "/notices/model_download_failed:yolo/model.onnx/mute"
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.registry.active(), [])

    def test_unknown_ids_are_404(self):
        with self.client() as client:
            responses = [
                client.post("/notices/nope/acknowledge"),
                client.post("/notices/nope/mute"),
                client.delete("/notices/nope/hidden"),
            ]

        self.assertEqual([r.status_code for r in responses], [404, 404, 404])

    def test_requires_admin(self):
        viewer = {"remote-user": "viewer", "remote-role": "viewer"}

        with TestClient(self.app) as client:
            responses = [
                client.get("/notices", headers=viewer),
                client.get("/notices/muted_checks", headers=viewer),
                client.post("/notices/detector_stuck:ov/acknowledge", headers=viewer),
                client.post("/notices/detector_stuck:ov/mute", headers=viewer),
                client.delete("/notices/detector_stuck:ov/hidden", headers=viewer),
                client.delete("/notices/hidden", headers=viewer),
            ]

        self.assertEqual([r.status_code for r in responses], [403] * 6)

    def test_muted_checks_are_listed_once(self):
        with self.client() as client:
            first = client.post(f"/notices/{CONFIG_CHECK}/mute")
            again = client.post(f"/notices/{CONFIG_CHECK}/mute")
            listed = client.get("/notices/muted_checks").json()
            hidden = client.get("/notices", params={"include_hidden": True}).json()

        self.assertEqual(first.status_code, 200)
        self.assertEqual(again.status_code, 200)
        self.assertEqual([check["id"] for check in listed], [CONFIG_CHECK])
        self.assertIsNotNone(listed[0]["muted_at"])
        # the Health tab builds the row itself, so it never comes back as a notice
        self.assertEqual(hidden, [])

    def test_unhide_one_row(self):
        self.registry.raise_notice(
            "detector_stuck", scope="ov", params={"detector": "ov"}
        )
        self.registry.mute("detector_stuck:ov")
        self.registry.mute(CONFIG_CHECK)

        with self.client() as client:
            notice = client.delete("/notices/detector_stuck:ov/hidden")
            check = client.delete(f"/notices/{CONFIG_CHECK}/hidden")
            listed = client.get("/notices").json()
            checks = client.get("/notices/muted_checks").json()

        self.assertEqual([notice.status_code, check.status_code], [200, 200])
        self.assertEqual([n["id"] for n in listed], ["detector_stuck:ov"])
        self.assertEqual(checks, [])

    def test_unhide_all_shows_notices_and_drops_check_mutes(self):
        self.registry.raise_notice(
            "detector_stuck", scope="ov", params={"detector": "ov"}
        )
        self.registry.acknowledge("detector_stuck:ov")
        self.registry.mute(CONFIG_CHECK)

        with self.client() as client:
            response = client.delete("/notices/hidden")
            listed = client.get("/notices").json()
            checks = client.get("/notices/muted_checks").json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual([n["id"] for n in listed], ["detector_stuck:ov"])
        self.assertEqual(checks, [])
