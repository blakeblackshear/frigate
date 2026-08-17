"""Unit tests for recordings/media API endpoints."""

from dataclasses import dataclass
from datetime import UTC, datetime

import pytz
from fastapi import Request

from frigate.api.auth import get_allowed_cameras_for_filter, get_current_user
from frigate.const import MAX_SEGMENT_DURATION
from frigate.models import Event, Recordings
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp


@dataclass(frozen=True)
class RangeCase:
    """Expected behavior for one segment relative to the requested range.

    Offsets are seconds from REQUEST_START; the request ends at +100 seconds.
    """

    name: str
    start_offset: float
    end_offset: float
    included_in_recordings: bool
    vod_clip_from_ms: int | None = None
    vod_duration_ms: int | None = None


REQUEST_START = 1000
REQUEST_END = 1100
RANGE_CASES = (
    RangeCase("before", -MAX_SEGMENT_DURATION + 1, -1, False),
    RangeCase("meets_start", -10, 0, True),
    RangeCase(
        "overlaps_start",
        -MAX_SEGMENT_DURATION + 0.5,
        0.25,
        True,
        vod_clip_from_ms=599500,
        vod_duration_ms=250,
    ),
    RangeCase("starts_at_start", 0, 10, True, vod_duration_ms=10000),
    RangeCase("inside", 20, 80, True, vod_duration_ms=60000),
    RangeCase("ends_at_end", 90, 100, True, vod_duration_ms=10000),
    RangeCase("matches_range", 0, 100, True, vod_duration_ms=100000),
    RangeCase("starts_with_range", 0, 110, True, vod_duration_ms=100000),
    RangeCase(
        "covers_range",
        -20,
        120,
        True,
        vod_clip_from_ms=20000,
        vod_duration_ms=100000,
    ),
    RangeCase(
        "ends_with_range",
        -10,
        100,
        True,
        vod_clip_from_ms=10000,
        vod_duration_ms=100000,
    ),
    RangeCase("overlaps_end", 95, 105, True, vod_duration_ms=5000),
    RangeCase("starts_at_end", 100, 110, True),
    RangeCase("after", 101, 110, False),
)


class TestHttpMedia(BaseTestHttp):
    """Test media API endpoints, particularly recordings with DST handling."""

    def setUp(self):
        """Set up test fixtures."""
        super().setUp([Event, Recordings])
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

    def _assert_vod_response(
        self,
        response,
        expected_clips: list[tuple[str, int | None, int]],
    ) -> None:
        """Assert VOD clip metadata and its derived duration fields."""
        assert response.status_code == 200
        vod = response.json()
        assert [
            (
                clip["path"],
                clip.get("clipFrom"),
                clip["keyFrameDurations"][0],
            )
            for clip in vod["sequences"][0]["clips"]
        ] == expected_clips
        expected_durations = [clip[2] for clip in expected_clips]
        assert vod["durations"] == expected_durations

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
        march_9_utc = datetime(2024, 3, 9, 17, 0, 0, tzinfo=UTC).timestamp()
        march_10_utc = datetime(2024, 3, 10, 17, 0, 0, tzinfo=UTC).timestamp()

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

    def test_recordings_summary_includes_sub_only_days(self):
        """
        A day covered only by sub-stream rows still gets a day marker.

        Retention can expire main rows while keeping sub history, so the
        calendar must not filter by stream type.
        """
        march_9_utc = datetime(2024, 3, 9, 12, 0, 0, tzinfo=UTC).timestamp()
        march_10_utc = datetime(2024, 3, 10, 12, 0, 0, tzinfo=UTC).timestamp()

        with AuthTestClient(self.app) as client:
            self._insert_recording(
                "main_march_9", march_9_utc, march_9_utc + 3600, stream_type="main"
            )
            self._insert_recording(
                "sub_march_10", march_10_utc, march_10_utc + 3600, stream_type="sub"
            )

            response = client.get(
                "/recordings/summary", params={"timezone": "utc", "cameras": "all"}
            )

            assert response.status_code == 200
            summary = response.json()
            assert len(summary) == 2
            assert summary["2024-03-09"] is True
            assert summary["2024-03-10"] is True

    def test_recordings_summary_sparse_days_across_large_gap(self):
        """
        Only recorded days are reported when a large empty gap separates them.
        """
        early = datetime(2023, 1, 5, 12, 0, 0, tzinfo=UTC).timestamp()
        late = datetime(2024, 3, 10, 12, 0, 0, tzinfo=UTC).timestamp()

        with AuthTestClient(self.app) as client:
            self._insert_recording("early_day", early, early + 3600)
            self._insert_recording("late_day", late, late + 3600)

            response = client.get(
                "/recordings/summary", params={"timezone": "utc", "cameras": "all"}
            )

            assert response.status_code == 200
            summary = response.json()
            assert summary == {"2023-01-05": True, "2024-03-10": True}

    def test_recordings_unavailable_merges_cameras(self):
        """
        Gaps are computed against the union of all requested cameras' coverage.
        """

        async def allow_both_cameras(request: Request):
            return ["front_door", "back_door"]

        self.app.dependency_overrides[get_allowed_cameras_for_filter] = (
            allow_both_cameras
        )

        with AuthTestClient(self.app) as client:
            for id, camera, start, end in [
                ("front_a", "front_door", 1000, 1100),
                ("front_b", "front_door", 1200, 1300),
                ("back_a", "back_door", 1100, 1160),
            ]:
                Recordings.insert(
                    id=id,
                    path=f"/media/recordings/{id}.mp4",
                    camera=camera,
                    start_time=start,
                    end_time=end,
                    duration=end - start,
                    motion=0,
                    objects=0,
                ).execute()

            response = client.get(
                "/recordings/unavailable",
                params={
                    "after": 1000,
                    "before": 1300,
                    "scale": 10,
                    "cameras": "front_door,back_door",
                },
            )
            assert response.status_code == 200
            assert response.json() == [{"start_time": 1160, "end_time": 1200}]

            # single camera: back_door alone leaves both edges uncovered
            response = client.get(
                "/recordings/unavailable",
                params={
                    "after": 1000,
                    "before": 1300,
                    "scale": 10,
                    "cameras": "back_door",
                },
            )
            assert response.status_code == 200
            assert response.json() == [
                {"start_time": 1000, "end_time": 1100},
                {"start_time": 1160, "end_time": 1300},
            ]

    def test_recordings_summary_day_attribution_by_start_time(self):
        """
        A recording spanning midnight marks only its start day.
        """
        # starts 23:30 March 9, ends 00:30 March 10 (UTC)
        start = datetime(2024, 3, 9, 23, 30, 0, tzinfo=UTC).timestamp()

        with AuthTestClient(self.app) as client:
            self._insert_recording("midnight_span", start, start + 3600)

            response = client.get(
                "/recordings/summary", params={"timezone": "utc", "cameras": "all"}
            )

            assert response.status_code == 200
            summary = response.json()
            assert len(summary) == 1
            assert summary["2024-03-09"] is True

    def _insert_recording(
        self,
        id: str,
        start_time: float,
        end_time: float,
        stream_type: str = "main",
        motion: int = 0,
        objects: int = 0,
        has_audio: bool | None = None,
        audio_rate: int | None = None,
        audio_codec: str | None = None,
        video_codec: str | None = None,
        keyframes: list[int] | None = None,
    ) -> None:
        """Insert a recording row with an explicit stream type."""
        Recordings.insert(
            id=id,
            path=f"/media/recordings/{id}.mp4",
            camera="front_door",
            start_time=start_time,
            end_time=end_time,
            duration=end_time - start_time,
            motion=motion,
            objects=objects,
            stream_type=stream_type,
            has_audio=has_audio,
            audio_rate=audio_rate,
            audio_codec=audio_codec,
            video_codec=video_codec,
            keyframes=keyframes,
        ).execute()

    @staticmethod
    def _sequence_paths(sequence: dict) -> list[str]:
        """Collect a sequence's source clip file paths."""
        return [clip["path"] for clip in sequence["clips"]]

    def test_coverage_timelines_match_vod_mapping_durations(self):
        """The realized timelines equal the vod mapping's durations exactly.

        This is the anti-drift invariant: the frontend maps playhead to
        wall clock by walking the coverage timelines, so any clip the
        manifest realizes differently (keyframe back-snap lead-ins,
        whole-file fallbacks, skipped clips) would reappear as playhead
        drift. The mid-file sub resume at 1020 exercises the snap
        lead-in path through its stored keyframe index, while sub_3
        (no stored index) exercises the whole-file fallback.
        """
        with AuthTestClient(self.app) as client:
            self._insert_recording("main_1", 1000, 1010, "main", keyframes=[0])
            self._insert_recording("main_2", 1010, 1020, "main", keyframes=[0])
            self._insert_recording("sub_1", 1003, 1013, "sub", keyframes=[0])
            self._insert_recording(
                "sub_2", 1013, 1023, "sub", keyframes=[0, 3000, 6000, 9000]
            )
            self._insert_recording("sub_3", 1023, 1033, "sub")

            coverage = client.get(
                "/front_door/recordings/coverage",
                params={"after": 1000, "before": 1033, "timelines": True},
            ).json()

            for variant, route in (
                ("auto", "/vod/front_door/start/1000/end/1033"),
                ("main", "/vod/front_door/main/start/1000/end/1033"),
                ("sub", "/vod/front_door/sub/start/1000/end/1033"),
            ):
                with self.subTest(variant=variant):
                    mapping = client.get(route).json()
                    realized = [
                        t["duration"]
                        for t in coverage["timelines"][variant]
                        if t["duration"] > 0
                    ]
                    assert realized == mapping["durations"]

            # the [1020,1023) span (7000ms into sub_2) snaps back to the
            # stored 6000ms keyframe, serving 4000ms for a 3000ms span
            auto = coverage["timelines"]["auto"]
            resume = next(t for t in auto if t["start_time"] == 1020)
            assert resume["end_time"] == 1023
            assert resume["duration"] == 4000

    def test_vod_dual_coverage_serves_merged_single_sequence(self):
        """Full dual coverage on the default route is a merged main-preferred
        single sequence. In-manifest ABR was removed deliberately (see
        config/superpowers/specs/2026-06-11-sub-stream-recording-playback-issues.md)."""
        with AuthTestClient(self.app) as client:
            self._insert_recording("main_1", 1000, 1010, "main")
            self._insert_recording("main_2", 1010, 1020, "main")
            self._insert_recording("sub_1", 1000, 1010, "sub")
            self._insert_recording("sub_2", 1010, 1020, "sub")

            response = client.get("/vod/front_door/start/1000/end/1020")

            assert response.status_code == 200
            body = response.json()
            assert len(body["sequences"]) == 1
            assert body["consistentSequenceMediaInfo"] is True
            assert body["durations"] == [10000, 10000]
            assert self._sequence_paths(body["sequences"][0]) == [
                "/media/recordings/main_1.mp4",
                "/media/recordings/main_2.mp4",
            ]

    def test_vod_merges_intervals_split_by_other_stream_boundaries(self):
        """A recording spanning several coverage intervals stays one clip.

        Coverage intervals split at BOTH streams' file edges, so a main row
        is routinely cut by sub boundaries it has nothing to do with; the
        span builder must merge those cuts back into a single clip.
        """
        with AuthTestClient(self.app) as client:
            self._insert_recording("main_1", 1000, 1010, "main")
            self._insert_recording("sub_1", 1000, 1004, "sub")
            self._insert_recording("sub_2", 1004, 1010, "sub")

            # default route: one main clip despite the sub edge at 1004
            response = client.get("/vod/front_door/start/1000/end/1010")
            assert response.status_code == 200
            body = response.json()
            assert body["durations"] == [10000]
            assert self._sequence_paths(body["sequences"][0]) == [
                "/media/recordings/main_1.mp4"
            ]

            # pinned sub: two clips (two real files), no main leakage
            response = client.get("/vod/front_door/sub/start/1000/end/1010")
            assert response.status_code == 200
            body = response.json()
            assert body["durations"] == [4000, 6000]
            assert self._sequence_paths(body["sequences"][0]) == [
                "/media/recordings/sub_1.mp4",
                "/media/recordings/sub_2.mp4",
            ]

    def test_vod_sub_minimum_interval_overlaps_no_clipfrom(self):
        """Overlaps below the resolver's minimum interval produce no clipFrom.

        Millisecond-scale overlaps produce coverage intervals too short to
        survive, leaving the previous span ending exactly at the next
        row's start. The hand-off must still fire there, or every clip
        gets a no-op mid-file entry that repeats no content but still
        snaps.
        """
        with AuthTestClient(self.app) as client:
            self._insert_recording("sub_1", 1000, 1010.001, "sub", keyframes=[0])
            self._insert_recording("sub_2", 1010, 1020.0004, "sub", keyframes=[0])
            self._insert_recording("sub_3", 1020, 1029.997, "sub", keyframes=[0])

            response = client.get("/vod/front_door/sub/start/1000/end/1029.997")

            assert response.status_code == 200
            body = response.json()
            clips = body["sequences"][0]["clips"]
            assert len(clips) == 3
            for clip in clips:
                assert "clipFrom" not in clip

    def test_vod_overlapping_rows_no_clipfrom(self):
        """Systematic sliver overlaps between adjacent rows produce no clipFrom.

        Recording start times are integer-truncated while end times are
        fractional, so nearly every adjacent same-stream row pair overlaps
        by tens to hundreds of ms. The span builder hands the overlap to
        the later row (end-trimming the earlier clip), so no clip starts
        mid-file and no content repeats.
        """
        with AuthTestClient(self.app) as client:
            self._insert_recording("main_1", 1000, 1010.5, "main", keyframes=[0])
            self._insert_recording("main_2", 1010, 1020.4, "main", keyframes=[0])
            self._insert_recording("main_3", 1020, 1030.3, "main", keyframes=[0])
            self._insert_recording("main_4", 1030, 1040.2, "main", keyframes=[0])

            response = client.get("/vod/front_door/start/1000/end/1040.2")

            assert response.status_code == 200
            body = response.json()
            clips = body["sequences"][0]["clips"]
            assert self._sequence_paths(body["sequences"][0]) == [
                "/media/recordings/main_1.mp4",
                "/media/recordings/main_2.mp4",
                "/media/recordings/main_3.mp4",
                "/media/recordings/main_4.mp4",
            ]
            for clip in clips:
                assert "clipFrom" not in clip
            # 1000 -> 1040.2 with no repeated content; each end-trim
            # truncates at most 1ms via int()
            assert abs(sum(body["durations"]) - 40200) <= 4

    def test_vod_request_boundary_keeps_clipfrom(self):
        """A request starting mid-file keeps the legitimate boundary clipFrom.

        Only the FIRST clip starts at the request-clamped boundary; the
        overlap hand-off must not disturb it, and every later clip still
        starts at its own file start with no keyframe probe.
        """
        with AuthTestClient(self.app) as client:
            self._insert_recording(
                "main_1", 1000, 1010.5, "main", keyframes=[0, 2000, 4000]
            )
            self._insert_recording("main_2", 1010, 1020.4, "main", keyframes=[0])
            self._insert_recording("main_3", 1020, 1030.3, "main", keyframes=[0])
            self._insert_recording("main_4", 1030, 1040.2, "main", keyframes=[0])

            response = client.get("/vod/front_door/start/1005/end/1040")

            assert response.status_code == 200
            body = response.json()
            clips = body["sequences"][0]["clips"]
            # the 5000ms boundary inpoint snaps back to the stored 4000ms
            # keyframe
            assert clips[0]["clipFrom"] == 4000
            for clip in clips[1:]:
                assert "clipFrom" not in clip

    def test_vod_large_overlap_handed_to_later_row(self):
        """A multi-second overlap (double-recorder incident) is handed off too.

        The earlier clip is end-trimmed back to the later row's start, so
        the later clip plays its full file with no clipFrom keyframe probe
        and no content repeats.
        """
        with AuthTestClient(self.app) as client:
            self._insert_recording("main_1", 1000, 1010.0, "main", keyframes=[0])
            self._insert_recording("main_2", 1005, 1015.0, "main", keyframes=[0])

            response = client.get("/vod/front_door/start/1000/end/1015")

            assert response.status_code == 200
            body = response.json()
            clips = body["sequences"][0]["clips"]
            assert self._sequence_paths(body["sequences"][0]) == [
                "/media/recordings/main_1.mp4",
                "/media/recordings/main_2.mp4",
            ]
            for clip in clips:
                assert "clipFrom" not in clip
            # the first clip is end-trimmed to the second row's start
            assert body["durations"] == [5000, 10000]
            assert sum(body["durations"]) == 15000

    def test_vod_cross_stream_resume_keeps_clipfrom(self):
        """A sub row resuming after a mid-file main burst keeps clipFrom.

        On the merged route, main is preferred mid-window for an event
        burst; the sub row that resumes afterwards started long before the
        hand-back point, so its clip must start mid-file with the keyframe
        snap to stay decodable. The overlap hand-off only applies to
        same-stream overlaps and must not trim the main burst.
        """
        with AuthTestClient(self.app) as client:
            self._insert_recording("sub_1", 1000, 1010, "sub", keyframes=[0])
            self._insert_recording("sub_2", 1010, 1020, "sub", keyframes=[0, 500])
            self._insert_recording("sub_3", 1020, 1030, "sub", keyframes=[0])
            self._insert_recording("main_1", 1008, 1018, "main", keyframes=[0])

            response = client.get("/vod/front_door/start/1000/end/1030")

            assert response.status_code == 200
            body = response.json()
            clips = body["sequences"][0]["clips"]
            assert self._sequence_paths(body["sequences"][0]) == [
                "/media/recordings/sub_1.mp4",
                "/media/recordings/main_1.mp4",
                "/media/recordings/sub_2.mp4",
                "/media/recordings/sub_3.mp4",
            ]
            # only the resumed sub clip starts mid-file
            assert "clipFrom" not in clips[0]
            assert "clipFrom" not in clips[1]
            assert "clipFrom" in clips[2]
            assert "clipFrom" not in clips[3]

    def test_vod_single_sequence_sub_only(self):
        """A sub-only range serves a single sequence of sub clips."""
        with AuthTestClient(self.app) as client:
            self._insert_recording("sub_1", 1000, 1010, "sub")
            self._insert_recording("sub_2", 1010, 1020, "sub")

            response = client.get("/vod/front_door/start/1000/end/1020")

            assert response.status_code == 200
            body = response.json()
            assert len(body["sequences"]) == 1
            assert body["consistentSequenceMediaInfo"] is True
            assert body["durations"] == [10000, 10000]
            assert [c["path"] for c in body["sequences"][0]["clips"]] == [
                "/media/recordings/sub_1.mp4",
                "/media/recordings/sub_2.mp4",
            ]

    def test_vod_single_main_unchanged(self):
        """Main-only recordings (the pre-feature case) keep the legacy contract."""
        with AuthTestClient(self.app) as client:
            self._insert_recording("main_1", 1000, 1010, "main")
            self._insert_recording("main_2", 1010, 1020, "main")

            response = client.get("/vod/front_door/start/1000/end/1020")

            assert response.status_code == 200
            body = response.json()
            assert body["cache"] is True
            assert body["discontinuity"] is False
            assert "initialClipIndex" not in body
            assert body["consistentSequenceMediaInfo"] is True
            assert body["durations"] == [10000, 10000]
            assert len(body["sequences"]) == 1
            clips = body["sequences"][0]["clips"]
            assert [c["path"] for c in clips] == [
                "/media/recordings/main_1.mp4",
                "/media/recordings/main_2.mp4",
            ]
            for clip in clips:
                assert clip["type"] == "source"
                assert clip["keyFrameDurations"] == [10000]
                assert "clipFrom" not in clip

    def test_vod_no_recordings_returns_404(self):
        """No recordings in range preserves the legacy 404 response."""
        with AuthTestClient(self.app) as client:
            response = client.get("/vod/front_door/start/1000/end/1020")

            assert response.status_code == 404
            body = response.json()
            assert body["success"] is False
            assert body["message"] == "No recordings found."

    def test_vod_clip_route_always_single_sequence(self):
        """The tracking-details clip route stays single-sequence with dual coverage.

        The explore player reads sequences[0].clips[0].clipFrom to correct its
        timeline, so /vod/clip relies on the single-sequence keyframe back-snap
        path. With an offset start the keyframe probe runs and fails (paths
        don't exist on disk), which strips clipFrom and falls back to the full
        recording - exactly the legacy behavior the frontend reasons about.
        """
        with AuthTestClient(self.app) as client:
            self._insert_recording("main_1", 1000, 1010, "main")
            self._insert_recording("main_2", 1010, 1020, "main")
            self._insert_recording("sub_1", 1000, 1010, "sub")
            self._insert_recording("sub_2", 1010, 1020, "sub")

            response = client.get("/vod/clip/front_door/start/1003/end/1020")

            assert response.status_code == 200
            body = response.json()
            assert body["discontinuity"] is True
            # uniform single-stream clips: forced discontinuity alone must
            # not switch to clip-indexed naming / per-clip init segments
            assert "initialClipIndex" not in body
            assert len(body["sequences"]) == 1
            assert body["consistentSequenceMediaInfo"] is True
            clips = body["sequences"][0]["clips"]
            assert [c["path"] for c in clips] == [
                "/media/recordings/main_1.mp4",
                "/media/recordings/main_2.mp4",
            ]
            # the failed keyframe probe removed clipFrom and restored the
            # full recording duration (legacy single-sequence fallback)
            assert "clipFrom" not in clips[0]
            assert body["durations"] == [10000, 10000]

    def test_vod_merged_fallback_mixed_composition_video_only(self):
        """The merged sequence goes video-only when rows mix compositions.

        A long sub-only stretch means the merged sequence mixes muxed
        main files and audio-less sub files. Track-PRESENCE mixing
        across discontinuities is unproven in MSE, so every clip is
        stripped to video tracks (the cross-stream hand-off still serves
        the range in discontinuity mode).
        """
        with AuthTestClient(self.app) as client:
            self._insert_recording("main_1", 1000, 1010, "main", has_audio=True)
            self._insert_recording("main_2", 1010, 1020, "main", has_audio=True)
            for i in range(6):
                self._insert_recording(
                    f"sub_{i + 1}", 1000 + i * 10, 1010 + i * 10, "sub", has_audio=False
                )

            response = client.get("/vod/front_door/start/1000/end/1060")

            assert response.status_code == 200
            body = response.json()
            assert len(body["sequences"]) == 1
            assert body["consistentSequenceMediaInfo"] is True
            clips = body["sequences"][0]["clips"]
            assert [c["path"] for c in clips] == [
                "/media/recordings/main_1.mp4",
                "/media/recordings/main_2.mp4",
                "/media/recordings/sub_3.mp4",
                "/media/recordings/sub_4.mp4",
                "/media/recordings/sub_5.mp4",
                "/media/recordings/sub_6.mp4",
            ]
            for clip in clips:
                assert clip["tracks"] == "v"
            assert body["discontinuity"] is True
            assert body["initialClipIndex"] == 1

    def test_vod_merged_fallback_glitch_row_skipped(self):
        """The merged sequence skips video-only glitch rows entirely.

        A truncated shutdown segment with no audio on an otherwise
        audio-bearing stream is served by neither stream; the timeline
        compresses over it like any recording gap because a small hole
        beats a manifest nginx-vod rejects for track count mismatch.
        """
        with AuthTestClient(self.app) as client:
            # main covers 1000-1050 plus a sub-second video-only glitch;
            # a 40s sub outage leaves main serving most of the range
            for i in range(5):
                self._insert_recording(
                    f"main_{i + 1}",
                    1000 + i * 10,
                    1010 + i * 10,
                    "main",
                    has_audio=True,
                )
            self._insert_recording("main_glitch", 1050, 1050.4, "main", has_audio=False)
            self._insert_recording("sub_1", 1000, 1010, "sub", has_audio=True)

            response = client.get("/vod/front_door/start/1000/end/1051")

            assert response.status_code == 200
            body = response.json()
            assert len(body["sequences"]) == 1
            clips = body["sequences"][0]["clips"]
            assert [c["path"] for c in clips] == [
                f"/media/recordings/main_{i + 1}.mp4" for i in range(5)
            ]
            # surviving rows are uniformly muxed: nothing is stripped
            for clip in clips:
                assert "tracks" not in clip

    def test_vod_merged_fallback_uniform_audio_no_tracks(self):
        """The merged sequence leaves uniform-composition clips untouched."""
        with AuthTestClient(self.app) as client:
            for i in range(5):
                self._insert_recording(
                    f"main_{i + 1}",
                    1000 + i * 10,
                    1010 + i * 10,
                    "main",
                    has_audio=True,
                )
            self._insert_recording("sub_1", 1000, 1010, "sub", has_audio=True)

            response = client.get("/vod/front_door/start/1000/end/1050")

            assert response.status_code == 200
            body = response.json()
            assert len(body["sequences"]) == 1
            clips = body["sequences"][0]["clips"]
            assert [c["path"] for c in clips] == [
                f"/media/recordings/main_{i + 1}.mp4" for i in range(5)
            ]
            for clip in clips:
                assert "tracks" not in clip

    def test_vod_merged_mismatched_audio_rates_discontinuity(self):
        """Mixed audio sample rates serve a discontinuity manifest with audio.

        Clips whose AAC sample rates differ (main 16kHz, sub 8kHz) need a
        fresh decoder config at each transition; discontinuity mode with
        per-clip init segments (initialClipIndex) lets the decoder
        reconfigure there, so audio is kept instead of stripped.
        """
        with AuthTestClient(self.app) as client:
            self._insert_recording(
                "main_1", 1000, 1010, "main", has_audio=True, audio_rate=16000
            )
            self._insert_recording(
                "main_2", 1010, 1020, "main", has_audio=True, audio_rate=16000
            )
            for i in range(6):
                self._insert_recording(
                    f"sub_{i + 1}",
                    1000 + i * 10,
                    1010 + i * 10,
                    "sub",
                    has_audio=True,
                    audio_rate=8000,
                )

            response = client.get("/vod/front_door/start/1000/end/1060")

            assert response.status_code == 200
            body = response.json()
            assert len(body["sequences"]) == 1
            clips = body["sequences"][0]["clips"]
            assert [c["path"] for c in clips] == [
                "/media/recordings/main_1.mp4",
                "/media/recordings/main_2.mp4",
                "/media/recordings/sub_3.mp4",
                "/media/recordings/sub_4.mp4",
                "/media/recordings/sub_5.mp4",
                "/media/recordings/sub_6.mp4",
            ]
            for clip in clips:
                assert "tracks" not in clip
            assert body["discontinuity"] is True
            assert body["initialClipIndex"] == 1

    def test_vod_merged_matching_audio_rates_keep_audio(self):
        """Matching audio parameters across streams keep audio intact.

        When main and sub both carry 16kHz audio no clip is stripped;
        the manifest still runs in discontinuity mode because the two
        encoders differ in SPS/PPS regardless of matching parameters.
        """
        with AuthTestClient(self.app) as client:
            self._insert_recording(
                "main_1", 1000, 1010, "main", has_audio=True, audio_rate=16000
            )
            self._insert_recording(
                "main_2", 1010, 1020, "main", has_audio=True, audio_rate=16000
            )
            for i in range(6):
                self._insert_recording(
                    f"sub_{i + 1}",
                    1000 + i * 10,
                    1010 + i * 10,
                    "sub",
                    has_audio=True,
                    audio_rate=16000,
                )

            response = client.get("/vod/front_door/start/1000/end/1060")

            assert response.status_code == 200
            body = response.json()
            assert len(body["sequences"]) == 1
            clips = body["sequences"][0]["clips"]
            assert [c["path"] for c in clips] == [
                "/media/recordings/main_1.mp4",
                "/media/recordings/main_2.mp4",
                "/media/recordings/sub_3.mp4",
                "/media/recordings/sub_4.mp4",
                "/media/recordings/sub_5.mp4",
                "/media/recordings/sub_6.mp4",
            ]
            for clip in clips:
                assert "tracks" not in clip
            assert body["discontinuity"] is True
            assert body["initialClipIndex"] == 1

    def test_vod_merged_known_and_unknown_rate_keeps_legacy(self):
        """Fully-unknown audio params next to a known rate stay legacy.

        One stream's rate is known, the other's audio params are entirely
        NULL (legacy rows probed before the columns existed); rows with
        no known params contribute no signature, so audio survives
        instead of being stripped for a parameter mismatch.
        """
        with AuthTestClient(self.app) as client:
            self._insert_recording(
                "main_1", 1000, 1010, "main", has_audio=True, audio_rate=16000
            )
            self._insert_recording(
                "main_2", 1010, 1020, "main", has_audio=True, audio_rate=16000
            )
            for i in range(6):
                self._insert_recording(
                    f"sub_{i + 1}",
                    1000 + i * 10,
                    1010 + i * 10,
                    "sub",
                    has_audio=True,
                    audio_rate=None,
                )

            response = client.get("/vod/front_door/start/1000/end/1060")

            assert response.status_code == 200
            body = response.json()
            clips = body["sequences"][0]["clips"]
            assert [c["path"] for c in clips] == [
                "/media/recordings/main_1.mp4",
                "/media/recordings/main_2.mp4",
                "/media/recordings/sub_3.mp4",
                "/media/recordings/sub_4.mp4",
                "/media/recordings/sub_5.mp4",
                "/media/recordings/sub_6.mp4",
            ]
            for clip in clips:
                assert "tracks" not in clip
            assert body["discontinuity"] is True
            assert body["initialClipIndex"] == 1

    def test_vod_merged_mismatched_audio_codecs_discontinuity(self):
        """Mixed audio codecs serve a discontinuity manifest with audio.

        Clips whose audio codecs differ (main AAC, sub G.711 a-law) need
        a fresh decoder config at each transition even with matching
        sample rates; per-clip init segments provide it.
        """
        with AuthTestClient(self.app) as client:
            self._insert_recording(
                "main_1",
                1000,
                1010,
                "main",
                has_audio=True,
                audio_rate=8000,
                audio_codec="aac",
            )
            self._insert_recording(
                "main_2",
                1010,
                1020,
                "main",
                has_audio=True,
                audio_rate=8000,
                audio_codec="aac",
            )
            for i in range(6):
                self._insert_recording(
                    f"sub_{i + 1}",
                    1000 + i * 10,
                    1010 + i * 10,
                    "sub",
                    has_audio=True,
                    audio_rate=8000,
                    audio_codec="pcm_alaw",
                )

            response = client.get("/vod/front_door/start/1000/end/1060")

            assert response.status_code == 200
            body = response.json()
            assert len(body["sequences"]) == 1
            clips = body["sequences"][0]["clips"]
            assert [c["path"] for c in clips] == [
                "/media/recordings/main_1.mp4",
                "/media/recordings/main_2.mp4",
                "/media/recordings/sub_3.mp4",
                "/media/recordings/sub_4.mp4",
                "/media/recordings/sub_5.mp4",
                "/media/recordings/sub_6.mp4",
            ]
            for clip in clips:
                assert "tracks" not in clip
            assert body["discontinuity"] is True
            assert body["initialClipIndex"] == 1

    def test_vod_merged_matching_audio_codecs_keep_audio(self):
        """Matching audio codec and rate across streams keep audio intact."""
        with AuthTestClient(self.app) as client:
            self._insert_recording(
                "main_1",
                1000,
                1010,
                "main",
                has_audio=True,
                audio_rate=16000,
                audio_codec="aac",
            )
            self._insert_recording(
                "main_2",
                1010,
                1020,
                "main",
                has_audio=True,
                audio_rate=16000,
                audio_codec="aac",
            )
            for i in range(6):
                self._insert_recording(
                    f"sub_{i + 1}",
                    1000 + i * 10,
                    1010 + i * 10,
                    "sub",
                    has_audio=True,
                    audio_rate=16000,
                    audio_codec="aac",
                )

            response = client.get("/vod/front_door/start/1000/end/1060")

            assert response.status_code == 200
            body = response.json()
            clips = body["sequences"][0]["clips"]
            assert [c["path"] for c in clips] == [
                "/media/recordings/main_1.mp4",
                "/media/recordings/main_2.mp4",
                "/media/recordings/sub_3.mp4",
                "/media/recordings/sub_4.mp4",
                "/media/recordings/sub_5.mp4",
                "/media/recordings/sub_6.mp4",
            ]
            for clip in clips:
                assert "tracks" not in clip
            assert body["discontinuity"] is True
            assert body["initialClipIndex"] == 1

    def test_vod_merged_known_and_unknown_audio_codec_discontinuity(self):
        """A partially-known audio signature next to a known one differs.

        One stream's audio codec is known, the other's is NULL with a
        known rate; both rows carry a (partially) known signature and the
        signatures differ, so the manifest plays through discontinuity
        mode rather than risking a mid-sequence decoder mismatch.
        """
        with AuthTestClient(self.app) as client:
            self._insert_recording(
                "main_1",
                1000,
                1010,
                "main",
                has_audio=True,
                audio_rate=16000,
                audio_codec="aac",
            )
            self._insert_recording(
                "main_2",
                1010,
                1020,
                "main",
                has_audio=True,
                audio_rate=16000,
                audio_codec="aac",
            )
            for i in range(6):
                self._insert_recording(
                    f"sub_{i + 1}",
                    1000 + i * 10,
                    1010 + i * 10,
                    "sub",
                    has_audio=True,
                    audio_rate=16000,
                    audio_codec=None,
                )

            response = client.get("/vod/front_door/start/1000/end/1060")

            assert response.status_code == 200
            body = response.json()
            clips = body["sequences"][0]["clips"]
            assert [c["path"] for c in clips] == [
                "/media/recordings/main_1.mp4",
                "/media/recordings/main_2.mp4",
                "/media/recordings/sub_3.mp4",
                "/media/recordings/sub_4.mp4",
                "/media/recordings/sub_5.mp4",
                "/media/recordings/sub_6.mp4",
            ]
            for clip in clips:
                assert "tracks" not in clip
            assert body["discontinuity"] is True
            assert body["initialClipIndex"] == 1

    def test_vod_merged_all_unknown_audio_keeps_audio(self):
        """Uniformly-unknown rows (the pre-feature case) are never stripped.

        Legacy rows have has_audio NULL and audio_rate NULL; they share a
        single signature, so audio plays (the cross-stream hand-off still
        serves the range in discontinuity mode).
        """
        with AuthTestClient(self.app) as client:
            self._insert_recording("main_1", 1000, 1010, "main")
            self._insert_recording("main_2", 1010, 1020, "main")
            for i in range(6):
                self._insert_recording(
                    f"sub_{i + 1}", 1000 + i * 10, 1010 + i * 10, "sub"
                )

            response = client.get("/vod/front_door/start/1000/end/1060")

            assert response.status_code == 200
            body = response.json()
            clips = body["sequences"][0]["clips"]
            assert [c["path"] for c in clips] == [
                "/media/recordings/main_1.mp4",
                "/media/recordings/main_2.mp4",
                "/media/recordings/sub_3.mp4",
                "/media/recordings/sub_4.mp4",
                "/media/recordings/sub_5.mp4",
                "/media/recordings/sub_6.mp4",
            ]
            for clip in clips:
                assert "tracks" not in clip
            assert body["discontinuity"] is True
            assert body["initialClipIndex"] == 1

    def test_vod_pinned_sub_serves_only_sub(self):
        """A pinned manifest contains only the pinned stream's recordings.

        Time covered only by the other stream is omitted entirely; the
        timeline compresses there like any recording gap.
        """
        with AuthTestClient(self.app) as client:
            # sub covers 0-10 and 20-30; main covers everything including
            # the 10-20 hole
            self._insert_recording("sub_1", 1000, 1010, "sub")
            self._insert_recording("sub_2", 1020, 1030, "sub")
            for i in range(3):
                self._insert_recording(
                    f"main_{i + 1}", 1000 + i * 10, 1010 + i * 10, "main"
                )

            response = client.get("/vod/front_door/sub/start/1000/end/1030")

            assert response.status_code == 200
            body = response.json()
            assert len(body["sequences"]) == 1
            assert body["consistentSequenceMediaInfo"] is True
            # the main-only 10s hole is omitted, not filled
            assert body["durations"] == [10000, 10000]
            assert self._sequence_paths(body["sequences"][0]) == [
                "/media/recordings/sub_1.mp4",
                "/media/recordings/sub_2.mp4",
            ]

    def test_vod_pinned_main_serves_only_main(self):
        """Pinned main on event-style history serves only the main bursts."""
        with AuthTestClient(self.app) as client:
            # continuous sub, main only for one 10s burst in the middle
            for i in range(3):
                self._insert_recording(
                    f"sub_{i + 1}", 1000 + i * 10, 1010 + i * 10, "sub"
                )
            self._insert_recording("main_1", 1010, 1020, "main")

            response = client.get("/vod/front_door/main/start/1000/end/1030")

            assert response.status_code == 200
            body = response.json()
            assert len(body["sequences"]) == 1
            assert body["durations"] == [10000]
            assert self._sequence_paths(body["sequences"][0]) == [
                "/media/recordings/main_1.mp4"
            ]

    def test_vod_pinned_stream_with_no_rows_returns_404(self):
        """Pinning a stream with no recordings in range is a 404, not a fill."""
        with AuthTestClient(self.app) as client:
            self._insert_recording("main_1", 1000, 1010, "main")

            response = client.get("/vod/front_door/sub/start/1000/end/1010")

            assert response.status_code == 404

    def test_vod_pinned_sub_glitch_row_skipped(self):
        """A video-only glitch row on an audio-bearing pinned stream is omitted.

        Serving it would change the track count mid-sequence and break
        audio decode in players; a sub-second hole is the lesser evil.
        """
        with AuthTestClient(self.app) as client:
            self._insert_recording("sub_1", 1000, 1010, "sub", has_audio=True)
            self._insert_recording("sub_glitch", 1010, 1011, "sub", has_audio=False)
            self._insert_recording("sub_3", 1011, 1021, "sub", has_audio=True)

            response = client.get("/vod/front_door/sub/start/1000/end/1021")

            assert response.status_code == 200
            body = response.json()
            paths = self._sequence_paths(body["sequences"][0])
            assert "/media/recordings/sub_glitch.mp4" not in paths
            assert len(paths) == 2
            # no composition mixing remains, so no tracks strip
            for clip in body["sequences"][0]["clips"]:
                assert "tracks" not in clip

    def test_vod_pinned_invalid_stream_rejected(self):
        """An unknown stream segment fails path validation."""
        with AuthTestClient(self.app) as client:
            self._insert_recording("main_1", 1000, 1010, "main")

            response = client.get("/vod/front_door/bogus/start/1000/end/1010")

            assert response.status_code == 422

    def test_vod_merged_mixed_codecs_discontinuity(self):
        """Mismatched video codecs serve a merged discontinuity manifest.

        A merged HEVC main + H264 sub sequence plays through discontinuity
        mode with per-clip init segments (initialClipIndex): the decoder
        reconfigures at each codec transition instead of the range being
        pinned to a pure main manifest.
        """
        with AuthTestClient(self.app) as client:
            # main covers 0-20, sub covers the full hour-style 0-60 range;
            # the merge fills 20-60 with h264 sub clips
            self._insert_recording("main_1", 1000, 1010, "main", video_codec="hevc")
            self._insert_recording("main_2", 1010, 1020, "main", video_codec="hevc")
            for i in range(6):
                self._insert_recording(
                    f"sub_{i + 1}",
                    1000 + i * 10,
                    1010 + i * 10,
                    "sub",
                    video_codec="h264",
                )

            response = client.get("/vod/front_door/start/1000/end/1060")

            assert response.status_code == 200
            body = response.json()
            assert len(body["sequences"]) == 1
            assert self._sequence_paths(body["sequences"][0]) == [
                "/media/recordings/main_1.mp4",
                "/media/recordings/main_2.mp4",
                "/media/recordings/sub_3.mp4",
                "/media/recordings/sub_4.mp4",
                "/media/recordings/sub_5.mp4",
                "/media/recordings/sub_6.mp4",
            ]
            assert body["discontinuity"] is True
            assert body["initialClipIndex"] == 1

    def test_vod_merged_mixed_codecs_sub_only_range_serves_sub(self):
        """A mixed-codec camera's sub-only history serves a plain sub manifest.

        Rows outside the requested range never influence the policy: the
        range itself is uniformly h264 sub, so the manifest keeps the
        legacy shape with no discontinuity.
        """
        with AuthTestClient(self.app) as client:
            # mixed-codec camera: hevc main exists before the range,
            # the requested range is covered only by h264 sub rows
            self._insert_recording("main_1", 1000, 1010, "main", video_codec="hevc")
            self._insert_recording("sub_1", 1030, 1040, "sub", video_codec="h264")
            self._insert_recording("sub_2", 1040, 1050, "sub", video_codec="h264")

            response = client.get("/vod/front_door/start/1030/end/1050")

            assert response.status_code == 200
            body = response.json()
            assert len(body["sequences"]) == 1
            assert self._sequence_paths(body["sequences"][0]) == [
                "/media/recordings/sub_1.mp4",
                "/media/recordings/sub_2.mp4",
            ]
            assert body["discontinuity"] is False
            assert "initialClipIndex" not in body

    def test_vod_merged_same_codec_keeps_merging(self):
        """Matching known codecs across streams keep the merged fill.

        Isolates the stream-type trigger: with codec and audio params
        identical on both sides, the main/sub mix is the only remaining
        signature, and it alone puts the manifest in discontinuity mode.
        """
        with AuthTestClient(self.app) as client:
            self._insert_recording("main_1", 1000, 1010, "main", video_codec="h264")
            for i in range(2):
                self._insert_recording(
                    f"sub_{i + 1}",
                    1000 + i * 10,
                    1010 + i * 10,
                    "sub",
                    video_codec="h264",
                )

            response = client.get("/vod/front_door/start/1000/end/1020")

            assert response.status_code == 200
            body = response.json()
            assert self._sequence_paths(body["sequences"][0]) == [
                "/media/recordings/main_1.mp4",
                "/media/recordings/sub_2.mp4",
            ]
            assert body["discontinuity"] is True
            assert body["initialClipIndex"] == 1

    def test_vod_merged_known_and_unknown_codec_keeps_merging(self):
        """An unknown codec next to a known one is tolerated (legacy rows)."""
        with AuthTestClient(self.app) as client:
            self._insert_recording("main_1", 1000, 1010, "main", video_codec="h264")
            for i in range(2):
                self._insert_recording(
                    f"sub_{i + 1}",
                    1000 + i * 10,
                    1010 + i * 10,
                    "sub",
                    video_codec=None,
                )

            response = client.get("/vod/front_door/start/1000/end/1020")

            assert response.status_code == 200
            body = response.json()
            assert self._sequence_paths(body["sequences"][0]) == [
                "/media/recordings/main_1.mp4",
                "/media/recordings/sub_2.mp4",
            ]
            assert body["discontinuity"] is True
            assert body["initialClipIndex"] == 1

    def test_vod_pinned_stream_mixed_rates_discontinuity(self):
        """A pinned stream mixing audio rates across history gets discontinuity.

        A camera settings change can leave one stream with 8kHz rows
        followed by 16kHz rows, so pinned routes need the same signature
        policy as the default route.
        """
        with AuthTestClient(self.app) as client:
            self._insert_recording(
                "sub_1", 1000, 1010, "sub", has_audio=True, audio_rate=8000
            )
            self._insert_recording(
                "sub_2", 1010, 1020, "sub", has_audio=True, audio_rate=16000
            )

            response = client.get("/vod/front_door/sub/start/1000/end/1020")

            assert response.status_code == 200
            body = response.json()
            assert self._sequence_paths(body["sequences"][0]) == [
                "/media/recordings/sub_1.mp4",
                "/media/recordings/sub_2.mp4",
            ]
            for clip in body["sequences"][0]["clips"]:
                assert "tracks" not in clip
            assert body["discontinuity"] is True
            assert body["initialClipIndex"] == 1

    def test_recordings_coverage_merged_spans(self):
        """Coverage returns merged spans with per-span stream availability."""
        with AuthTestClient(self.app) as client:
            # main-only, then both streams, then sub-only
            self._insert_recording("main_1", 1000, 1010, "main")
            self._insert_recording("main_2", 1010, 1020, "main")
            self._insert_recording("sub_1", 1010, 1020, "sub")
            self._insert_recording("sub_2", 1020, 1030, "sub")

            response = client.get(
                "/front_door/recordings/coverage",
                params={"after": 1000, "before": 1030},
            )

            assert response.status_code == 200
            body = response.json()
            assert body["spans"] == [
                {"start_time": 1000, "end_time": 1010, "streams": ["main"]},
                {"start_time": 1010, "end_time": 1020, "streams": ["main", "sub"]},
                {"start_time": 1020, "end_time": 1030, "streams": ["sub"]},
            ]
            # all rows have unknown codecs, which counts as compatible
            assert body["codecs_compatible"] is True

    def test_recordings_coverage_codec_compatibility_flag(self):
        """codecs_compatible is false only when known video codecs differ."""
        cases = [
            ("hevc", "h264", False),
            ("h264", "h264", True),
            ("h264", None, True),
        ]
        with AuthTestClient(self.app) as client:
            # each case in its own time window so rows don't cross-pollute
            for idx, (main_codec, sub_codec, compatible) in enumerate(cases):
                with self.subTest(main=main_codec, sub=sub_codec):
                    base = 1000 + idx * 100
                    self._insert_recording(
                        f"main_{idx}",
                        base,
                        base + 10,
                        "main",
                        video_codec=main_codec,
                    )
                    self._insert_recording(
                        f"sub_{idx}",
                        base + 10,
                        base + 20,
                        "sub",
                        video_codec=sub_codec,
                    )

                    response = client.get(
                        "/front_door/recordings/coverage",
                        params={"after": base, "before": base + 20},
                    )

                    assert response.status_code == 200
                    assert response.json()["codecs_compatible"] is compatible

    def test_recordings_coverage_stream_media_summary(self):
        """Coverage reports per-stream media details, newest known value per field."""
        with AuthTestClient(self.app) as client:
            # older main row knows the codecs; the newer row's NULL codecs
            # must not mask them, while the newer row's audio fields win
            self._insert_recording(
                "main_1",
                1000,
                1010,
                "main",
                video_codec="hevc",
                audio_rate=16000,
                audio_codec="aac",
                has_audio=True,
            )
            self._insert_recording(
                "main_2",
                1010,
                1020,
                "main",
                video_codec=None,
                audio_rate=8000,
                has_audio=True,
            )
            self._insert_recording("sub_1", 1000, 1010, "sub", video_codec="h264")

            response = client.get(
                "/front_door/recordings/coverage",
                params={"after": 1000, "before": 1020},
            )

            assert response.status_code == 200
            streams = response.json()["streams"]
            assert streams == {
                "main": {
                    "video_codec": "hevc",
                    "audio_rate": 8000,
                    "audio_codec": "aac",
                    "has_audio": True,
                    "bitrate": None,
                },
                # sub's audio fields were never known
                "sub": {
                    "video_codec": "h264",
                    "audio_rate": None,
                    "audio_codec": None,
                    "has_audio": None,
                    "bitrate": None,
                },
            }

    def test_recordings_coverage_stream_media_summary_omits_absent_stream(self):
        """A stream with no rows in range is omitted from the summary."""
        with AuthTestClient(self.app) as client:
            self._insert_recording("main_1", 1000, 1010, "main", video_codec="h264")

            response = client.get(
                "/front_door/recordings/coverage",
                params={"after": 1000, "before": 1010},
            )

            assert response.status_code == 200
            streams = response.json()["streams"]
            assert list(streams.keys()) == ["main"]

    def test_recordings_summary_sub_only_hours(self):
        """Hours with only sub recordings are flagged and main stats not double-counted."""
        hour_a = datetime(2024, 3, 10, 12, 0, 0, tzinfo=UTC).timestamp()
        hour_b = datetime(2024, 3, 10, 13, 0, 0, tzinfo=UTC).timestamp()

        with AuthTestClient(self.app) as client:
            # hour A has both streams (sub duplicates main's stats),
            # hour B has only sub recordings
            self._insert_recording(
                "main_a", hour_a, hour_a + 600, "main", motion=100, objects=5
            )
            self._insert_recording(
                "sub_a", hour_a, hour_a + 600, "sub", motion=100, objects=5
            )
            self._insert_recording(
                "sub_b", hour_b, hour_b + 300, "sub", motion=50, objects=2
            )

            response = client.get(
                "/front_door/recordings/summary", params={"timezone": "utc"}
            )

            assert response.status_code == 200
            summary = response.json()
            assert len(summary) == 1
            day = summary[0]
            assert day["day"] == "2024-03-10"
            assert len(day["hours"]) == 2

            # hours are ordered most recent first
            sub_only_hour = day["hours"][0]
            assert sub_only_hour == {
                "hour": "13",
                "events": 0,
                "motion": 0,
                "objects": 0,
                "duration": 300,
                "sub_only": True,
            }

            main_hour = day["hours"][1]
            assert "sub_only" not in main_hour
            assert main_hour["hour"] == "12"
            # sub rows duplicate main stats and must not be double-counted
            assert main_hour["motion"] == 100
            assert main_hour["objects"] == 5
            assert main_hour["duration"] == 600

    def test_recordings_unavailable_sub_covers_main_gap(self):
        """A gap in main recordings covered by sub rows is not reported unavailable."""
        with AuthTestClient(self.app) as client:
            self._insert_recording("main_1", 1000, 1010, "main")
            self._insert_recording("sub_1", 1010, 1030, "sub")
            self._insert_recording("main_2", 1030, 1040, "main")

            response = client.get(
                "/recordings/unavailable",
                params={
                    "after": 1000,
                    "before": 1040,
                    "scale": 5,
                    "cameras": "front_door",
                },
            )

            assert response.status_code == 200
            assert response.json() == []

    def test_recordings_handles_all_range_relations(self):
        """Recordings return every interval relation that touches the range."""
        with AuthTestClient(self.app) as client:
            for case in RANGE_CASES:
                with self.subTest(case=case.name):
                    Recordings.delete().execute()
                    self._insert_recording(
                        case.name,
                        REQUEST_START + case.start_offset,
                        REQUEST_START + case.end_offset,
                    )

                    response = client.get(
                        "/front_door/recordings",
                        params={"after": REQUEST_START, "before": REQUEST_END},
                    )

                    assert response.status_code == 200
                    expected_ids = [case.name] if case.included_in_recordings else []
                    assert [
                        recording["id"] for recording in response.json()
                    ] == expected_ids

    def test_vod_handles_all_range_relations(self):
        """VOD clips every interval relation with positive playback duration."""
        with AuthTestClient(self.app) as client:
            for case in RANGE_CASES:
                with self.subTest(case=case.name):
                    Recordings.delete().execute()
                    # a stored keyframe sitting exactly on the expected
                    # clipFrom makes the back-snap a no-op, isolating range
                    # handling from keyframe snapping
                    self._insert_recording(
                        case.name,
                        REQUEST_START + case.start_offset,
                        REQUEST_START + case.end_offset,
                        keyframes=(
                            None
                            if case.vod_clip_from_ms is None
                            else [case.vod_clip_from_ms]
                        ),
                    )

                    response = client.get(
                        f"/vod/front_door/start/{REQUEST_START}/end/{REQUEST_END}"
                    )

                    if case.vod_duration_ms is None:
                        assert response.status_code == 404
                        continue

                    self._assert_vod_response(
                        response,
                        [
                            (
                                f"/media/recordings/{case.name}.mp4",
                                case.vod_clip_from_ms,
                                case.vod_duration_ms,
                            )
                        ],
                    )

    def test_recordings_unavailable_reports_gap_between_recordings(self):
        """A gap between two recordings is reported as an unavailable segment."""
        with AuthTestClient(self.app) as client:
            # Two recordings with a 20s gap (1010-1030) between them.
            Recordings.insert(
                id="rec_a",
                path="/media/recordings/a.mp4",
                camera="front_door",
                start_time=1000,
                end_time=1010,
                duration=10,
                motion=0,
            ).execute()
            Recordings.insert(
                id="rec_b",
                path="/media/recordings/b.mp4",
                camera="front_door",
                start_time=1030,
                end_time=1040,
                duration=10,
                motion=0,
            ).execute()

            response = client.get(
                "/recordings/unavailable",
                params={
                    "after": 1000,
                    "before": 1040,
                    "scale": 5,
                    "cameras": "front_door",
                },
            )

            assert response.status_code == 200
            assert response.json() == [{"start_time": 1010, "end_time": 1030}]

    def test_recordings_unavailable_merges_overlapping_recordings(self):
        """Overlapping recordings are merged so no false gap is reported."""
        with AuthTestClient(self.app) as client:
            # Overlapping recordings spanning the whole requested range.
            Recordings.insert(
                id="rec_a",
                path="/media/recordings/a.mp4",
                camera="front_door",
                start_time=1000,
                end_time=1020,
                duration=20,
                motion=0,
            ).execute()
            Recordings.insert(
                id="rec_b",
                path="/media/recordings/b.mp4",
                camera="front_door",
                start_time=1010,
                end_time=1030,
                duration=20,
                motion=0,
            ).execute()

            response = client.get(
                "/recordings/unavailable",
                params={
                    "after": 1000,
                    "before": 1030,
                    "scale": 5,
                    "cameras": "front_door",
                },
            )

            assert response.status_code == 200
            assert response.json() == []

    def test_recordings_unavailable_cameras_all_scopes_to_allowed_cameras(self):
        """cameras=all must not error and must only consider allowed cameras.

        allowed_cameras is mocked to ["front_door"]. A back_door recording that
        would otherwise fill the gap must be ignored, and the request must not
        500 the way it did when cameras was reassigned to a list.
        """
        with AuthTestClient(self.app) as client:
            # front_door has a 20s gap (1010-1030).
            Recordings.insert(
                id="front_a",
                path="/media/recordings/front_a.mp4",
                camera="front_door",
                start_time=1000,
                end_time=1010,
                duration=10,
                motion=0,
            ).execute()
            Recordings.insert(
                id="front_b",
                path="/media/recordings/front_b.mp4",
                camera="front_door",
                start_time=1030,
                end_time=1040,
                duration=10,
                motion=0,
            ).execute()
            # back_door is not in allowed_cameras; its full-window coverage must
            # not mask the front_door gap.
            Recordings.insert(
                id="back_a",
                path="/media/recordings/back_a.mp4",
                camera="back_door",
                start_time=1000,
                end_time=1040,
                duration=40,
                motion=0,
            ).execute()

            response = client.get(
                "/recordings/unavailable",
                params={
                    "after": 1000,
                    "before": 1040,
                    "scale": 5,
                    "cameras": "all",
                },
            )

            assert response.status_code == 200
            assert response.json() == [{"start_time": 1010, "end_time": 1030}]
