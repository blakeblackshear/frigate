"""Tests for the analytics preview API."""

from unittest.mock import Mock, patch

from frigate.analytics import report
from frigate.analytics.collectors import hardware
from frigate.models import Notice, NoticeStats, User
from frigate.notices.registry import NoticeRegistry
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp


class TestHttpAnalytics(BaseTestHttp):
    def setUp(self):
        super().setUp([Notice, NoticeStats, User])
        stats = Mock()
        stats.get_latest_stats.return_value = self.test_stats
        self.app = self.create_app(stats=stats, notice_registry=NoticeRegistry())

        for target, name, value in (
            (report, "load_state", None),
            (hardware.hardware_prober, "probe", []),
            (hardware, "hwaccel_options", ("", [])),
        ):
            patcher = patch.object(target, name, return_value=value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def test_preview_returns_the_report_without_sending_it(self):
        with (
            patch("frigate.analytics.transport.requests.post") as post,
            AuthTestClient(self.app) as client,
        ):
            response = client.get("/analytics/preview")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["install_id"], report.PREVIEW_INSTALL_ID)
        self.assertEqual(body["schema_version"], 1)
        self.assertEqual(body["cameras"]["total"], 1)
        post.assert_not_called()

    def test_preview_is_admin_only(self):
        with AuthTestClient(self.app) as client:
            response = client.get(
                "/analytics/preview",
                headers={"remote-user": "viewer", "remote-role": "viewer"},
            )

        self.assertEqual(response.status_code, 403)
