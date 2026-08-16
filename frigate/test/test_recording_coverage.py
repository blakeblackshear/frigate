"""Tests for the unified recording coverage resolver."""

import asyncio
import json
import unittest
from types import SimpleNamespace

from playhouse.sqlite_ext import SqliteExtDatabase

from frigate.api.media import _vod_response
from frigate.const import MAX_SEGMENT_DURATION
from frigate.models import Recordings
from frigate.util.recording_coverage import (
    _rows_query,
    coverage_spans,
    plan_clip,
    realized_timeline,
    resolve_coverage,
    stream_media_summary,
)


class CoverageDbTestCase(unittest.TestCase):
    def setUp(self):
        # in-memory database keeps these tests isolated from the shared
        # on-disk test.db used by the http api tests
        self.db = SqliteExtDatabase(":memory:")
        models = [Recordings]
        self.db.bind(models)
        self.db.create_tables(models)

    def tearDown(self):
        self.db.close()

    def _insert(
        self,
        id,
        start,
        end,
        stream_type,
        camera="front_door",
        video_codec=None,
        audio_rate=None,
        audio_codec=None,
        has_audio=None,
        segment_size=0,
        keyframes=None,
    ):
        Recordings.create(
            id=id,
            camera=camera,
            path=f"/tmp/{id}.mp4",
            start_time=start,
            end_time=end,
            duration=end - start,
            stream_type=stream_type,
            video_codec=video_codec,
            audio_rate=audio_rate,
            audio_codec=audio_codec,
            has_audio=has_audio,
            segment_size=segment_size,
            keyframes=keyframes,
        )


class TestRecordingCoverage(CoverageDbTestCase):
    def test_both_streams_offset_boundaries(self):
        # main: [1000,1010) [1010,1020)   sub: [1003,1013) [1013,1023)
        self._insert("m1", 1000.0, 1010.0, "main")
        self._insert("m2", 1010.0, 1020.0, "main")
        self._insert("s1", 1003.0, 1013.0, "sub")
        self._insert("s2", 1013.0, 1023.0, "sub")
        intervals = resolve_coverage("front_door", 1000.0, 1020.0)
        # boundaries: 1000,1003,1010,1013,1020
        assert [round(i.start_time) for i in intervals] == [1000, 1003, 1010, 1013]
        assert intervals[0].main is not None and intervals[0].sub is None
        assert intervals[1].main is not None and intervals[1].sub is not None

    def test_sub_only_when_main_expired(self):
        self._insert("s1", 1000.0, 1010.0, "sub")
        intervals = resolve_coverage("front_door", 1000.0, 1010.0)
        assert len(intervals) == 1
        assert intervals[0].main is None and intervals[0].sub is not None

    def test_gap_when_neither_exists(self):
        self._insert("m1", 1000.0, 1010.0, "main")
        self._insert("m2", 1030.0, 1040.0, "main")
        intervals = resolve_coverage("front_door", 1000.0, 1040.0)
        assert len(intervals) == 2  # the [1010,1030) gap produces no interval

    def test_spans_merge_same_availability(self):
        self._insert("m1", 1000.0, 1010.0, "main")
        self._insert("m2", 1010.0, 1020.0, "main")
        spans = coverage_spans(resolve_coverage("front_door", 1000.0, 1020.0))
        assert spans == [
            {"start_time": 1000.0, "end_time": 1020.0, "streams": ["main"]}
        ]

    def test_requested_range_clamps_intervals(self):
        # query range partially overlaps the rows; the first and last
        # intervals must be clamped to the requested [after, before]
        self._insert("m1", 1000.0, 1010.0, "main")
        self._insert("m2", 1010.0, 1020.0, "main")
        intervals = resolve_coverage("front_door", 1005.0, 1015.0)
        assert intervals[0].start_time == 1005.0
        assert intervals[-1].end_time == 1015.0
        spans = coverage_spans(intervals)
        assert spans == [
            {"start_time": 1005.0, "end_time": 1015.0, "streams": ["main"]}
        ]

    def test_stream_media_summary_newest_known_wins(self):
        # the newer main row's NULL codecs must not mask the older row's
        # known codecs, while its known audio fields take precedence
        self._insert(
            "m1",
            1000.0,
            1010.0,
            "main",
            video_codec="hevc",
            audio_rate=16000,
            audio_codec="aac",
        )
        self._insert("m2", 1010.0, 1020.0, "main", audio_rate=8000, has_audio=True)
        self._insert("s1", 1000.0, 1010.0, "sub", has_audio=False)
        summary = stream_media_summary(resolve_coverage("front_door", 1000.0, 1020.0))
        assert summary == {
            "main": {
                "video_codec": "hevc",
                "audio_rate": 8000,
                "audio_codec": "aac",
                "has_audio": True,
                "bitrate": None,
            },
            "sub": {
                "video_codec": None,
                "audio_rate": None,
                "audio_codec": None,
                "has_audio": False,
                "bitrate": None,
            },
        }

    def test_stream_media_summary_omits_absent_stream(self):
        self._insert("m1", 1000.0, 1010.0, "main", video_codec="h264")
        summary = stream_media_summary(resolve_coverage("front_door", 1000.0, 1010.0))
        assert list(summary.keys()) == ["main"]
        assert stream_media_summary([]) == {}

    def test_stream_media_summary_bitrate_weighted_by_duration(self):
        # main: 10 MiB over 10s + 30 MiB over 20s -> 40 MiB / 30s
        self._insert("m1", 1000.0, 1010.0, "main", segment_size=10)
        self._insert("m2", 1010.0, 1030.0, "main", segment_size=30)
        # sub rows without a stored size (legacy default 0) report None
        self._insert("s1", 1000.0, 1030.0, "sub")
        summary = stream_media_summary(resolve_coverage("front_door", 1000.0, 1030.0))
        expected = int(40 * 1024 * 1024 * 8 / 30)
        assert summary["main"]["bitrate"] == expected
        assert summary["sub"]["bitrate"] is None

    def test_stream_media_summary_bitrate_skips_zero_size_rows(self):
        # the zero-size glitch row contributes neither bytes nor seconds
        self._insert("m1", 1000.0, 1010.0, "main", segment_size=5)
        self._insert("m2", 1010.0, 1020.0, "main", segment_size=0)
        summary = stream_media_summary(resolve_coverage("front_door", 1000.0, 1020.0))
        expected = int(5 * 1024 * 1024 * 8 / 10)
        assert summary["main"]["bitrate"] == expected

    def test_other_camera_rows_excluded(self):
        self._insert("m1", 1000.0, 1010.0, "main")
        self._insert("o1", 1000.0, 1010.0, "main", camera="back_yard")
        self._insert("o2", 1000.0, 1010.0, "sub", camera="back_yard")
        intervals = resolve_coverage("front_door", 1000.0, 1010.0)
        assert len(intervals) == 1
        assert intervals[0].main is not None and intervals[0].sub is None
        assert resolve_coverage("side_gate", 1000.0, 1010.0) == []

    def test_realized_timeline_snap_lead_in(self):
        """A mid-file resume's back-snap lead-in appears in the realized duration.

        Sub resumes at 1010 with a 7000ms inpoint; the stored keyframe
        index snaps back to 6000ms, so the clip serves 1000ms of pre-span
        content on top of the 3000ms span.
        """
        self._insert("m1", 1000.0, 1010.0, "main")
        self._insert("s1", 1003.0, 1013.0, "sub", keyframes=[0, 2000, 4000, 6000, 8000])
        timeline = realized_timeline(
            resolve_coverage("front_door", 1000.0, 1013.0), None
        )
        assert timeline == [
            {"start_time": 1000.0, "end_time": 1010.0, "duration": 10000},
            {"start_time": 1010.0, "end_time": 1013.0, "duration": 4000},
        ]

    def test_realized_timeline_no_keyframe_index_serves_whole_file(self):
        """A row without a stored keyframe index serves the whole file.

        NULL keyframes mean the record-time probe failed, so a mid-file
        entry cannot be snapped to a decodable frame.
        """
        self._insert("m1", 1000.0, 1010.0, "main")
        self._insert("s1", 1003.0, 1013.0, "sub")
        timeline = realized_timeline(
            resolve_coverage("front_door", 1000.0, 1013.0), None
        )
        # the resume clip serves all 10000ms of the sub file for a 3000ms span
        assert timeline[1] == {
            "start_time": 1010.0,
            "end_time": 1013.0,
            "duration": 10000,
        }

    def test_realized_timeline_pinned_stream_no_mid_range_lead_in(self):
        """A pinned stream's spans start at its own file starts: no lead-in."""
        self._insert("s1", 1000.0, 1010.0, "sub", keyframes=[0, 5000])
        self._insert("s2", 1010.0, 1020.0, "sub", keyframes=[0, 5000])
        timeline = realized_timeline(
            resolve_coverage("front_door", 1000.0, 1020.0), "sub"
        )
        assert [t["duration"] for t in timeline] == [10000, 10000]

    def test_rows_query_scan_is_bounded_below(self):
        """The row query must give SQLite a lower bound on start_time.

        Without one the best index range is (camera=? AND start_time<?),
        which walks the camera's entire history on every coverage call:
        ~20s on a cold page cache, blocking the API event loop.
        """
        # the index the planner picks in production (migration 020)
        self.db.execute_sql(
            "CREATE INDEX recordings_api_recordings_summary ON recordings "
            '("camera", "start_time" DESC, "duration", "motion", "objects")'
        )
        sql, params = _rows_query("front_door", 2000.0, 3000.0, "main").sql()
        plan = " ".join(
            row[-1] for row in self.db.execute_sql("EXPLAIN QUERY PLAN " + sql, params)
        )
        assert "start_time>?" in plan and "start_time<?" in plan, plan

    def test_longest_segment_spanning_window_start_included(self):
        # a maximum-length segment overlapping `after` sits right at the
        # start_time lower bound the query is allowed to apply
        self._insert("m1", 1000.0, 1000.0 + MAX_SEGMENT_DURATION - 0.5, "main")
        intervals = resolve_coverage("front_door", 1599.0, 1700.0)
        assert len(intervals) == 1
        assert intervals[0].main is not None

    def test_plan_clip_skips_too_short(self):
        """A clip left with under 100ms of media is skipped (duration 0 in timelines)."""
        row = SimpleNamespace(
            path="/tmp/x.mp4",
            start_time=1000.0,
            end_time=1000.15,
            duration=0.15,
            keyframes=[0, 100],
        )
        plan = plan_clip(row, 1000.1, 1000.15)
        assert plan.skipped
        assert plan.duration_ms == 0


class TestVodManifestPolicy(CoverageDbTestCase):
    """Discontinuity policy of the vod mapping builder."""

    def _mapping(self, start, end, stream=None):
        response = asyncio.run(
            _vod_response("front_door", start, end, stream_preference=stream)
        )
        return json.loads(response.body)

    def _insert_stream(self, prefix, stream_type, spans):
        for idx, (start, end) in enumerate(spans):
            self._insert(
                f"{prefix}{idx}",
                start,
                end,
                stream_type,
                video_codec="h264",
                audio_codec="aac",
                audio_rate=16000,
                has_audio=True,
            )

    def test_cross_stream_handoff_forces_discontinuity(self):
        # codec and audio params match on both streams, so only the stream
        # mix can force per-clip init segments here
        self._insert_stream("m", "main", [(1000.0, 1010.0)])
        self._insert_stream("s", "sub", [(1000.0, 1010.0), (1010.0, 1020.0)])
        mapping = self._mapping(1000.0, 1020.0)
        assert mapping["discontinuity"] is True
        assert mapping["initialClipIndex"] == 1
        assert len(mapping["sequences"][0]["clips"]) == 2

    def test_single_stream_range_stays_consistent(self):
        self._insert_stream("s", "sub", [(1000.0, 1010.0), (1010.0, 1020.0)])
        mapping = self._mapping(1000.0, 1020.0)
        assert mapping["discontinuity"] is False
        assert "initialClipIndex" not in mapping

    def test_pinned_stream_over_mixed_coverage_stays_consistent(self):
        self._insert_stream("m", "main", [(1000.0, 1010.0), (1010.0, 1020.0)])
        self._insert_stream("s", "sub", [(1000.0, 1010.0), (1010.0, 1020.0)])
        mapping = self._mapping(1000.0, 1020.0, stream="sub")
        assert mapping["discontinuity"] is False
        assert "initialClipIndex" not in mapping
