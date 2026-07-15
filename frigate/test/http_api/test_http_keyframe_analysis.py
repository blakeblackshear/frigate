from unittest.mock import AsyncMock, patch

from frigate.models import Event, Recordings, ReviewSegment
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp


class TestHttpKeyframeAnalysis(BaseTestHttp):
    def setUp(self):
        super().setUp([Event, Recordings, ReviewSegment])

    def test_invalid_camera_returns_404(self):
        app = super().create_app()
        with AuthTestClient(app) as client:
            response = client.get("/keyframe_analysis?camera=does_not_exist")
            assert response.status_code == 404

    def test_record_disabled_returns_neutral(self):
        # default minimal_config has recording disabled
        app = super().create_app()
        with AuthTestClient(app) as client:
            response = client.get("/keyframe_analysis?camera=front_door")
            assert response.status_code == 200
            assert response.json()["severity"] == "record_disabled"

    def test_probes_record_input_and_returns_severity(self):
        self.minimal_config["cameras"]["front_door"]["ffmpeg"]["inputs"] = [
            {
                "path": "rtsp://10.0.0.1:554/record",
                "roles": ["detect", "record"],
            }
        ]
        self.minimal_config["cameras"]["front_door"]["record"] = {"enabled": True}
        app = super().create_app()

        canned = {
            "severity": "ok",
            "keyframe_count": 5,
            "max_gap": 1.0,
            "mean_gap": 1.0,
            "min_gap": 1.0,
            "segment_time": 10,
            "duration_observed": 4.0,
            "thresholds": {"warning": 4.0, "error": 10},
        }

        with patch(
            "frigate.api.camera.analyze_record_keyframes",
            AsyncMock(return_value=canned),
        ) as mock_probe:
            with AuthTestClient(app) as client:
                response = client.get("/keyframe_analysis?camera=front_door")

        assert response.status_code == 200
        assert response.json()["severity"] == "ok"
        # index matches the input carrying the record role ("Stream 1")
        assert response.json()["stream_index"] == 0
        # the record-role input path was probed
        assert mock_probe.await_args.args[1] == "rtsp://10.0.0.1:554/record"
