"""Unit tests for recordings/media API endpoints."""

from datetime import datetime, timezone

import pytz
from fastapi import Request

from frigate.api.auth import get_allowed_cameras_for_filter, get_current_user
from frigate.models import Recordings
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp


class TestHttpMedia(BaseTestHttp):
    """Test media API endpoints, particularly recordings with DST handling."""

    def setUp(self):
        """Set up test fixtures."""
        super().setUp([Recordings])
        self.app = super().create_app()

        # Mock get_current_user for all tests
        async def mock_get_current_user(request: Request):
            username = request.headers.get("remote-user")
            role = request.headers.get("remote-role")
            if not username or not role:
                from fastapi.responses import JSONResponse

                return JSONResponse(
                    content={"message": "No authorization headers."}, status_code=401
                )
            return {"username": username, "role": role}

        self.app.dependency_overrides[get_current_user] = mock_get_current_user

        async def mock_get_allowed_cameras_for_filter(request: Request):
            return ["front_door"]

        self.app.dependency_overrides[get_allowed_cameras_for_filter] = (
            mock_get_allowed_cameras_for_filter
        )

    def tearDown(self):
        """Clean up after tests."""
        self.app.dependency_overrides.clear()
        super().tearDown()

    def test_recordings_summary_across_dst_spring_forward(self):
        """
        Test recordings summary across spring DST transition (spring forward).

        In 2024, DST in America/New_York transitions on March 10, 2024 at 2:00 AM
        Clocks spring forward from 2:00 AM to 3:00 AM (EST to EDT)
        """
        tz = pytz.timezone("America/New_York")

        # March 9, 2024 at 12:00 PM EST (before DST)
        march_9_noon = tz.localize(datetime(2024, 3, 9, 12, 0, 0)).timestamp()

        # March 10, 2024 at 12:00 PM EDT (after DST transition)
        march_10_noon = tz.localize(datetime(2024, 3, 10, 12, 0, 0)).timestamp()

        # March 11, 2024 at 12:00 PM EDT (after DST)
        march_11_noon = tz.localize(datetime(2024, 3, 11, 12, 0, 0)).timestamp()

        with AuthTestClient(self.app) as client:
            # Insert recordings for each day
            Recordings.insert(
                id="recording_march_9",
                path="/media/recordings/march_9.mp4",
                camera="front_door",
                start_time=march_9_noon,
                end_time=march_9_noon + 3600,  # 1 hour recording
                duration=3600,
                motion=100,
                objects=5,
            ).execute()

            Recordings.insert(
                id="recording_march_10",
                path="/media/recordings/march_10.mp4",
                camera="front_door",
                start_time=march_10_noon,
                end_time=march_10_noon + 3600,
                duration=3600,
                motion=150,
                objects=8,
            ).execute()

            Recordings.insert(
                id="recording_march_11",
                path="/media/recordings/march_11.mp4",
                camera="front_door",
                start_time=march_11_noon,
                end_time=march_11_noon + 3600,
                duration=3600,
                motion=200,
                objects=10,
            ).execute()

            # Test recordings summary with America/New_York timezone
            response = client.get(
                "/recordings/summary",
                params={"timezone": "America/New_York", "cameras": "all"},
            )

            assert response.status_code == 200
            summary = response.json()

            # Verify we get exactly 3 days
            assert len(summary) == 3, f"Expected 3 days, got {len(summary)}"

            # Verify the correct dates are returned (API returns dict with True values)
            assert "2024-03-09" in summary, f"Expected 2024-03-09 in {summary}"
            assert "2024-03-10" in summary, f"Expected 2024-03-10 in {summary}"
            assert "2024-03-11" in summary, f"Expected 2024-03-11 in {summary}"
            assert summary["2024-03-09"] is True
            assert summary["2024-03-10"] is True
            assert summary["2024-03-11"] is True

    def test_recordings_summary_across_dst_fall_back(self):
        """
        Test recordings summary across fall DST transition (fall back).

        In 2024, DST in America/New_York transitions on November 3, 2024 at 2:00 AM
        Clocks fall back from 2:00 AM to 1:00 AM (EDT to EST)
        """
        tz = pytz.timezone("America/New_York")

        # November 2, 2024 at 12:00 PM EDT (before DST transition)
        nov_2_noon = tz.localize(datetime(2024, 11, 2, 12, 0, 0)).timestamp()

        # November 3, 2024 at 12:00 PM EST (after DST transition)
        # Need to specify is_dst=False to get the time after fall back
        nov_3_noon = tz.localize(
            datetime(2024, 11, 3, 12, 0, 0), is_dst=False
        ).timestamp()

        # November 4, 2024 at 12:00 PM EST (after DST)
        nov_4_noon = tz.localize(datetime(2024, 11, 4, 12, 0, 0)).timestamp()

        with AuthTestClient(self.app) as client:
            # Insert recordings for each day
            Recordings.insert(
                id="recording_nov_2",
                path="/media/recordings/nov_2.mp4",
                camera="front_door",
                start_time=nov_2_noon,
                end_time=nov_2_noon + 3600,
                duration=3600,
                motion=100,
                objects=5,
            ).execute()

            Recordings.insert(
                id="recording_nov_3",
                path="/media/recordings/nov_3.mp4",
                camera="front_door",
                start_time=nov_3_noon,
                end_time=nov_3_noon + 3600,
                duration=3600,
                motion=150,
                objects=8,
            ).execute()

            Recordings.insert(
                id="recording_nov_4",
                path="/media/recordings/nov_4.mp4",
                camera="front_door",
                start_time=nov_4_noon,
                end_time=nov_4_noon + 3600,
                duration=3600,
                motion=200,
                objects=10,
            ).execute()

            # Test recordings summary with America/New_York timezone
            response = client.get(
                "/recordings/summary",
                params={"timezone": "America/New_York", "cameras": "all"},
            )

            assert response.status_code == 200
            summary = response.json()

            # Verify we get exactly 3 days
            assert len(summary) == 3, f"Expected 3 days, got {len(summary)}"

            # Verify the correct dates are returned (API returns dict with True values)
            assert "2024-11-02" in summary, f"Expected 2024-11-02 in {summary}"
            assert "2024-11-03" in summary, f"Expected 2024-11-03 in {summary}"
            assert "2024-11-04" in summary, f"Expected 2024-11-04 in {summary}"
            assert summary["2024-11-02"] is True
            assert summary["2024-11-03"] is True
            assert summary["2024-11-04"] is True

    def test_recordings_summary_multiple_cameras_across_dst(self):
        """
        Test recordings summary with multiple cameras across DST boundary.
        """
        tz = pytz.timezone("America/New_York")

        # March 9, 2024 at 10:00 AM EST (before DST)
        march_9_morning = tz.localize(datetime(2024, 3, 9, 10, 0, 0)).timestamp()

        # March 10, 2024 at 3:00 PM EDT (after DST transition)
        march_10_afternoon = tz.localize(datetime(2024, 3, 10, 15, 0, 0)).timestamp()

        with AuthTestClient(self.app) as client:
            # Override allowed cameras for this test to include both
            async def mock_get_allowed_cameras_for_filter(_request: Request):
                return ["front_door", "back_door"]

            self.app.dependency_overrides[get_allowed_cameras_for_filter] = (
                mock_get_allowed_cameras_for_filter
            )

            # Insert recordings for front_door on March 9
            Recordings.insert(
                id="front_march_9",
                path="/media/recordings/front_march_9.mp4",
                camera="front_door",
                start_time=march_9_morning,
                end_time=march_9_morning + 3600,
                duration=3600,
                motion=100,
                objects=5,
            ).execute()

            # Insert recordings for back_door on March 10
            Recordings.insert(
                id="back_march_10",
                path="/media/recordings/back_march_10.mp4",
                camera="back_door",
                start_time=march_10_afternoon,
                end_time=march_10_afternoon + 3600,
                duration=3600,
                motion=150,
                objects=8,
            ).execute()

            # Test with all cameras
            response = client.get(
                "/recordings/summary",
                params={"timezone": "America/New_York", "cameras": "all"},
            )

            assert response.status_code == 200
            summary = response.json()

            # Verify we get both days
            assert len(summary) == 2, f"Expected 2 days, got {len(summary)}"
            assert "2024-03-09" in summary
            assert "2024-03-10" in summary
            assert summary["2024-03-09"] is True
            assert summary["2024-03-10"] is True

            # Reset dependency override back to default single camera for other tests
            async def reset_allowed_cameras(_request: Request):
                return ["front_door"]

            self.app.dependency_overrides[get_allowed_cameras_for_filter] = (
                reset_allowed_cameras
            )

    def test_recordings_summary_at_dst_transition_time(self):
        """
        Test recordings that span the exact DST transition time.
        """
        tz = pytz.timezone("America/New_York")

        # March 10, 2024 at 1:00 AM EST (1 hour before DST transition)
        # At 2:00 AM, clocks jump to 3:00 AM
        before_transition = tz.localize(datetime(2024, 3, 10, 1, 0, 0)).timestamp()

        # Recording that spans the transition (1:00 AM to 3:30 AM EDT)
        # This is 1.5 hours of actual time but spans the "missing" hour
        after_transition = tz.localize(datetime(2024, 3, 10, 3, 30, 0)).timestamp()

        with AuthTestClient(self.app) as client:
            Recordings.insert(
                id="recording_during_transition",
                path="/media/recordings/transition.mp4",
                camera="front_door",
                start_time=before_transition,
                end_time=after_transition,
                duration=after_transition - before_transition,
                motion=100,
                objects=5,
            ).execute()

            response = client.get(
                "/recordings/summary",
                params={"timezone": "America/New_York", "cameras": "all"},
            )

            assert response.status_code == 200
            summary = response.json()

            # The recording should appear on March 10
            assert len(summary) == 1
            assert "2024-03-10" in summary
            assert summary["2024-03-10"] is True

    def test_recordings_summary_utc_timezone(self):
        """
        Test recordings summary with UTC timezone (no DST).
        """
        # Use UTC timestamps directly
        march_9_utc = datetime(2024, 3, 9, 17, 0, 0, tzinfo=timezone.utc).timestamp()
        march_10_utc = datetime(2024, 3, 10, 17, 0, 0, tzinfo=timezone.utc).timestamp()

        with AuthTestClient(self.app) as client:
            Recordings.insert(
                id="recording_march_9_utc",
                path="/media/recordings/march_9_utc.mp4",
                camera="front_door",
                start_time=march_9_utc,
                end_time=march_9_utc + 3600,
                duration=3600,
                motion=100,
                objects=5,
            ).execute()

            Recordings.insert(
                id="recording_march_10_utc",
                path="/media/recordings/march_10_utc.mp4",
                camera="front_door",
                start_time=march_10_utc,
                end_time=march_10_utc + 3600,
                duration=3600,
                motion=150,
                objects=8,
            ).execute()

            # Test with UTC timezone
            response = client.get(
                "/recordings/summary", params={"timezone": "utc", "cameras": "all"}
            )

            assert response.status_code == 200
            summary = response.json()

            # Verify we get both days
            assert len(summary) == 2
            assert "2024-03-09" in summary
            assert "2024-03-10" in summary
            assert summary["2024-03-09"] is True
            assert summary["2024-03-10"] is True

    def test_recordings_summary_no_recordings(self):
        """
        Test recordings summary when no recordings exist.
        """
        with AuthTestClient(self.app) as client:
            response = client.get(
                "/recordings/summary",
                params={"timezone": "America/New_York", "cameras": "all"},
            )

            assert response.status_code == 200
            summary = response.json()
            assert len(summary) == 0

    def test_recordings_summary_single_camera_filter(self):
        """
        Test recordings summary filtered to a single camera.
        """
        tz = pytz.timezone("America/New_York")
        march_10_noon = tz.localize(datetime(2024, 3, 10, 12, 0, 0)).timestamp()

        with AuthTestClient(self.app) as client:
            # Insert recordings for both cameras
            Recordings.insert(
                id="front_recording",
                path="/media/recordings/front.mp4",
                camera="front_door",
                start_time=march_10_noon,
                end_time=march_10_noon + 3600,
                duration=3600,
                motion=100,
                objects=5,
            ).execute()

            Recordings.insert(
                id="back_recording",
                path="/media/recordings/back.mp4",
                camera="back_door",
                start_time=march_10_noon,
                end_time=march_10_noon + 3600,
                duration=3600,
                motion=150,
                objects=8,
            ).execute()

            # Test with only front_door camera
            response = client.get(
                "/recordings/summary",
                params={"timezone": "America/New_York", "cameras": "front_door"},
            )

            assert response.status_code == 200
            summary = response.json()
            assert len(summary) == 1
            assert "2024-03-10" in summary
            assert summary["2024-03-10"] is True
