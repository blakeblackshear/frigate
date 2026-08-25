"""Tests for sub stream cache segment handling in the recording maintainer."""

import datetime
import os
import tempfile
import unittest
from collections import defaultdict
from unittest.mock import AsyncMock, MagicMock, patch

from playhouse.sqlite_ext import SqliteExtDatabase

from frigate.config import FrigateConfig
from frigate.models import Recordings
from frigate.record.maintainer import (
    RecordingMaintainer,
    SegmentInfo,
    parse_cache_segment_name,
    segment_path_time,
)


def _build_chaining_maintainer(
    t0: float, retention: str = "continuous"
) -> RecordingMaintainer:
    """Build a maintainer for start-time chaining tests.

    Built without __init__ to avoid the IPC scaffolding; move_segment and
    drop_segment are mocked so the times passed downstream are observable.
    """
    camera_config = MagicMock()
    camera_config.record.enabled = True
    camera_config.record.event_pre_capture = 0
    camera_config.detect.width = 1920
    camera_config.detect.height = 1080
    camera_config.record.continuous.days = 1 if retention == "continuous" else 0
    camera_config.record.motion.days = 0 if retention == "continuous" else 1

    # no spec: pydantic fields like config.ffmpeg are not visible to
    # spec'd mocks, and the probe path needs them
    config = MagicMock()
    config.cameras = {"test_cam": camera_config}

    maintainer = RecordingMaintainer.__new__(RecordingMaintainer)
    maintainer.config = config
    maintainer.end_time_cache = {}
    maintainer.object_recordings_info = defaultdict(list)
    maintainer.audio_recordings_info = defaultdict(list)
    maintainer.recordings_publisher = MagicMock()
    maintainer.drop_segment = MagicMock()
    maintainer.move_segment = AsyncMock(return_value=None)
    # pre-seed the chain state so the lazy DB seed query is not attempted
    maintainer.last_segment_end = {("test_cam", "main"): 0.0}
    # a processed frame far past any segment end marks segments ready
    maintainer.object_recordings_info["test_cam"] = [(t0 + 1000, [], [], [])]
    return maintainer


async def _validate_segment(
    maintainer: RecordingMaintainer,
    t0: float,
    offset: float,
    duration: float,
    mtime: float | None = None,
):
    """Run validate_and_move_segment for a segment named t0+offset.

    mtime injects the cache file's close time; None simulates a missing file.
    """
    start = datetime.datetime.fromtimestamp(t0 + offset, tz=datetime.UTC)
    probe = AsyncMock(return_value={"has_valid_video": True, "duration": duration})
    getmtime = (
        MagicMock(side_effect=OSError("missing"))
        if mtime is None
        else MagicMock(return_value=mtime)
    )
    with (
        patch("frigate.record.maintainer.get_video_properties", probe),
        patch(
            "frigate.record.maintainer.get_keyframe_offsets",
            AsyncMock(return_value=[0]),
        ),
        patch("frigate.record.maintainer.os.path.getmtime", getmtime),
    ):
        return await maintainer.validate_and_move_segment(
            "test_cam",
            reviews=[],
            recording={
                "start_time": start,
                "cache_path": f"/tmp/cache/test_cam@chain{offset}.mp4",
                "stream_type": "main",
            },
        )


class TestParseCacheSegmentName(unittest.TestCase):
    def test_parses_main_segment(self):
        camera, stream_type, date = parse_cache_segment_name(
            "front_door@20260610143022+0000"
        )
        assert camera == "front_door"
        assert stream_type == "main"
        assert date == "20260610143022+0000"

    def test_parses_sub_segment(self):
        camera, stream_type, date = parse_cache_segment_name(
            "front_door@sub@20260610143022+0000"
        )
        assert camera == "front_door"
        assert stream_type == "sub"
        assert date == "20260610143022+0000"

    def test_returns_none_for_unexpected_name(self):
        assert parse_cache_segment_name("no_at_sign_here") is None


class TestValidateAndMoveSubSegment(unittest.IsolatedAsyncioTestCase):
    """Behavioral tests for sub stream segments in validate_and_move_segment.

    The maintainer is built without __init__ to avoid the ZMQ scaffolding
    the real constructor sets up.
    """

    def _build_maintainer(self, camera_config: MagicMock) -> RecordingMaintainer:
        config = MagicMock(spec=FrigateConfig)
        config.cameras = {"test_cam": camera_config}

        maintainer = RecordingMaintainer.__new__(RecordingMaintainer)
        maintainer.config = config
        maintainer.end_time_cache = {}
        maintainer.object_recordings_info = defaultdict(list)
        maintainer.audio_recordings_info = defaultdict(list)
        maintainer.drop_segment = MagicMock()
        maintainer.recordings_publisher = MagicMock()
        maintainer.move_segment = AsyncMock(return_value=None)
        return maintainer

    async def test_drops_sub_segment_when_sub_recording_disabled(self):
        camera_config = MagicMock()
        camera_config.record.enabled = True
        camera_config.record.sub.enabled = False

        maintainer = self._build_maintainer(camera_config)
        cache_path = "/tmp/cache/test_cam@sub@20260610143022+0000.mp4"

        result = await maintainer.validate_and_move_segment(
            "test_cam",
            reviews=[],
            recording={
                "start_time": datetime.datetime.now(datetime.UTC),
                "cache_path": cache_path,
                "stream_type": "sub",
            },
        )

        self.assertIsNone(result)
        maintainer.drop_segment.assert_called_once_with(cache_path)
        maintainer.move_segment.assert_not_awaited()

    async def test_sub_segment_uses_sub_continuous_retention(self):
        # main continuous/motion are disabled, but sub continuous is enabled;
        # the sub segment must be kept based on the sub retention config
        camera_config = MagicMock()
        camera_config.record.enabled = True
        camera_config.record.sub.enabled = True
        camera_config.record.continuous.days = 0
        camera_config.record.motion.days = 0
        camera_config.record.sub.continuous.days = 1
        camera_config.record.sub.motion.days = 0

        maintainer = self._build_maintainer(camera_config)

        now = datetime.datetime.now(datetime.UTC)
        start_time = now - datetime.timedelta(seconds=20)
        end_time = now - datetime.timedelta(seconds=10)
        cache_path = "/tmp/cache/test_cam@sub@20260610143022+0000.mp4"

        # pre-fill the end time cache so no ffprobe is attempted; the
        # audio and codec fields stay unknown without one
        maintainer.end_time_cache = {
            cache_path: (end_time, 10.0, None, None, None, None, None)
        }
        # a processed frame past end_time so the segment is considered ready
        maintainer.object_recordings_info["test_cam"] = [(now.timestamp(), [], [], [])]

        result = await maintainer.validate_and_move_segment(
            "test_cam",
            reviews=[],
            recording={
                "start_time": start_time,
                "cache_path": cache_path,
                "stream_type": "sub",
            },
        )

        self.assertIsNone(result)
        maintainer.move_segment.assert_awaited_once()
        call_args = maintainer.move_segment.await_args.args
        self.assertEqual(call_args[0], "test_cam")
        self.assertEqual(call_args[1], "sub")
        maintainer.drop_segment.assert_not_called()


class TestSegmentAudioPresence(unittest.IsolatedAsyncioTestCase):
    """Audio presence must flow from the segment probe into the DB insert."""

    def _build_maintainer(self) -> RecordingMaintainer:
        camera_config = MagicMock()
        camera_config.record.enabled = True
        camera_config.record.continuous.days = 1
        camera_config.record.motion.days = 0

        # no spec: pydantic fields like config.ffmpeg are not visible to
        # spec'd mocks, and the probe/move paths need them
        config = MagicMock()
        config.cameras = {"test_cam": camera_config}

        maintainer = RecordingMaintainer.__new__(RecordingMaintainer)
        maintainer.config = config
        maintainer.end_time_cache = {}
        maintainer.object_recordings_info = defaultdict(list)
        maintainer.audio_recordings_info = defaultdict(list)
        maintainer.recordings_publisher = MagicMock()
        # pre-seed the chain state so the lazy DB seed query is not attempted
        maintainer.last_segment_end = {("test_cam", "main"): 0.0}
        return maintainer

    async def test_probe_audio_presence_reaches_move_segment(self):
        for has_audio, audio_rate, audio_codec, video_codec in (
            (True, 16000, "aac", "hevc"),
            (True, 8000, "pcm_alaw", "h264"),
            (False, None, None, "h264"),
            (False, None, None, None),
        ):
            with self.subTest(
                has_audio=has_audio,
                audio_rate=audio_rate,
                audio_codec=audio_codec,
                video_codec=video_codec,
            ):
                maintainer = self._build_maintainer()
                maintainer.move_segment = AsyncMock(return_value=None)

                now = datetime.datetime.now(datetime.UTC)
                start_time = now - datetime.timedelta(seconds=20)
                cache_path = "/tmp/cache/test_cam@20260610143022+0000.mp4"
                # a processed frame past the segment end marks it ready
                maintainer.object_recordings_info["test_cam"] = [
                    (now.timestamp(), [], [], [])
                ]

                probe = AsyncMock(
                    return_value={
                        "has_valid_video": True,
                        "width": 1920,
                        "height": 1080,
                        "duration": 10.0,
                        "has_audio": has_audio,
                        "audio_rate": audio_rate,
                        "audio_codec": audio_codec,
                        "video_codec": video_codec,
                    }
                )
                with (
                    patch("frigate.record.maintainer.get_video_properties", probe),
                    patch(
                        "frigate.record.maintainer.get_keyframe_offsets",
                        AsyncMock(return_value=[0, 2000]),
                    ),
                ):
                    await maintainer.validate_and_move_segment(
                        "test_cam",
                        reviews=[],
                        recording={
                            "start_time": start_time,
                            "cache_path": cache_path,
                            "stream_type": "main",
                        },
                    )

                maintainer.move_segment.assert_awaited_once()
                call_args = maintainer.move_segment.await_args.args
                self.assertEqual(call_args[7], has_audio)
                self.assertEqual(call_args[8], audio_rate)
                self.assertEqual(call_args[9], audio_codec)
                self.assertEqual(call_args[11], [0, 2000])
                self.assertEqual(call_args[10], video_codec)
                # the probe result is cached alongside the end time so the
                # cached path stays as informed as the probed path
                self.assertEqual(maintainer.end_time_cache[cache_path][2], has_audio)
                self.assertEqual(maintainer.end_time_cache[cache_path][3], audio_rate)
                self.assertEqual(maintainer.end_time_cache[cache_path][4], audio_codec)
                self.assertEqual(maintainer.end_time_cache[cache_path][5], video_codec)

    async def test_move_segment_insert_includes_has_audio(self):
        for has_audio, audio_rate, audio_codec, video_codec in (
            (True, 16000, "aac", "hevc"),
            (False, None, None, None),
        ):
            with self.subTest(
                has_audio=has_audio,
                audio_rate=audio_rate,
                audio_codec=audio_codec,
                video_codec=video_codec,
            ):
                maintainer = self._build_maintainer()
                maintainer.config.ffmpeg.ffmpeg_path = "ffmpeg"

                start_time = datetime.datetime.now(datetime.UTC)
                end_time = start_time + datetime.timedelta(seconds=10)

                proc = MagicMock()
                proc.returncode = 0
                proc.wait = AsyncMock(return_value=0)

                with tempfile.TemporaryDirectory() as tmpdir:
                    cache_path = os.path.join(
                        tmpdir, "test_cam@20260610143022+0000.mp4"
                    )
                    with open(cache_path, "wb") as f:
                        f.write(b"\x00" * 16)

                    with (
                        patch(
                            "frigate.record.maintainer.RECORD_DIR",
                            os.path.join(tmpdir, "recordings"),
                        ),
                        patch(
                            "frigate.record.maintainer.asyncio.create_subprocess_exec",
                            AsyncMock(return_value=proc),
                        ),
                    ):
                        result = await maintainer.move_segment(
                            "test_cam",
                            "main",
                            start_time,
                            end_time,
                            10.0,
                            cache_path,
                            SegmentInfo(0, 0, 0, 0),
                            has_audio,
                            audio_rate,
                            audio_codec,
                            video_codec,
                        )

                self.assertIsNotNone(result)
                self.assertEqual(result[Recordings.has_audio.name], has_audio)
                self.assertEqual(result[Recordings.audio_rate.name], audio_rate)
                self.assertEqual(result[Recordings.audio_codec.name], audio_codec)
                self.assertEqual(result[Recordings.video_codec.name], video_codec)


class TestSegmentPathTime(unittest.IsolatedAsyncioTestCase):
    """The recording path must stay unique when segments are shorter than a second."""

    def _build_maintainer(self) -> RecordingMaintainer:
        camera_config = MagicMock()
        camera_config.record.enabled = True
        camera_config.record.continuous.days = 1
        camera_config.record.motion.days = 0

        config = MagicMock()
        config.cameras = {"test_cam": camera_config}

        maintainer = RecordingMaintainer.__new__(RecordingMaintainer)
        maintainer.config = config
        maintainer.end_time_cache = {}
        maintainer.object_recordings_info = defaultdict(list)
        maintainer.audio_recordings_info = defaultdict(list)
        maintainer.recordings_publisher = MagicMock()
        maintainer.last_segment_end = {("test_cam", "main"): 0.0}
        return maintainer

    def test_parses_main_and_sub_names(self):
        expected = datetime.datetime(2026, 6, 10, 14, 30, 22, tzinfo=datetime.UTC)
        self.assertEqual(
            segment_path_time("/tmp/cache/test_cam@20260610143022+0000.mp4"), expected
        )
        self.assertEqual(
            segment_path_time("/tmp/cache/test_cam@sub@20260610143022+0000.mp4"),
            expected,
        )

    def test_returns_none_for_unparsable_names(self):
        self.assertIsNone(segment_path_time("/tmp/cache/garbage.mp4"))
        self.assertIsNone(segment_path_time("/tmp/cache/test_cam@notadate.mp4"))

    async def test_sub_second_segments_get_distinct_paths(self):
        # two cache files a second apart whose resolved starts both land in
        # second 22; deriving the path from the resolved start collides
        segments = [
            ("test_cam@20260610143022+0000.mp4", 100_000),
            ("test_cam@20260610143023+0000.mp4", 980_000),
        ]
        paths = []

        with tempfile.TemporaryDirectory() as tmpdir:
            for name, microsecond in segments:
                maintainer = self._build_maintainer()
                maintainer.config.ffmpeg.ffmpeg_path = "ffmpeg"

                start_time = datetime.datetime(
                    2026, 6, 10, 14, 30, 22, microsecond, tzinfo=datetime.UTC
                )
                cache_path = os.path.join(tmpdir, name)
                with open(cache_path, "wb") as f:
                    f.write(b"\x00" * 16)

                proc = MagicMock()
                proc.returncode = 0
                proc.wait = AsyncMock(return_value=0)

                with (
                    patch(
                        "frigate.record.maintainer.RECORD_DIR",
                        os.path.join(tmpdir, "recordings"),
                    ),
                    patch(
                        "frigate.record.maintainer.asyncio.create_subprocess_exec",
                        AsyncMock(return_value=proc),
                    ),
                ):
                    result = await maintainer.move_segment(
                        "test_cam",
                        "main",
                        start_time,
                        start_time + datetime.timedelta(seconds=0.96),
                        0.96,
                        cache_path,
                        SegmentInfo(0, 0, 0, 0),
                    )

                self.assertIsNotNone(result)
                paths.append(result[Recordings.path.name])
                # the row keeps the resolved start even though the path doesn't
                self.assertEqual(
                    result[Recordings.start_time.name], start_time.timestamp()
                )

        self.assertEqual(len(set(paths)), 2, paths)
        self.assertTrue(paths[0].endswith("30.22.mp4"), paths[0])
        self.assertTrue(paths[1].endswith("30.23.mp4"), paths[1])


class TestSegmentStartChaining(unittest.IsolatedAsyncioTestCase):
    """Contiguous segments must chain start times across filename truncation.

    A contiguous segment's parsed start lands up to 1s before the previous
    segment's fractional end, and must snap to it without ever snapping
    across a genuine gap.
    """

    T0 = datetime.datetime(2026, 6, 10, 14, 30, 22, tzinfo=datetime.UTC).timestamp()

    async def test_contiguous_segment_snaps_to_previous_end(self):
        maintainer = _build_chaining_maintainer(self.T0)

        # segment A named at a whole second with a fractional duration
        await _validate_segment(maintainer, self.T0, 0, 10.4)
        # segment B's filename truncates its true start (T0 + 10.4) to T0 + 10
        await _validate_segment(maintainer, self.T0, 10, 10.4)

        calls = maintainer.move_segment.await_args_list
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[0].args[2].timestamp(), self.T0)
        self.assertAlmostEqual(calls[0].args[3].timestamp(), self.T0 + 10.4, places=3)
        self.assertAlmostEqual(calls[1].args[2].timestamp(), self.T0 + 10.4, places=3)
        self.assertAlmostEqual(calls[1].args[3].timestamp(), self.T0 + 20.8, places=3)

    async def test_genuine_gap_is_not_snapped(self):
        maintainer = _build_chaining_maintainer(self.T0)

        await _validate_segment(maintainer, self.T0, 0, 10.4)
        # a segment starting well after the previous end is a genuine gap
        await _validate_segment(maintainer, self.T0, 30, 10.4)

        calls = maintainer.move_segment.await_args_list
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[1].args[2].timestamp(), self.T0 + 30)
        self.assertAlmostEqual(calls[1].args[3].timestamp(), self.T0 + 40.4, places=3)

    async def test_difference_over_tolerance_is_not_snapped(self):
        # a last end far ahead of the parsed start (dual recorders or
        # cache-pressure deletions) must never pull the start forward
        maintainer = _build_chaining_maintainer(self.T0)
        maintainer.last_segment_end = {("test_cam", "main"): self.T0 + 5.0}

        await _validate_segment(maintainer, self.T0, 0, 10.4)

        calls = maintainer.move_segment.await_args_list
        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0].args[2].timestamp(), self.T0)

    async def test_start_after_last_end_within_tolerance_is_not_snapped(self):
        maintainer = _build_chaining_maintainer(self.T0)

        await _validate_segment(maintainer, self.T0, 0, 10.4)
        # parsed start T0 + 11 is after the last end (T0 + 10.4): a real
        # sub-second gap, never snapped backwards
        await _validate_segment(maintainer, self.T0, 11, 10.4)

        calls = maintainer.move_segment.await_args_list
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[1].args[2].timestamp(), self.T0 + 11)

    async def test_chain_survives_retention_discarded_segment(self):
        # motion retention: A and C overlap motion frames, B has none and is
        # discarded, but capture continued through B so C chains to B's end
        maintainer = _build_chaining_maintainer(self.T0, retention="motion")
        maintainer.object_recordings_info["test_cam"] = [
            (self.T0 + 5, [], [(0, 0, 10, 10)], []),
            (self.T0 + 25, [], [(0, 0, 10, 10)], []),
            (self.T0 + 1000, [], [], []),
        ]

        await _validate_segment(maintainer, self.T0, 0, 10.4)
        await _validate_segment(maintainer, self.T0, 10, 10.4)
        await _validate_segment(maintainer, self.T0, 20, 10.4)

        calls = maintainer.move_segment.await_args_list
        # B was discarded by motion retention, only A and C moved
        self.assertEqual(len(calls), 2)
        maintainer.drop_segment.assert_called_once_with(
            "/tmp/cache/test_cam@chain10.mp4"
        )
        # C snaps to B's end (T0 + 20.8), not A's end (T0 + 10.4)
        self.assertAlmostEqual(calls[1].args[2].timestamp(), self.T0 + 20.8, places=3)
        self.assertAlmostEqual(calls[1].args[3].timestamp(), self.T0 + 31.2, places=3)


class TestSegmentStartMtimeAnchoring(unittest.IsolatedAsyncioTestCase):
    """Segment starts must anchor to the cache file's close time.

    mtime is the wall clock when ffmpeg rolled the segment, so mtime minus
    the probed duration restores the fractional start the filename floored
    away. Contiguous segments still chain within probe jitter.
    """

    T0 = datetime.datetime(2026, 8, 7, 9, 15, 42, tzinfo=datetime.UTC).timestamp()

    async def test_mtime_restores_fractional_start(self):
        maintainer = _build_chaining_maintainer(self.T0)

        # true start T0 + 0.437; the filename floored it to T0
        await _validate_segment(
            maintainer, self.T0, 0, 10.0, mtime=self.T0 + 0.437 + 10.0
        )

        calls = maintainer.move_segment.await_args_list
        self.assertEqual(len(calls), 1)
        self.assertAlmostEqual(calls[0].args[2].timestamp(), self.T0 + 0.437, places=3)
        self.assertAlmostEqual(calls[0].args[3].timestamp(), self.T0 + 10.437, places=3)

    async def test_chain_wins_within_probe_jitter(self):
        maintainer = _build_chaining_maintainer(self.T0)

        await _validate_segment(
            maintainer, self.T0, 0, 10.0, mtime=self.T0 + 0.437 + 10.0
        )
        # B measures T0 + 10.420, a 17ms disagreement with A's chained end
        # (T0 + 10.437): the chain wins so the rows stay exactly adjacent
        await _validate_segment(
            maintainer, self.T0, 10, 10.0, mtime=self.T0 + 10.420 + 10.0
        )

        calls = maintainer.move_segment.await_args_list
        self.assertEqual(len(calls), 2)
        self.assertAlmostEqual(calls[1].args[2].timestamp(), self.T0 + 10.437, places=3)
        self.assertAlmostEqual(calls[1].args[3].timestamp(), self.T0 + 20.437, places=3)

    async def test_chain_reanchors_when_drifted(self):
        maintainer = _build_chaining_maintainer(self.T0)
        # accumulated probe error left the chain 0.7s past the measured start
        maintainer.last_segment_end = {("test_cam", "main"): self.T0 + 0.9}

        await _validate_segment(
            maintainer, self.T0, 0, 10.0, mtime=self.T0 + 0.2 + 10.0
        )

        calls = maintainer.move_segment.await_args_list
        self.assertEqual(len(calls), 1)
        self.assertAlmostEqual(calls[0].args[2].timestamp(), self.T0 + 0.2, places=3)

    async def test_implausible_mtime_falls_back_to_filename_chain(self):
        maintainer = _build_chaining_maintainer(self.T0)
        maintainer.last_segment_end = {("test_cam", "main"): self.T0 + 0.4}

        # a stalled stream: media (8s) is shorter than the wall span to the
        # close time (9.5s), so mtime - duration lands outside the window
        await _validate_segment(maintainer, self.T0, 0, 8.0, mtime=self.T0 + 9.5)

        calls = maintainer.move_segment.await_args_list
        self.assertEqual(len(calls), 1)
        self.assertAlmostEqual(calls[0].args[2].timestamp(), self.T0 + 0.4, places=3)


class TestSegmentChainSeeding(unittest.IsolatedAsyncioTestCase):
    """Chain state must lazily seed from the DB so chains survive restarts."""

    T0 = datetime.datetime(2026, 6, 10, 14, 30, 22, tzinfo=datetime.UTC).timestamp()

    def setUp(self):
        self.db = SqliteExtDatabase(":memory:")
        self.db.bind([Recordings])
        self.db.create_tables([Recordings])

    def tearDown(self):
        self.db.close()

    async def test_seeds_chain_from_db_once(self):
        maintainer = _build_chaining_maintainer(self.T0)
        # empty chain state forces the lazy DB seed on first encounter
        maintainer.last_segment_end = {}

        Recordings.create(
            id="seed-row",
            camera="test_cam",
            path="/recordings/seed.mp4",
            start_time=self.T0 - 10,
            end_time=self.T0 + 0.35,
            duration=10.35,
            stream_type="main",
        )

        with patch.object(Recordings, "select", wraps=Recordings.select) as select_spy:
            await _validate_segment(maintainer, self.T0, 0, 10.4)
            await _validate_segment(maintainer, self.T0, 10, 10.4)

        # the seed query runs once; the second segment uses in-memory state
        self.assertEqual(select_spy.call_count, 1)
        calls = maintainer.move_segment.await_args_list
        self.assertEqual(len(calls), 2)
        # first segment snaps to the stored fractional end_time
        self.assertAlmostEqual(calls[0].args[2].timestamp(), self.T0 + 0.35, places=3)
        self.assertAlmostEqual(calls[0].args[3].timestamp(), self.T0 + 10.75, places=3)
        # second segment chains off the first's in-memory end
        self.assertAlmostEqual(calls[1].args[2].timestamp(), self.T0 + 10.75, places=3)
