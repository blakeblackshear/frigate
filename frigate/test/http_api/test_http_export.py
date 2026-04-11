from unittest.mock import patch

from frigate.jobs.export import ExportJob
from frigate.models import Export, ExportCase, Previews, Recordings
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp


class TestHttpExport(BaseTestHttp):
    def setUp(self):
        super().setUp([Export, ExportCase, Previews, Recordings])
        self.minimal_config["cameras"]["backyard"] = {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.2:554/video", "roles": ["detect"]}]
            },
            "detect": {
                "height": 1080,
                "width": 1920,
                "fps": 5,
            },
        }
        self.app = super().create_app()

    def tearDown(self):
        self.app.dependency_overrides.clear()
        super().tearDown()

    def _insert_recording(
        self,
        recording_id: str,
        camera: str,
        start_time: float,
        end_time: float,
    ) -> None:
        Recordings.create(
            id=recording_id,
            camera=camera,
            path=f"/tmp/{recording_id}.mp4",
            start_time=start_time,
            end_time=end_time,
            duration=end_time - start_time,
            motion=0,
            objects=0,
            dBFS=0,
            segment_size=1,
            regions=0,
            motion_heatmap=[],
        )

    def test_create_export_case_uses_wall_clock_time(self):
        with patch("frigate.api.export.time.time", return_value=1234.5):
            with AuthTestClient(self.app) as client:
                response = client.post(
                    "/cases",
                    json={
                        "name": "Investigation",
                        "description": "A test case",
                    },
                )

        assert response.status_code == 200
        response_json = response.json()
        assert response_json["created_at"] == 1234.5
        assert response_json["updated_at"] == 1234.5

        case = ExportCase.get(ExportCase.id == response_json["id"])
        assert case.created_at.timestamp() == 1234.5
        assert case.updated_at.timestamp() == 1234.5

    def test_update_export_case_refreshes_updated_at(self):
        case = ExportCase.create(
            id="case123",
            name="Old name",
            description="Old description",
            created_at=10,
            updated_at=10,
        )

        with patch("frigate.api.export.time.time", return_value=2222.0):
            with AuthTestClient(self.app) as client:
                response = client.patch(
                    f"/cases/{case.id}",
                    json={"name": "New name", "description": "Updated"},
                )

        assert response.status_code == 200

        refreshed = ExportCase.get(ExportCase.id == case.id)
        assert refreshed.name == "New name"
        assert refreshed.description == "Updated"
        assert refreshed.updated_at.timestamp() == 2222.0

    def test_batch_export_creates_case_and_reports_partial_success(self):
        self._insert_recording("rec-front", "front_door", 100, 200)

        with patch(
            "frigate.api.export.start_export_job",
            side_effect=lambda _config, job: job.id,
        ) as start_export_job:
            with AuthTestClient(self.app) as client:
                response = client.post(
                    "/exports/batch",
                    json={
                        "start_time": 110,
                        "end_time": 150,
                        "camera_ids": ["front_door", "backyard"],
                        "name": "Incident",
                        "new_case_name": "Case Alpha",
                        "new_case_description": "Batch export",
                    },
                )

        assert response.status_code == 202
        response_json = response.json()
        assert len(response_json["export_ids"]) == 1
        assert response_json["results"] == [
            {
                "camera": "front_door",
                "export_id": response_json["export_ids"][0],
                "success": True,
                "status": "queued",
                "error": None,
            },
            {
                "camera": "backyard",
                "export_id": None,
                "success": False,
                "status": None,
                "error": "No recordings found for time range",
            },
        ]
        start_export_job.assert_called_once()

        case = ExportCase.get(ExportCase.id == response_json["export_case_id"])
        assert case.name == "Case Alpha"
        assert case.description == "Batch export"

    def test_single_export_is_queued_immediately(self):
        self._insert_recording("rec-front", "front_door", 100, 200)

        with patch(
            "frigate.api.export.start_export_job",
            side_effect=lambda _config, job: job.id,
        ) as start_export_job:
            with AuthTestClient(self.app) as client:
                response = client.post(
                    "/export/front_door/start/110/end/150",
                    json={
                        "name": "Queued export",
                    },
                )

        assert response.status_code == 202
        response_json = response.json()
        assert response_json["success"] is True
        assert response_json["status"] == "queued"
        assert response_json["export_id"].startswith("front_door_")
        start_export_job.assert_called_once()

    def test_single_export_returns_503_when_queue_full(self):
        self._insert_recording("rec-front", "front_door", 100, 200)

        from frigate.jobs.export import ExportQueueFullError

        with patch(
            "frigate.api.export.start_export_job",
            side_effect=ExportQueueFullError("Export queue is full"),
        ):
            with AuthTestClient(self.app) as client:
                response = client.post(
                    "/export/front_door/start/110/end/150",
                    json={
                        "name": "Rejected export",
                    },
                )

        assert response.status_code == 503
        response_json = response.json()
        assert response_json["success"] is False
        assert "queue is full" in response_json["message"].lower()

    def test_batch_export_returns_503_when_queue_cannot_fit_batch(self):
        self._insert_recording("rec-front", "front_door", 100, 200)
        self._insert_recording("rec-back", "backyard", 100, 200)

        with patch(
            "frigate.api.export.available_export_queue_slots",
            return_value=1,
        ):
            with patch(
                "frigate.api.export.start_export_job",
                side_effect=lambda _config, job: job.id,
            ) as start_export_job:
                with AuthTestClient(self.app) as client:
                    response = client.post(
                        "/exports/batch",
                        json={
                            "start_time": 110,
                            "end_time": 150,
                            "camera_ids": ["front_door", "backyard"],
                            "new_case_name": "Overflow Case",
                        },
                    )

        assert response.status_code == 503
        assert response.json()["success"] is False
        start_export_job.assert_not_called()

        # Empty case should NOT have been created
        assert ExportCase.select().count() == 0

    def test_get_active_export_jobs_returns_queue_state(self):
        queued_job = ExportJob(
            id="front_door_queued",
            camera="front_door",
            status="queued",
            request_start_time=100,
            request_end_time=150,
        )

        with patch(
            "frigate.api.export.list_active_export_jobs",
            return_value=[queued_job],
        ):
            with AuthTestClient(self.app) as client:
                response = client.get("/jobs/export")

        assert response.status_code == 200
        assert response.json() == [queued_job.to_dict()]

    def test_batch_export_requires_case_target(self):
        with AuthTestClient(self.app) as client:
            response = client.post(
                "/exports/batch",
                json={
                    "start_time": 110,
                    "end_time": 150,
                    "camera_ids": ["front_door"],
                },
            )

        assert response.status_code == 422
        assert (
            response.json()["detail"][0]["msg"]
            == "Value error, Either export_case_id or new_case_name must be provided"
        )
