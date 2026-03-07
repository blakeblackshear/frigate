from unittest.mock import Mock

from frigate.models import Recordings
from frigate.stats.emitter import StatsEmitter
from frigate.storage import StorageMaintainer
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp


class TestHttpRecordingsStorage(BaseTestHttp):
    def setUp(self):
        super().setUp([Recordings])

    def _build_app(self):
        stats = Mock(spec=StatsEmitter)
        stats.get_latest_stats.return_value = self.test_stats

        app = super().create_app(stats)
        app.storage_maintainer = StorageMaintainer(app.frigate_config, Mock())
        return app

    def test_recordings_storage_default_only(self):
        app = self._build_app()

        Recordings.insert(
            id="front_default_1",
            path="/media/frigate/recordings/front_door/2024-01-01/00.00.mp4",
            camera="front_door",
            start_time=100,
            end_time=110,
            duration=10,
            motion=1,
            segment_size=100,
        ).execute()

        with AuthTestClient(app) as client:
            response = client.get("/recordings/storage")
            assert response.status_code == 200
            payload = response.json()

        # Backward-compatible top-level camera map
        assert payload["front_door"]["usage"] == 100

        # New structured response
        assert "cameras" in payload
        assert "recording_roots" in payload
        assert payload["cameras"]["front_door"]["usage"] == 100

        roots = {root["path"]: root for root in payload["recording_roots"]}
        assert len(roots) == 1
        assert roots["/media/frigate/recordings"]["is_default"] is True
        assert roots["/media/frigate/recordings"]["cameras"] == ["front_door"]
        assert roots["/media/frigate/recordings"]["configured_cameras"] == [
            "front_door"
        ]
        assert (
            roots["/media/frigate/recordings"]["camera_usages"]["front_door"]["usage"]
            == 100
        )

    def test_recordings_storage_mixed_default_and_custom_roots(self):
        self.minimal_config["cameras"]["back_yard"] = {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.2:554/video", "roles": ["detect"]}]
            },
            "detect": {"height": 1080, "width": 1920, "fps": 5},
            "path": "/mnt/slow-recordings",
        }

        self.test_stats["service"]["storage"]["/mnt/slow-recordings"] = {
            "free": 3000,
            "mount_type": "ext4",
            "total": 4000,
            "used": 1000,
        }

        app = self._build_app()

        Recordings.insert_many(
            [
                {
                    "id": "front_default_1",
                    "path": "/media/frigate/recordings/front_door/2024-01-01/00.00.mp4",
                    "camera": "front_door",
                    "start_time": 100,
                    "end_time": 110,
                    "duration": 10,
                    "motion": 1,
                    "segment_size": 100,
                },
                {
                    "id": "back_custom_1",
                    "path": "/mnt/slow-recordings/back_yard/2024-01-01/00.00.mp4",
                    "camera": "back_yard",
                    "start_time": 200,
                    "end_time": 210,
                    "duration": 10,
                    "motion": 1,
                    "segment_size": 250,
                },
            ]
        ).execute()

        with AuthTestClient(app) as client:
            payload = client.get("/recordings/storage").json()

        roots = {root["path"]: root for root in payload["recording_roots"]}
        assert len(roots) == 2
        assert roots["/media/frigate/recordings"]["recordings_size"] == 100
        assert roots["/mnt/slow-recordings"]["recordings_size"] == 250
        assert roots["/mnt/slow-recordings"]["is_default"] is False
        assert roots["/mnt/slow-recordings"]["cameras"] == ["back_yard"]

    def test_recordings_storage_multiple_cameras_share_custom_root(self):
        self.minimal_config["cameras"]["back_yard"] = {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.2:554/video", "roles": ["detect"]}]
            },
            "detect": {"height": 1080, "width": 1920, "fps": 5},
            "path": "/mnt/shared-recordings",
        }
        self.minimal_config["cameras"]["garage"] = {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.3:554/video", "roles": ["detect"]}]
            },
            "detect": {"height": 1080, "width": 1920, "fps": 5},
            "path": "/mnt/shared-recordings",
        }

        self.test_stats["service"]["storage"]["/mnt/shared-recordings"] = {
            "free": 800,
            "mount_type": "ext4",
            "total": 2000,
            "used": 1200,
        }

        app = self._build_app()

        Recordings.insert_many(
            [
                {
                    "id": "back_1",
                    "path": "/mnt/shared-recordings/back_yard/2024-01-01/00.00.mp4",
                    "camera": "back_yard",
                    "start_time": 100,
                    "end_time": 110,
                    "duration": 10,
                    "motion": 1,
                    "segment_size": 300,
                },
                {
                    "id": "garage_1",
                    "path": "/mnt/shared-recordings/garage/2024-01-01/00.00.mp4",
                    "camera": "garage",
                    "start_time": 200,
                    "end_time": 210,
                    "duration": 10,
                    "motion": 1,
                    "segment_size": 500,
                },
            ]
        ).execute()

        with AuthTestClient(app) as client:
            payload = client.get("/recordings/storage").json()

        shared_root = next(
            root
            for root in payload["recording_roots"]
            if root["path"] == "/mnt/shared-recordings"
        )

        assert shared_root["recordings_size"] == 800
        assert shared_root["cameras"] == ["back_yard", "garage"]
        assert set(shared_root["camera_usages"].keys()) == {"back_yard", "garage"}

    def test_recordings_storage_historical_path_migration_splits_usage_by_db_path(self):
        self.minimal_config["cameras"]["front_door"]["path"] = "/mnt/new-root"

        self.test_stats["service"]["storage"]["/mnt/new-root"] = {
            "free": 700,
            "mount_type": "ext4",
            "total": 1000,
            "used": 300,
        }

        app = self._build_app()

        Recordings.insert_many(
            [
                {
                    "id": "front_old_root",
                    "path": "/media/frigate/recordings/front_door/2024-01-01/00.00.mp4",
                    "camera": "front_door",
                    "start_time": 100,
                    "end_time": 110,
                    "duration": 10,
                    "motion": 1,
                    "segment_size": 120,
                },
                {
                    "id": "front_new_root",
                    "path": "/mnt/new-root/front_door/2024-02-01/00.00.mp4",
                    "camera": "front_door",
                    "start_time": 200,
                    "end_time": 210,
                    "duration": 10,
                    "motion": 1,
                    "segment_size": 80,
                },
            ]
        ).execute()

        with AuthTestClient(app) as client:
            payload = client.get("/recordings/storage").json()

        roots = {root["path"]: root for root in payload["recording_roots"]}

        # Usage attribution is derived from Recordings.path, not current camera config.
        assert roots["/media/frigate/recordings"]["recordings_size"] == 120
        assert roots["/mnt/new-root"]["recordings_size"] == 80

        assert roots["/media/frigate/recordings"]["camera_usages"]["front_door"][
            "usage"
        ] == 120
        assert roots["/mnt/new-root"]["camera_usages"]["front_door"]["usage"] == 80

        # Config metadata still reflects current root assignment.
        assert roots["/media/frigate/recordings"]["configured_cameras"] == []
        assert roots["/mnt/new-root"]["configured_cameras"] == ["front_door"]

    def test_recordings_storage_normalizes_date_hour_paths_to_configured_roots(self):
        self.minimal_config["cameras"]["front_door"]["path"] = "/media/frigate/recordings"
        self.minimal_config["cameras"]["back_yard"] = {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.2:554/video", "roles": ["detect"]}]
            },
            "detect": {"height": 1080, "width": 1920, "fps": 5},
            "path": "/video1",
        }

        self.test_stats["service"]["storage"]["/video1"] = {
            "free": 600,
            "mount_type": "ext4",
            "total": 1000,
            "used": 400,
        }

        app = self._build_app()

        Recordings.insert_many(
            [
                {
                    "id": "front_08",
                    "path": "/media/frigate/recordings/2026-03-07/08/seg1.mp4",
                    "camera": "front_door",
                    "start_time": 100,
                    "end_time": 110,
                    "duration": 10,
                    "motion": 1,
                    "segment_size": 100,
                },
                {
                    "id": "front_09",
                    "path": "/media/frigate/recordings/2026-03-07/09/seg1.mp4",
                    "camera": "front_door",
                    "start_time": 120,
                    "end_time": 130,
                    "duration": 10,
                    "motion": 1,
                    "segment_size": 150,
                },
                {
                    "id": "video1_08",
                    "path": "/video1/2026-03-07/08/seg1.mp4",
                    "camera": "back_yard",
                    "start_time": 140,
                    "end_time": 150,
                    "duration": 10,
                    "motion": 1,
                    "segment_size": 200,
                },
                {
                    "id": "video1_09",
                    "path": "/video1/2026-03-07/09/seg1.mp4",
                    "camera": "back_yard",
                    "start_time": 160,
                    "end_time": 170,
                    "duration": 10,
                    "motion": 1,
                    "segment_size": 50,
                },
            ]
        ).execute()

        with AuthTestClient(app) as client:
            payload = client.get("/recordings/storage").json()

        roots = {root["path"]: root for root in payload["recording_roots"]}

        assert set(roots.keys()) == {"/media/frigate/recordings", "/video1"}
        assert roots["/media/frigate/recordings"]["recordings_size"] == 250
        assert roots["/video1"]["recordings_size"] == 250

        # Ensure date/hour pseudo-roots are not emitted.
        assert "/media/frigate/recordings/2026-03-07/08" not in roots
        assert "/media/frigate/recordings/2026-03-07/09" not in roots
        assert "/video1/2026-03-07/08" not in roots
        assert "/video1/2026-03-07/09" not in roots

