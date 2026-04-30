"""Unit tests for recordings/media API endpoints."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

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

    def test_camera_recordings_variant_filter(self):
        start_ts = datetime(2024, 3, 9, 12, 0, 0, tzinfo=timezone.utc).timestamp()
        end_ts = start_ts + 3600

        with AuthTestClient(self.app) as client:
            Recordings.insert(
                id="recording_main",
                path="/media/recordings/front/main.mp4",
                camera="front_door",
                variant="main",
                start_time=start_ts,
                end_time=end_ts,
                duration=3600,
                motion=100,
                objects=5,
                codec_name="h264",
                width=1920,
                height=1080,
                bitrate=4_000_000,
            ).execute()
            Recordings.insert(
                id="recording_sub",
                path="/media/recordings/front/sub.mp4",
                camera="front_door",
                variant="sub",
                start_time=start_ts,
                end_time=end_ts,
                duration=3600,
                motion=100,
                objects=5,
                codec_name="h264",
                width=640,
                height=360,
                bitrate=512_000,
            ).execute()

            default_response = client.get(
                "/front_door/recordings",
                params={"after": start_ts, "before": end_ts},
            )
            assert default_response.status_code == 200
            default_recordings = default_response.json()
            assert len(default_recordings) == 1
            assert default_recordings[0]["variant"] == "main"
            assert default_recordings[0]["transcoded_from_main"] is False

            all_response = client.get(
                "/front_door/recordings",
                params={"after": start_ts, "before": end_ts, "variant": "all"},
            )
            assert all_response.status_code == 200
            all_recordings = all_response.json()
            variants = {recording["variant"] for recording in all_recordings}
            assert variants == {"main", "sub"}
            assert all(recording["transcoded_from_main"] is False for recording in all_recordings)

    def test_camera_recordings_exposes_transcoded_from_main(self):
        start_ts = datetime(2024, 3, 9, 12, 0, 0, tzinfo=timezone.utc).timestamp()
        end_ts = start_ts + 10

        with AuthTestClient(self.app) as client:
            Recordings.insert(
                id="generated_sub_recording",
                path="/media/recordings/front/generated-sub.mp4",
                camera="front_door",
                variant="sub",
                transcoded_from_main=True,
                start_time=start_ts,
                end_time=end_ts,
                duration=10,
                motion=100,
                objects=5,
                codec_name="hevc",
                width=640,
                height=360,
            ).execute()

            response = client.get(
                "/front_door/recordings",
                params={"after": start_ts, "before": end_ts, "variant": "all"},
            )
            assert response.status_code == 200
            recordings = response.json()
            assert len(recordings) == 1
            assert recordings[0]["variant"] == "sub"
            assert recordings[0]["transcoded_from_main"] is True

    def test_vod_variant_path_uses_requested_variant(self):
        start_ts = datetime(2024, 3, 9, 12, 0, 0, tzinfo=timezone.utc).timestamp()
        end_ts = start_ts + 10

        with AuthTestClient(self.app) as client:
            Recordings.insert(
                id="vod_recording_main",
                path="/media/recordings/front_door/main.mp4",
                camera="front_door",
                variant="main",
                start_time=start_ts,
                end_time=end_ts,
                duration=10,
                motion=100,
                objects=5,
            ).execute()
            Recordings.insert(
                id="vod_recording_sub",
                path="/media/recordings/front_door/sub.mp4",
                camera="front_door",
                variant="sub",
                start_time=start_ts,
                end_time=end_ts,
                duration=10,
                motion=100,
                objects=5,
            ).execute()

            response = client.get(
                f"/vod/variant/sub/front_door/start/{start_ts}/end/{end_ts}"
            )
            assert response.status_code == 200
            clips = response.json()["sequences"][0]["clips"]
            assert [clip["path"] for clip in clips] == [
                "/media/recordings/front_door/sub.mp4"
            ]

    def test_vod_variant_path_uses_overlapping_native_sub_without_generation(self):
        main_start_ts = datetime(
            2024, 3, 9, 12, 0, 9, tzinfo=timezone.utc
        ).timestamp()
        main_end_ts = main_start_ts + 9
        native_sub_start_ts = main_start_ts - 1
        native_sub_end_ts = main_end_ts - 1

        with AuthTestClient(self.app) as client:
            Recordings.insert(
                id="vod_recording_main_offset",
                path="/media/recordings/front_door/main-offset.mp4",
                camera="front_door",
                variant="main",
                start_time=main_start_ts,
                end_time=main_end_ts,
                duration=9,
                motion=100,
                objects=5,
                codec_name="hevc",
                width=1920,
                height=1080,
            ).execute()
            Recordings.insert(
                id="vod_recording_sub_offset",
                path="/media/recordings/front_door/sub-offset.mp4",
                camera="front_door",
                variant="sub",
                start_time=native_sub_start_ts,
                end_time=native_sub_end_ts,
                duration=9,
                motion=100,
                objects=5,
                codec_name="hevc",
                width=640,
                height=480,
            ).execute()

            with patch(
                "frigate.api.media.ensure_subvariant_for_recording",
                new=AsyncMock(),
            ) as ensure_subvariant:
                response = client.get(
                    f"/vod/variant/sub/front_door/start/{main_start_ts}/end/{main_end_ts}"
                )

            assert response.status_code == 200
            clips = response.json()["sequences"][0]["clips"]
            assert [clip["path"] for clip in clips] == [
                "/media/recordings/front_door/sub-offset.mp4"
            ]
            ensure_subvariant.assert_not_awaited()

    def test_vod_variant_path_generates_standard_sub_when_missing(self):
        start_ts = datetime(2024, 3, 9, 12, 0, 0, tzinfo=timezone.utc).timestamp()
        end_ts = start_ts + 10

        generated_sub = Recordings(
            id="generated_standard_sub",
            path="/media/recordings/front_door/sub.mp4",
            camera="front_door",
            variant="sub",
            start_time=start_ts,
            end_time=end_ts,
            duration=10,
            motion=100,
            objects=5,
            codec_name="h264",
        )

        with AuthTestClient(self.app) as client:
            Recordings.insert(
                id="vod_recording_main_missing_sub",
                path="/media/recordings/front_door/main.mp4",
                camera="front_door",
                variant="main",
                start_time=start_ts,
                end_time=end_ts,
                duration=10,
                motion=100,
                objects=5,
                codec_name="h264",
            ).execute()

            with patch(
                "frigate.api.media.ensure_subvariant_for_recording",
                new=AsyncMock(return_value=generated_sub),
            ) as ensure_subvariant:
                response = client.get(
                    f"/vod/variant/sub/front_door/start/{start_ts}/end/{end_ts}"
                )

            assert response.status_code == 200
            clips = response.json()["sequences"][0]["clips"]
            assert [clip["path"] for clip in clips] == [
                "/media/recordings/front_door/sub.mp4"
            ]
            ensure_subvariant.assert_awaited_once()

    def test_vod_variant_path_filters_exact_match_generated_sub_when_native_overlap_exists(self):
        main_start_ts = datetime(
            2024, 3, 9, 12, 0, 9, tzinfo=timezone.utc
        ).timestamp()
        main_end_ts = main_start_ts + 9
        native_sub_start_ts = main_start_ts - 1
        native_sub_end_ts = main_end_ts - 1

        with AuthTestClient(self.app) as client:
            Recordings.insert(
                id="vod_recording_main_generated_conflict",
                path="/media/recordings/front_door/main-generated-conflict.mp4",
                camera="front_door",
                variant="main",
                start_time=main_start_ts,
                end_time=main_end_ts,
                duration=9,
                motion=100,
                objects=5,
                codec_name="hevc",
                width=1920,
                height=1080,
            ).execute()
            Recordings.insert(
                id="vod_recording_sub_native_overlap",
                path="/media/recordings/front_door/sub-native-overlap.mp4",
                camera="front_door",
                variant="sub",
                start_time=native_sub_start_ts,
                end_time=native_sub_end_ts,
                duration=9,
                motion=100,
                objects=5,
                codec_name="hevc",
                width=640,
                height=480,
            ).execute()
            Recordings.insert(
                id="vod_recording_sub_generated_like",
                path="/media/recordings/front_door/sub-generated-like.mp4",
                camera="front_door",
                variant="sub",
                start_time=main_start_ts,
                end_time=main_end_ts,
                duration=9,
                motion=100,
                objects=5,
                codec_name="hevc",
                width=640,
                height=360,
            ).execute()

            with patch(
                "frigate.api.media.ensure_subvariant_for_recording",
                new=AsyncMock(),
            ) as ensure_subvariant:
                response = client.get(
                    f"/vod/variant/sub/front_door/start/{main_start_ts}/end/{main_end_ts}"
                )

            assert response.status_code == 200
            clips = response.json()["sequences"][0]["clips"]
            assert [clip["path"] for clip in clips] == [
                "/media/recordings/front_door/sub-native-overlap.mp4"
            ]
            ensure_subvariant.assert_not_awaited()

    def test_vod_variant_path_ignores_legacy_sub_h264_rows(self):
        start_ts = datetime(2024, 3, 9, 12, 0, 0, tzinfo=timezone.utc).timestamp()
        end_ts = start_ts + 10

        generated_sub = Recordings(
            id="standard_sub_fallback",
            path="/media/recordings/front_door/sub.mp4",
            camera="front_door",
            variant="sub",
            start_time=start_ts,
            end_time=end_ts,
            duration=10,
            motion=100,
            objects=5,
            codec_name="h264",
        )

        with AuthTestClient(self.app) as client:
            Recordings.insert(
                id="vod_recording_main_with_legacy",
                path="/media/recordings/front_door/main.mp4",
                camera="front_door",
                variant="main",
                start_time=start_ts,
                end_time=end_ts,
                duration=10,
                motion=100,
                objects=5,
                codec_name="h264",
            ).execute()
            Recordings.insert(
                id="legacy_sub_h264_row",
                path="/media/recordings/front_door/sub_h264.mp4",
                camera="front_door",
                variant="sub_h264",
                start_time=start_ts,
                end_time=end_ts,
                duration=10,
                motion=100,
                objects=5,
                codec_name="h264",
            ).execute()

            with patch(
                "frigate.api.media.ensure_subvariant_for_recording",
                new=AsyncMock(return_value=generated_sub),
            ) as ensure_subvariant:
                response = client.get(
                    f"/vod/variant/sub/front_door/start/{start_ts}/end/{end_ts}"
                )

            assert response.status_code == 200
            clips = response.json()["sequences"][0]["clips"]
            assert [clip["path"] for clip in clips] == [
                "/media/recordings/front_door/sub.mp4"
            ]
            ensure_subvariant.assert_awaited_once()

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
