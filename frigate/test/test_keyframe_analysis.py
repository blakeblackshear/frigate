"""Tests for keyframe-spacing analysis used to detect smart/+ codecs."""

import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from frigate.util.services import (
    analyze_record_keyframes,
    classify_keyframe_gaps,
    parse_keyframe_packets,
)


class TestClassifyKeyframeGaps(unittest.TestCase):
    def test_ok_when_gaps_small(self):
        # keyframes every ~1s
        pts = [0.0, 1.0, 2.0, 3.0, 4.0]
        result = classify_keyframe_gaps(pts, segment_time=10)
        self.assertEqual(result["severity"], "ok")
        self.assertEqual(result["max_gap"], 1.0)
        self.assertEqual(result["keyframe_count"], 5)
        self.assertEqual(result["thresholds"], {"warning": 4.0, "error": 10})

    def test_warning_when_gap_exceeds_four_seconds(self):
        pts = [0.0, 1.0, 6.5]  # 5.5s gap
        result = classify_keyframe_gaps(pts, segment_time=10)
        self.assertEqual(result["severity"], "warning")
        self.assertEqual(result["max_gap"], 5.5)

    def test_error_when_gap_exceeds_segment_time(self):
        pts = [0.0, 12.0]  # 12s gap > 10s segment
        result = classify_keyframe_gaps(pts, segment_time=10)
        self.assertEqual(result["severity"], "error")

    def test_error_threshold_tracks_segment_time(self):
        pts = [0.0, 6.0]  # 6s gap, segment_time=5 -> error
        result = classify_keyframe_gaps(pts, segment_time=5)
        self.assertEqual(result["severity"], "error")

    def test_unknown_with_single_keyframe(self):
        result = classify_keyframe_gaps([1.0], segment_time=10)
        self.assertEqual(result["severity"], "unknown")
        self.assertIsNone(result["max_gap"])
        self.assertEqual(result["keyframe_count"], 1)

    def test_unknown_with_no_keyframes(self):
        result = classify_keyframe_gaps([], segment_time=10)
        self.assertEqual(result["severity"], "unknown")
        self.assertEqual(result["keyframe_count"], 0)


class TestParseKeyframePackets(unittest.TestCase):
    def test_extracts_keyframe_pts_and_max(self):
        output = "0.000000,K__\n0.033333,___\n1.000000,K__\n1.500000,___\n"
        keyframe_pts, max_pts = parse_keyframe_packets(output)
        self.assertEqual(keyframe_pts, [0.0, 1.0])
        self.assertEqual(max_pts, 1.5)

    def test_skips_unparseable_and_empty_lines(self):
        output = "N/A,K__\n\n2.0,K__\nbad line\n"
        keyframe_pts, max_pts = parse_keyframe_packets(output)
        self.assertEqual(keyframe_pts, [2.0])
        self.assertEqual(max_pts, 2.0)

    def test_empty_output(self):
        keyframe_pts, max_pts = parse_keyframe_packets("")
        self.assertEqual(keyframe_pts, [])
        self.assertIsNone(max_pts)


class TestAnalyzeRecordKeyframes(unittest.IsolatedAsyncioTestCase):
    async def test_merges_duration_and_classification(self):
        csv = b"0.0,K__\n1.0,___\n6.0,K__\n7.0,___\n"
        proc = MagicMock()
        proc.communicate = AsyncMock(return_value=(csv, b""))
        ffmpeg = MagicMock()
        ffmpeg.ffprobe_path = "/usr/bin/ffprobe"

        with patch(
            "frigate.util.services.asyncio.create_subprocess_exec",
            AsyncMock(return_value=proc),
        ):
            result = await analyze_record_keyframes(
                ffmpeg, "rtsp://cam/stream", segment_time=10
            )

        self.assertEqual(result["severity"], "warning")  # 6s gap > 4s
        self.assertEqual(result["max_gap"], 6.0)
        self.assertEqual(result["duration_observed"], 7.0)

    async def test_timeout_returns_unknown(self):
        proc = MagicMock()
        proc.communicate = AsyncMock(side_effect=TimeoutError())
        proc.kill = MagicMock()
        ffmpeg = MagicMock()
        ffmpeg.ffprobe_path = "/usr/bin/ffprobe"

        with patch(
            "frigate.util.services.asyncio.create_subprocess_exec",
            AsyncMock(return_value=proc),
        ):
            result = await analyze_record_keyframes(
                ffmpeg, "rtsp://cam/stream", segment_time=10
            )

        self.assertEqual(result["severity"], "unknown")
        proc.kill.assert_called_once()


if __name__ == "__main__":
    unittest.main()
