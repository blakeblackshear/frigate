"""Tests for the go2rtc stream bitrate endpoint."""

from unittest.mock import patch

from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp


class TestHttpGo2rtcBitrate(BaseTestHttp):
    def setUp(self):
        super().setUp([])
        self.minimal_config["go2rtc"] = {
            "streams": {"front_main": ["rtsp://10.0.0.1:554/main"]}
        }
        self.minimal_config["cameras"]["front_door"]["live"] = {
            "streams": {"Main": "front_main"},
            "transcode": {
                "enabled": True,
                "qualities": [{"height": 480, "bitrate": 500}],
            },
        }
        self.app = self.create_app()

    @patch("frigate.api.camera.measure_stream_bitrate", return_value=812.4)
    def test_returns_rounded_kbps(self, mock_measure):
        with AuthTestClient(self.app) as client:
            resp = client.get("/go2rtc/streams/front_main/bitrate")

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["kbps"], 812)
        mock_measure.assert_called_once_with("front_main")

    @patch("frigate.api.camera.measure_stream_bitrate", return_value=480.0)
    def test_generated_streams_are_known(self, _):
        with AuthTestClient(self.app) as client:
            resp = client.get("/go2rtc/streams/front_door_transcode_480p/bitrate")

        self.assertEqual(resp.status_code, 200)

    @patch("frigate.api.camera.measure_stream_bitrate")
    def test_unknown_stream_is_404(self, mock_measure):
        with AuthTestClient(self.app) as client:
            resp = client.get("/go2rtc/streams/rtsp_somewhere/bitrate")

        self.assertEqual(resp.status_code, 404)
        mock_measure.assert_not_called()

    @patch("frigate.api.camera.measure_stream_bitrate", return_value=None)
    def test_no_data_is_502(self, _):
        with AuthTestClient(self.app) as client:
            resp = client.get("/go2rtc/streams/front_main/bitrate")

        self.assertEqual(resp.status_code, 502)

    def test_viewer_is_forbidden(self):
        with AuthTestClient(self.app) as client:
            resp = client.get(
                "/go2rtc/streams/front_main/bitrate",
                headers={"remote-user": "viewer", "remote-role": "viewer"},
            )

        self.assertEqual(resp.status_code, 403)
