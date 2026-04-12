import os
import tempfile
from unittest.mock import patch

from frigate.jobs.export import (
    ExportJob,
    get_export_job_manager,
    reap_stale_exports,
    start_export_job,
)
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

    def test_delete_export_case_delete_exports_cancels_queued_jobs(self):
        case = ExportCase.create(
            id="case_delete_me",
            name="Delete me",
            description="",
            created_at=10,
            updated_at=10,
        )
        other_case = ExportCase.create(
            id="case_keep_me",
            name="Keep me",
            description="",
            created_at=20,
            updated_at=20,
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            video_path = os.path.join(tmpdir, "case_export.mp4")
            thumb_path = os.path.join(tmpdir, "case_export.webp")
            other_video_path = os.path.join(tmpdir, "other_export.mp4")
            other_thumb_path = os.path.join(tmpdir, "other_export.webp")

            with open(video_path, "wb") as handle:
                handle.write(b"case")
            with open(thumb_path, "wb") as handle:
                handle.write(b"thumb")
            with open(other_video_path, "wb") as handle:
                handle.write(b"other")
            with open(other_thumb_path, "wb") as handle:
                handle.write(b"thumb")

            Export.create(
                id="export_in_case",
                camera="front_door",
                name="Case export",
                date=100,
                video_path=video_path,
                thumb_path=thumb_path,
                in_progress=False,
                export_case=case,
            )
            Export.create(
                id="export_other_case",
                camera="front_door",
                name="Other export",
                date=110,
                video_path=other_video_path,
                thumb_path=other_thumb_path,
                in_progress=False,
                export_case=other_case,
            )

            with (
                patch("frigate.jobs.export._job_manager", None),
                patch(
                    "frigate.jobs.export.ExportJobManager.ensure_started",
                    autospec=True,
                    return_value=None,
                ),
            ):
                start_export_job(
                    self.app.frigate_config,
                    ExportJob(
                        id="queued_case_job",
                        camera="front_door",
                        export_case_id=case.id,
                        request_start_time=100,
                        request_end_time=120,
                    ),
                )
                start_export_job(
                    self.app.frigate_config,
                    ExportJob(
                        id="queued_other_job",
                        camera="front_door",
                        export_case_id=other_case.id,
                        request_start_time=130,
                        request_end_time=150,
                    ),
                )

                manager = get_export_job_manager(self.app.frigate_config)
                assert {job.id for job in manager.list_active_jobs()} == {
                    "queued_case_job",
                    "queued_other_job",
                }

                with AuthTestClient(self.app) as client:
                    response = client.delete(f"/cases/{case.id}?delete_exports=true")

            assert response.status_code == 200
            assert ExportCase.get_or_none(ExportCase.id == case.id) is None
            assert ExportCase.get_or_none(ExportCase.id == other_case.id) is not None
            assert Export.get_or_none(Export.id == "export_in_case") is None
            assert Export.get_or_none(Export.id == "export_other_case") is not None
            assert not os.path.exists(video_path)
            assert not os.path.exists(thumb_path)

            cancelled_job = manager.get_job("queued_case_job")
            assert cancelled_job is not None
            assert cancelled_job.status == "cancelled"

            remaining_job = manager.get_job("queued_other_job")
            assert remaining_job is not None
            assert remaining_job.status == "queued"
            assert [job.id for job in manager.list_active_jobs()] == [
                "queued_other_job"
            ]

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
                        "items": [
                            {
                                "camera": "front_door",
                                "start_time": 110,
                                "end_time": 150,
                                "friendly_name": "Incident - Front Door",
                            },
                            {
                                "camera": "backyard",
                                "start_time": 110,
                                "end_time": 150,
                                "friendly_name": "Incident - Backyard",
                            },
                        ],
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
                "item_index": 0,
                "client_item_id": None,
            },
            {
                "camera": "backyard",
                "export_id": None,
                "success": False,
                "status": None,
                "error": "No recordings found for time range",
                "item_index": 1,
                "client_item_id": None,
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
                            "items": [
                                {
                                    "camera": "front_door",
                                    "start_time": 110,
                                    "end_time": 150,
                                },
                                {
                                    "camera": "backyard",
                                    "start_time": 110,
                                    "end_time": 150,
                                },
                            ],
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

    def test_reap_stale_exports_deletes_rows_with_no_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            stale_video = os.path.join(tmpdir, "stale.mp4")
            stale_thumb = os.path.join(tmpdir, "stale.webp")
            # stale_video is intentionally NOT created
            with open(stale_thumb, "w") as handle:
                handle.write("thumb")

            Export.create(
                id="stale_no_file",
                camera="front_door",
                name="Stuck export",
                date=100,
                video_path=stale_video,
                thumb_path=stale_thumb,
                in_progress=True,
            )

            reap_stale_exports()

            assert Export.get_or_none(Export.id == "stale_no_file") is None
            assert not os.path.exists(stale_thumb)

    def test_reap_stale_exports_recovers_rows_with_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            intact_video = os.path.join(tmpdir, "intact.mp4")
            intact_thumb = os.path.join(tmpdir, "intact.webp")
            with open(intact_video, "wb") as handle:
                handle.write(b"not actually an mp4 but non-empty")
            with open(intact_thumb, "wb") as handle:
                handle.write(b"thumb")

            case = ExportCase.create(
                id="case_for_stale",
                name="Curated case",
                description="",
                created_at=10,
                updated_at=10,
            )

            Export.create(
                id="stale_with_file",
                camera="front_door",
                name="Recoverable export",
                date=200,
                video_path=intact_video,
                thumb_path=intact_thumb,
                in_progress=True,
                export_case=case,
            )

            reap_stale_exports()

            recovered = Export.get(Export.id == "stale_with_file")
            assert recovered.in_progress is False
            # Case link must be cleared so the user re-triages the recovered row
            assert recovered.export_case is None
            # The case itself is untouched
            assert ExportCase.get_or_none(ExportCase.id == "case_for_stale") is not None
            # Recovered files must NOT be unlinked
            assert os.path.exists(intact_video)
            assert os.path.exists(intact_thumb)

    def test_reap_stale_exports_delete_path_severs_case_link(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            missing_video = os.path.join(tmpdir, "missing.mp4")
            # file intentionally not created

            case = ExportCase.create(
                id="case_losing_member",
                name="Case losing a member",
                description="",
                created_at=20,
                updated_at=20,
            )

            Export.create(
                id="stale_in_case_no_file",
                camera="front_door",
                name="Stuck and in a case",
                date=250,
                video_path=missing_video,
                thumb_path="",
                in_progress=True,
                export_case=case,
            )

            reap_stale_exports()

            # The export row is gone entirely
            assert Export.get_or_none(Export.id == "stale_in_case_no_file") is None
            # The case stays but has no exports pointing at it
            remaining_case = ExportCase.get(ExportCase.id == "case_losing_member")
            assert list(remaining_case.exports) == []

    def test_reap_stale_exports_deletes_rows_with_empty_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            empty_video = os.path.join(tmpdir, "empty.mp4")
            # Create a zero-byte file — partial ffmpeg output
            open(empty_video, "w").close()

            Export.create(
                id="stale_empty_file",
                camera="front_door",
                name="Zero byte export",
                date=300,
                video_path=empty_video,
                thumb_path="",
                in_progress=True,
            )

            reap_stale_exports()

            assert Export.get_or_none(Export.id == "stale_empty_file") is None
            assert not os.path.exists(empty_video)

    def test_reap_stale_exports_skips_completed_rows(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            done_video = os.path.join(tmpdir, "done.mp4")
            with open(done_video, "wb") as handle:
                handle.write(b"done")

            Export.create(
                id="already_done",
                camera="front_door",
                name="Completed export",
                date=400,
                video_path=done_video,
                thumb_path="",
                in_progress=False,
            )

            reap_stale_exports()

            row = Export.get(Export.id == "already_done")
            assert row.in_progress is False
            assert os.path.exists(done_video)

    def test_batch_export_without_case_goes_to_uncategorized(self):
        """Exports without a case target go to uncategorized."""
        self._insert_recording("rec-front", "front_door", 100, 400)

        with patch(
            "frigate.api.export.start_export_job",
            side_effect=lambda _config, job: job.id,
        ):
            with AuthTestClient(self.app) as client:
                response = client.post(
                    "/exports/batch",
                    json={
                        "items": [
                            {
                                "camera": "front_door",
                                "start_time": 110,
                                "end_time": 150,
                            }
                        ],
                    },
                )

        assert response.status_code == 202
        response_json = response.json()
        assert response_json["export_case_id"] is None
        assert ExportCase.select().count() == 0

    # --- /exports/batch (item-shaped multi-export) ---------------------------

    def test_batch_export_happy_path_creates_case_and_queues_all(self):
        self._insert_recording("rec-front", "front_door", 100, 400)
        self._insert_recording("rec-back", "backyard", 100, 400)

        with patch(
            "frigate.api.export.start_export_job",
            side_effect=lambda _config, job: job.id,
        ) as start_export_job:
            with AuthTestClient(self.app) as client:
                response = client.post(
                    "/exports/batch",
                    json={
                        "items": [
                            {
                                "camera": "front_door",
                                "start_time": 110,
                                "end_time": 150,
                            },
                            {
                                "camera": "front_door",
                                "start_time": 200,
                                "end_time": 240,
                            },
                            {
                                "camera": "backyard",
                                "start_time": 300,
                                "end_time": 340,
                            },
                        ],
                        "new_case_name": "Incident Apr 11",
                        "new_case_description": "Review items",
                    },
                )

        assert response.status_code == 202
        response_json = response.json()
        assert len(response_json["export_ids"]) == 3
        assert all(r["success"] for r in response_json["results"])
        assert [r["item_index"] for r in response_json["results"]] == [0, 1, 2]
        assert start_export_job.call_count == 3

        case = ExportCase.get(ExportCase.id == response_json["export_case_id"])
        assert case.name == "Incident Apr 11"
        assert case.description == "Review items"

    def test_batch_export_existing_case_does_not_create_new_case(self):
        self._insert_recording("rec-front", "front_door", 100, 400)
        ExportCase.create(
            id="existing_case",
            name="Existing",
            description="",
            created_at=10,
            updated_at=10,
        )

        with patch(
            "frigate.api.export.start_export_job",
            side_effect=lambda _config, job: job.id,
        ):
            with AuthTestClient(self.app) as client:
                response = client.post(
                    "/exports/batch",
                    json={
                        "items": [
                            {
                                "camera": "front_door",
                                "start_time": 110,
                                "end_time": 150,
                            }
                        ],
                        "export_case_id": "existing_case",
                    },
                )

        assert response.status_code == 202
        assert response.json()["export_case_id"] == "existing_case"
        # No additional case was created
        assert ExportCase.select().count() == 1

    def test_batch_export_empty_items_rejected(self):
        with AuthTestClient(self.app) as client:
            response = client.post(
                "/exports/batch",
                json={"items": [], "new_case_name": "Empty"},
            )

        assert response.status_code == 422

    def test_batch_export_over_limit_rejected(self):
        items = [
            {"camera": "front_door", "start_time": 100 + i, "end_time": 100 + i + 5}
            for i in range(51)
        ]

        with AuthTestClient(self.app) as client:
            response = client.post(
                "/exports/batch",
                json={"items": items, "new_case_name": "Too many"},
            )

        assert response.status_code == 422

    def test_batch_export_end_before_start_rejected(self):
        with AuthTestClient(self.app) as client:
            response = client.post(
                "/exports/batch",
                json={
                    "items": [
                        {
                            "camera": "front_door",
                            "start_time": 200,
                            "end_time": 100,
                        }
                    ],
                    "new_case_name": "Bad range",
                },
            )

        assert response.status_code == 422
        assert (
            response.json()["detail"][0]["msg"]
            == "Value error, end_time must be after start_time"
        )

    def test_batch_export_non_admin_without_case_goes_to_uncategorized(self):
        """Non-admin batch exports go to uncategorized."""
        self._insert_recording("rec-front", "front_door", 100, 400)

        with patch(
            "frigate.api.export.start_export_job",
            side_effect=lambda _config, job: job.id,
        ):
            with AuthTestClient(self.app) as client:
                response = client.post(
                    "/exports/batch",
                    headers={"remote-user": "viewer", "remote-role": "viewer"},
                    json={
                        "items": [
                            {
                                "camera": "front_door",
                                "start_time": 100,
                                "end_time": 150,
                            }
                        ],
                    },
                )

        assert response.status_code == 202
        response_json = response.json()
        assert response_json["export_case_id"] is None
        assert ExportCase.select().count() == 0

    def test_batch_export_camera_access_denied_fails_closed(self):
        from fastapi import Request

        from frigate.api.auth import get_allowed_cameras_for_filter

        self._insert_recording("rec-front", "front_door", 100, 400)

        async def restricted(request: Request):
            return ["front_door"]

        self.app.dependency_overrides[get_allowed_cameras_for_filter] = restricted

        with patch(
            "frigate.api.export.start_export_job",
            side_effect=lambda _config, job: job.id,
        ) as start_export_job:
            with AuthTestClient(self.app) as client:
                response = client.post(
                    "/exports/batch",
                    json={
                        "items": [
                            {
                                "camera": "front_door",
                                "start_time": 110,
                                "end_time": 150,
                            },
                            {
                                "camera": "backyard",  # not in allowed list
                                "start_time": 110,
                                "end_time": 150,
                            },
                        ],
                        "new_case_name": "Nope",
                    },
                )

        assert response.status_code == 403
        start_export_job.assert_not_called()
        # No case created
        assert ExportCase.select().count() == 0

    def test_batch_export_case_not_found(self):
        self._insert_recording("rec-front", "front_door", 100, 400)

        with AuthTestClient(self.app) as client:
            response = client.post(
                "/exports/batch",
                json={
                    "items": [
                        {
                            "camera": "front_door",
                            "start_time": 110,
                            "end_time": 150,
                        }
                    ],
                    "export_case_id": "does_not_exist",
                },
            )

        assert response.status_code == 404

    def test_batch_export_per_item_missing_recordings_partial_success(self):
        self._insert_recording("rec-front", "front_door", 100, 200)
        # backyard has no recordings at all

        with patch(
            "frigate.api.export.start_export_job",
            side_effect=lambda _config, job: job.id,
        ) as start_export_job:
            with AuthTestClient(self.app) as client:
                response = client.post(
                    "/exports/batch",
                    json={
                        "items": [
                            {
                                "camera": "front_door",
                                "start_time": 110,
                                "end_time": 150,
                            },
                            {
                                "camera": "backyard",
                                "start_time": 110,
                                "end_time": 150,
                            },
                        ],
                        "new_case_name": "Partial",
                    },
                )

        assert response.status_code == 202
        response_json = response.json()
        assert len(response_json["export_ids"]) == 1
        results_by_camera = {r["camera"]: r for r in response_json["results"]}
        assert results_by_camera["front_door"]["success"] is True
        assert results_by_camera["backyard"]["success"] is False
        assert (
            results_by_camera["backyard"]["error"]
            == "No recordings found for time range"
        )
        start_export_job.assert_called_once()

        # Case is still created because at least one item succeeded
        assert (
            ExportCase.get(ExportCase.id == response_json["export_case_id"]) is not None
        )

    def test_batch_export_same_camera_different_ranges_one_missing(self):
        # Recording covers 100-200 only. First item fits, second does not.
        self._insert_recording("rec-front", "front_door", 100, 200)

        with patch(
            "frigate.api.export.start_export_job",
            side_effect=lambda _config, job: job.id,
        ) as start_export_job:
            with AuthTestClient(self.app) as client:
                response = client.post(
                    "/exports/batch",
                    json={
                        "items": [
                            {
                                "camera": "front_door",
                                "start_time": 110,
                                "end_time": 150,
                            },
                            {
                                "camera": "front_door",
                                "start_time": 500,
                                "end_time": 540,
                            },
                        ],
                        "new_case_name": "Split recordings",
                    },
                )

        assert response.status_code == 202
        response_json = response.json()
        assert len(response_json["export_ids"]) == 1
        results = response_json["results"]
        assert results[0]["success"] is True
        assert results[0]["item_index"] == 0
        assert results[1]["success"] is False
        assert results[1]["item_index"] == 1
        assert results[1]["error"] == "No recordings found for time range"
        # Both results carry the same camera — item_index is the only way
        # the client can tell them apart.
        assert results[0]["camera"] == results[1]["camera"] == "front_door"
        start_export_job.assert_called_once()

    def test_batch_export_all_missing_recordings_rolls_back_case(self):
        # No recordings inserted at all
        with patch(
            "frigate.api.export.start_export_job",
            side_effect=lambda _config, job: job.id,
        ) as start_export_job:
            with AuthTestClient(self.app) as client:
                response = client.post(
                    "/exports/batch",
                    json={
                        "items": [
                            {
                                "camera": "front_door",
                                "start_time": 110,
                                "end_time": 150,
                            }
                        ],
                        "new_case_name": "Should rollback",
                    },
                )

        assert response.status_code == 400
        start_export_job.assert_not_called()
        assert ExportCase.select().count() == 0

    def test_batch_export_preflight_queue_full(self):
        self._insert_recording("rec-front", "front_door", 100, 400)
        self._insert_recording("rec-back", "backyard", 100, 400)

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
                            "items": [
                                {
                                    "camera": "front_door",
                                    "start_time": 110,
                                    "end_time": 150,
                                },
                                {
                                    "camera": "backyard",
                                    "start_time": 110,
                                    "end_time": 150,
                                },
                            ],
                            "new_case_name": "Queue full",
                        },
                    )

        assert response.status_code == 503
        start_export_job.assert_not_called()
        assert ExportCase.select().count() == 0

    def test_batch_export_all_enqueue_calls_fail_rolls_back_case(self):
        self._insert_recording("rec-front", "front_door", 100, 400)

        def boom(_config, _job):
            raise RuntimeError("simulated enqueue failure")

        with patch(
            "frigate.api.export.start_export_job",
            side_effect=boom,
        ):
            with AuthTestClient(self.app) as client:
                response = client.post(
                    "/exports/batch",
                    json={
                        "items": [
                            {
                                "camera": "front_door",
                                "start_time": 110,
                                "end_time": 150,
                            }
                        ],
                        "new_case_name": "Will fail",
                    },
                )

        assert response.status_code == 202
        response_json = response.json()
        assert response_json["export_ids"] == []
        assert response_json["export_case_id"] is None
        assert ExportCase.select().count() == 0

    def test_batch_export_rejects_invalid_image_path(self):
        self._insert_recording("rec-front", "front_door", 100, 400)

        with AuthTestClient(self.app) as client:
            response = client.post(
                "/exports/batch",
                json={
                    "items": [
                        {
                            "camera": "front_door",
                            "start_time": 110,
                            "end_time": 150,
                            "image_path": "/etc/passwd",
                        }
                    ],
                    "new_case_name": "Bad image",
                },
            )

        assert response.status_code == 400
        assert ExportCase.select().count() == 0

    def test_batch_export_non_admin_can_queue(self):
        self._insert_recording("rec-front", "front_door", 100, 400)

        with patch(
            "frigate.api.export.start_export_job",
            side_effect=lambda _config, job: job.id,
        ):
            with AuthTestClient(self.app) as client:
                response = client.post(
                    "/exports/batch",
                    headers={"remote-user": "viewer", "remote-role": "viewer"},
                    json={
                        "items": [
                            {
                                "camera": "front_door",
                                "start_time": 110,
                                "end_time": 150,
                            }
                        ],
                        "new_case_name": "Viewer export",
                    },
                )

        assert response.status_code == 202
        assert len(response.json()["export_ids"]) == 1

    def test_batch_export_non_admin_cannot_attach_to_existing_case(self):
        """Non-admins can create cases via new_case_name but cannot attach
        to existing cases they did not create. Closes a write-path hole that
        would otherwise be reachable through the unfiltered GET /cases list.
        """
        self._insert_recording("rec-front", "front_door", 100, 400)
        ExportCase.create(
            id="admins_only_case",
            name="Admins only",
            description="",
            created_at=10,
            updated_at=10,
        )

        with patch(
            "frigate.api.export.start_export_job",
            side_effect=lambda _config, job: job.id,
        ) as start_export_job:
            with AuthTestClient(self.app) as client:
                response = client.post(
                    "/exports/batch",
                    headers={"remote-user": "viewer", "remote-role": "viewer"},
                    json={
                        "items": [
                            {
                                "camera": "front_door",
                                "start_time": 110,
                                "end_time": 150,
                            }
                        ],
                        "export_case_id": "admins_only_case",
                    },
                )

        assert response.status_code == 403
        start_export_job.assert_not_called()
        # No exports should have been created in the target case
        assert Export.select().count() == 0

    def test_batch_export_admin_can_attach_to_existing_case(self):
        self._insert_recording("rec-front", "front_door", 100, 400)
        ExportCase.create(
            id="shared_case",
            name="Shared",
            description="",
            created_at=10,
            updated_at=10,
        )

        with patch(
            "frigate.api.export.start_export_job",
            side_effect=lambda _config, job: job.id,
        ):
            with AuthTestClient(self.app) as client:
                response = client.post(
                    "/exports/batch",
                    json={
                        "items": [
                            {
                                "camera": "front_door",
                                "start_time": 110,
                                "end_time": 150,
                            }
                        ],
                        "export_case_id": "shared_case",
                    },
                )

        assert response.status_code == 202
        assert response.json()["export_case_id"] == "shared_case"
        # No additional case created
        assert ExportCase.select().count() == 1

    def test_batch_export_roundtrips_client_item_id(self):
        self._insert_recording("rec-front", "front_door", 100, 400)

        with patch(
            "frigate.api.export.start_export_job",
            side_effect=lambda _config, job: job.id,
        ):
            with AuthTestClient(self.app) as client:
                response = client.post(
                    "/exports/batch",
                    json={
                        "items": [
                            {
                                "camera": "front_door",
                                "start_time": 110,
                                "end_time": 150,
                                "client_item_id": "review-123",
                            }
                        ],
                        "new_case_name": "Client id test",
                    },
                )

        assert response.status_code == 202
        assert response.json()["results"][0]["client_item_id"] == "review-123"

    def test_single_export_non_admin_cannot_attach_to_existing_case(self):
        """The single-export route has the same hole: non-admins should not
        be able to smuggle exports into an existing case via export_case_id.
        Admin-gating this matches /exports/batch.
        """
        self._insert_recording("rec-front", "front_door", 100, 400)
        ExportCase.create(
            id="admins_only_case",
            name="Admins only",
            description="",
            created_at=10,
            updated_at=10,
        )

        with patch(
            "frigate.api.export.start_export_job",
            side_effect=lambda _config, job: job.id,
        ) as start_export_job:
            with AuthTestClient(self.app) as client:
                response = client.post(
                    "/export/front_door/start/110/end/150",
                    headers={"remote-user": "viewer", "remote-role": "viewer"},
                    json={"export_case_id": "admins_only_case"},
                )

        assert response.status_code == 403
        start_export_job.assert_not_called()
        assert Export.select().count() == 0

    def test_single_export_non_admin_can_still_export_without_case(self):
        """Regression guard: the admin gate only applies to export_case_id,
        not to single exports in general. Non-admins should still be able
        to start a single export for a camera they have access to.
        """
        self._insert_recording("rec-front", "front_door", 100, 400)

        with patch(
            "frigate.api.export.start_export_job",
            side_effect=lambda _config, job: job.id,
        ):
            with AuthTestClient(self.app) as client:
                response = client.post(
                    "/export/front_door/start/110/end/150",
                    headers={"remote-user": "viewer", "remote-role": "viewer"},
                    json={},
                )

        assert response.status_code == 202
        assert response.json()["success"] is True

    # ── Bulk delete exports ────────────────────────────────────────

    def test_bulk_delete_exports_success(self):
        """All IDs exist, none in-progress → 200, all deleted."""
        Export.create(
            id="exp1",
            camera="front_door",
            name="export_1",
            date=100,
            video_path="/tmp/exp1.mp4",
            thumb_path="/tmp/exp1.jpg",
            in_progress=False,
        )
        Export.create(
            id="exp2",
            camera="front_door",
            name="export_2",
            date=200,
            video_path="/tmp/exp2.mp4",
            thumb_path="/tmp/exp2.jpg",
            in_progress=False,
        )

        with AuthTestClient(self.app) as client:
            response = client.post(
                "/exports/delete",
                json={"ids": ["exp1", "exp2"]},
            )

        assert response.status_code == 200
        assert response.json()["success"] is True
        assert Export.select().count() == 0

    def test_bulk_delete_exports_single_item(self):
        """Regression: single-item delete via batch endpoint."""
        Export.create(
            id="exp1",
            camera="front_door",
            name="export_1",
            date=100,
            video_path="/tmp/exp1.mp4",
            thumb_path="/tmp/exp1.jpg",
            in_progress=False,
        )

        with AuthTestClient(self.app) as client:
            response = client.post(
                "/exports/delete",
                json={"ids": ["exp1"]},
            )

        assert response.status_code == 200
        assert Export.select().count() == 0

    def test_bulk_delete_exports_some_missing(self):
        """Some IDs don't exist → 404, nothing deleted."""
        Export.create(
            id="exp1",
            camera="front_door",
            name="export_1",
            date=100,
            video_path="/tmp/exp1.mp4",
            thumb_path="/tmp/exp1.jpg",
            in_progress=False,
        )

        with AuthTestClient(self.app) as client:
            response = client.post(
                "/exports/delete",
                json={"ids": ["exp1", "nonexistent"]},
            )

        assert response.status_code == 404
        # Nothing deleted
        assert Export.select().count() == 1

    def test_bulk_delete_exports_all_missing(self):
        """All IDs don't exist → 404."""
        with AuthTestClient(self.app) as client:
            response = client.post(
                "/exports/delete",
                json={"ids": ["nope1", "nope2"]},
            )

        assert response.status_code == 404

    def test_bulk_delete_exports_in_progress(self):
        """Some exports in-progress → 400, nothing deleted."""
        Export.create(
            id="exp1",
            camera="front_door",
            name="export_1",
            date=100,
            video_path=f"{os.environ.get('EXPORT_DIR', '/media/frigate/exports')}/exp1.mp4",
            thumb_path="/tmp/exp1.jpg",
            in_progress=True,
        )

        with patch(
            "frigate.api.export._get_files_in_use",
            return_value={"exp1.mp4"},
        ):
            with AuthTestClient(self.app) as client:
                response = client.post(
                    "/exports/delete",
                    json={"ids": ["exp1"]},
                )

        assert response.status_code == 400
        assert Export.select().count() == 1

    def test_bulk_delete_exports_non_admin_rejected(self):
        """Non-admin users cannot bulk delete."""
        Export.create(
            id="exp1",
            camera="front_door",
            name="export_1",
            date=100,
            video_path="/tmp/exp1.mp4",
            thumb_path="/tmp/exp1.jpg",
            in_progress=False,
        )

        with AuthTestClient(self.app) as client:
            response = client.post(
                "/exports/delete",
                headers={"remote-user": "viewer", "remote-role": "viewer"},
                json={"ids": ["exp1"]},
            )

        assert response.status_code == 403
        assert Export.select().count() == 1

    # ── Bulk reassign exports ──────────────────────────────────────

    def test_bulk_reassign_exports_to_case(self):
        """All IDs exist, case exists → 200, all reassigned."""
        ExportCase.create(
            id="case1",
            name="Test Case",
            description="",
            created_at=10,
            updated_at=10,
        )
        Export.create(
            id="exp1",
            camera="front_door",
            name="export_1",
            date=100,
            video_path="/tmp/exp1.mp4",
            thumb_path="/tmp/exp1.jpg",
            in_progress=False,
        )
        Export.create(
            id="exp2",
            camera="front_door",
            name="export_2",
            date=200,
            video_path="/tmp/exp2.mp4",
            thumb_path="/tmp/exp2.jpg",
            in_progress=False,
        )

        with AuthTestClient(self.app) as client:
            response = client.post(
                "/exports/reassign",
                json={"ids": ["exp1", "exp2"], "export_case_id": "case1"},
            )

        assert response.status_code == 200
        assert response.json()["success"] is True
        for exp_id in ["exp1", "exp2"]:
            exp = Export.get(Export.id == exp_id)
            assert exp.export_case_id == "case1"

    def test_bulk_reassign_exports_to_null(self):
        """Reassign to null (uncategorize) → 200."""
        ExportCase.create(
            id="case1",
            name="Test Case",
            description="",
            created_at=10,
            updated_at=10,
        )
        Export.create(
            id="exp1",
            camera="front_door",
            name="export_1",
            date=100,
            video_path="/tmp/exp1.mp4",
            thumb_path="/tmp/exp1.jpg",
            in_progress=False,
            export_case="case1",
        )

        with AuthTestClient(self.app) as client:
            response = client.post(
                "/exports/reassign",
                json={"ids": ["exp1"], "export_case_id": None},
            )

        assert response.status_code == 200
        exp = Export.get(Export.id == "exp1")
        assert exp.export_case_id is None

    def test_bulk_reassign_exports_single_item(self):
        """Regression: single-item reassign via batch endpoint."""
        ExportCase.create(
            id="case1",
            name="Test Case",
            description="",
            created_at=10,
            updated_at=10,
        )
        Export.create(
            id="exp1",
            camera="front_door",
            name="export_1",
            date=100,
            video_path="/tmp/exp1.mp4",
            thumb_path="/tmp/exp1.jpg",
            in_progress=False,
        )

        with AuthTestClient(self.app) as client:
            response = client.post(
                "/exports/reassign",
                json={"ids": ["exp1"], "export_case_id": "case1"},
            )

        assert response.status_code == 200
        exp = Export.get(Export.id == "exp1")
        assert exp.export_case_id == "case1"

    def test_bulk_reassign_exports_some_missing(self):
        """Some IDs don't exist → 404, nothing reassigned."""
        ExportCase.create(
            id="case1",
            name="Test Case",
            description="",
            created_at=10,
            updated_at=10,
        )
        Export.create(
            id="exp1",
            camera="front_door",
            name="export_1",
            date=100,
            video_path="/tmp/exp1.mp4",
            thumb_path="/tmp/exp1.jpg",
            in_progress=False,
        )

        with AuthTestClient(self.app) as client:
            response = client.post(
                "/exports/reassign",
                json={
                    "ids": ["exp1", "nonexistent"],
                    "export_case_id": "case1",
                },
            )

        assert response.status_code == 404
        # Nothing reassigned
        exp = Export.get(Export.id == "exp1")
        assert exp.export_case_id is None

    def test_bulk_reassign_exports_case_not_found(self):
        """Target case doesn't exist → 404."""
        Export.create(
            id="exp1",
            camera="front_door",
            name="export_1",
            date=100,
            video_path="/tmp/exp1.mp4",
            thumb_path="/tmp/exp1.jpg",
            in_progress=False,
        )

        with AuthTestClient(self.app) as client:
            response = client.post(
                "/exports/reassign",
                json={"ids": ["exp1"], "export_case_id": "nonexistent"},
            )

        assert response.status_code == 404
        exp = Export.get(Export.id == "exp1")
        assert exp.export_case_id is None

    def test_bulk_reassign_exports_non_admin_rejected(self):
        """Non-admin users cannot bulk reassign."""
        Export.create(
            id="exp1",
            camera="front_door",
            name="export_1",
            date=100,
            video_path="/tmp/exp1.mp4",
            thumb_path="/tmp/exp1.jpg",
            in_progress=False,
        )

        with AuthTestClient(self.app) as client:
            response = client.post(
                "/exports/reassign",
                headers={"remote-user": "viewer", "remote-role": "viewer"},
                json={"ids": ["exp1"], "export_case_id": None},
            )

        assert response.status_code == 403
