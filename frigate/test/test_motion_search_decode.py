"""Tests for the motion search hardware-accelerated decode helpers."""

import os
import shutil
import subprocess as sp
import tempfile
import unittest
from types import SimpleNamespace
from unittest import mock

import cv2
import numpy as np

from frigate.jobs.motion_search_decode import (
    KEYFRAME_MAX_GAP_SECONDS,
    build_motion_decode_command,
    build_vod_decode_command,
    iter_keyframe_frames,
    iter_segment_frames,
    keyframe_sampling_eligible,
    probe_keyframe_pts,
    probe_video_dimensions,
    probe_vod_keyframe_pts,
    resolve_motion_decode_args,
)


def _fake_camera_config(
    hwaccel_args, gpu=0, fps=5, width=1280, height=720, ffmpeg_path="ffmpeg"
):
    return SimpleNamespace(
        ffmpeg=SimpleNamespace(
            hwaccel_args=hwaccel_args, gpu=gpu, ffmpeg_path=ffmpeg_path
        ),
        detect=SimpleNamespace(fps=fps, width=width, height=height),
    )


class TestResolveMotionDecodeArgs(unittest.TestCase):
    def test_vaapi_preset_is_accelerated(self):
        args = resolve_motion_decode_args(_fake_camera_config("preset-vaapi"))
        self.assertIn("-hwaccel", args)
        self.assertIn("vaapi", args)

    def test_non_nv12_preset_falls_back_to_software(self):
        # rkmpp produces drm_prime surfaces that do not download to nv12, so it
        # must resolve to software decode (empty args) rather than risk corrupt
        # frames.
        self.assertEqual(
            resolve_motion_decode_args(_fake_camera_config("preset-rkmpp")), []
        )

    def test_custom_args_fall_back_to_software(self):
        # Arbitrary custom hwaccel args are not allowlisted, so they decode in
        # software to preserve byte-identical results.
        self.assertEqual(
            resolve_motion_decode_args(_fake_camera_config(["-hwaccel", "vulkan"])),
            [],
        )


class TestBuildMotionDecodeCommand(unittest.TestCase):
    def test_software_command_has_no_hwdownload(self):
        cmd = build_motion_decode_command(
            ffmpeg_path="ffmpeg",
            recording_path="/tmp/seg.mp4",
            start_frame=100,
            end_frame=400,
            frame_step=30,
            decode_args=[],
        )
        vf = cmd[cmd.index("-vf") + 1]
        self.assertEqual(vf, "select=gte(n\\,100)*not(mod(n-100\\,30))*lt(n\\,400)")
        self.assertNotIn("hwdownload", vf)
        self.assertIn("bgr24", cmd)
        self.assertEqual(cmd[-1], "pipe:")

    def test_hwaccel_command_appends_hwdownload_and_decode_args(self):
        cmd = build_motion_decode_command(
            ffmpeg_path="/usr/lib/ffmpeg",
            recording_path="/tmp/seg.mp4",
            start_frame=0,
            end_frame=300,
            frame_step=30,
            decode_args=["-hwaccel", "vaapi", "-hwaccel_output_format", "vaapi"],
        )
        # decode args must come before -i
        self.assertLess(cmd.index("-hwaccel"), cmd.index("-i"))
        vf = cmd[cmd.index("-vf") + 1]
        self.assertTrue(vf.endswith(",hwdownload,format=nv12"))
        self.assertTrue(vf.startswith("select=gte(n\\,0)"))

    def test_ffmpeg_path_is_first_token(self):
        cmd = build_motion_decode_command(
            ffmpeg_path="/usr/lib/ffmpeg",
            recording_path="/tmp/seg.mp4",
            start_frame=0,
            end_frame=30,
            frame_step=30,
            decode_args=[],
        )
        self.assertEqual(cmd[0], "/usr/lib/ffmpeg")

    def test_crop_scale_gray_filters_and_pix_fmt(self):
        cmd = build_motion_decode_command(
            ffmpeg_path="ffmpeg",
            recording_path="/tmp/seg.mp4",
            start_frame=0,
            end_frame=300,
            frame_step=30,
            decode_args=[],
            crop=(640, 480, 100, 50),  # w, h, x, y
            scale=(320, 240),
            gray=True,
        )
        vf = cmd[cmd.index("-vf") + 1]
        self.assertIn("crop=640:480:100:50", vf)
        self.assertIn("scale=320:240", vf)
        # crop must come before scale
        self.assertLess(vf.index("crop="), vf.index("scale="))
        self.assertEqual(cmd[cmd.index("-pix_fmt") + 1], "gray")

    def test_hwaccel_with_crop_scale_orders_download_first(self):
        cmd = build_motion_decode_command(
            ffmpeg_path="ffmpeg",
            recording_path="/tmp/seg.mp4",
            start_frame=0,
            end_frame=300,
            frame_step=30,
            decode_args=["-hwaccel", "vaapi", "-hwaccel_output_format", "vaapi"],
            crop=(640, 480, 0, 0),
            scale=(320, 240),
            gray=True,
        )
        vf = cmd[cmd.index("-vf") + 1]
        self.assertLess(vf.index("hwdownload"), vf.index("crop="))
        self.assertLess(vf.index("crop="), vf.index("scale="))


def _ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None


@unittest.skipUnless(_ffmpeg_available(), "ffmpeg not available")
class TestIterSegmentFrames(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmpdir = tempfile.mkdtemp()
        cls.path = os.path.join(cls.tmpdir, "sample.mp4")
        # 90 frames @ 30fps (3s) of moving test content, H.264.
        sp.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-f",
                "lavfi",
                "-i",
                "testsrc=size=320x240:rate=30:duration=3",
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-g",
                "15",
                cls.path,
            ],
            check=True,
        )

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmpdir, ignore_errors=True)

    def test_yields_expected_indices(self):
        frames = list(
            iter_segment_frames(
                ffmpeg_path="ffmpeg",
                recording_path=self.path,
                start_frame=0,
                end_frame=90,
                frame_step=30,
                frame_width=320,
                frame_height=240,
                decode_args=[],
                should_stop=lambda: False,
            )
        )
        indices = [idx for idx, _ in frames]
        self.assertEqual(indices, [0, 30, 60])
        for _, frame in frames:
            self.assertEqual(frame.shape, (240, 320, 3))

    def test_frames_match_cv2_decode(self):
        # Parity gate: ffmpeg-decoded sampled frames must equal cv2-decoded
        # frames at the same absolute indices.
        ffmpeg_frames = {
            idx: frame
            for idx, frame in iter_segment_frames(
                ffmpeg_path="ffmpeg",
                recording_path=self.path,
                start_frame=0,
                end_frame=90,
                frame_step=30,
                frame_width=320,
                frame_height=240,
                decode_args=[],
                should_stop=lambda: False,
            )
        }

        cap = cv2.VideoCapture(self.path)
        try:
            for idx in (0, 30, 60):
                cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
                ret, cv2_frame = cap.read()
                self.assertTrue(ret)
                np.testing.assert_array_equal(ffmpeg_frames[idx], cv2_frame)
        finally:
            cap.release()

    def test_crop_scale_gray_output_shape(self):
        # Crop a 160x120 region, scale to 80x60, gray: frames must be (60, 80).
        frames = list(
            iter_segment_frames(
                ffmpeg_path="ffmpeg",
                recording_path=self.path,
                start_frame=0,
                end_frame=90,
                frame_step=30,
                frame_width=80,
                frame_height=60,
                decode_args=[],
                should_stop=lambda: False,
                channels=1,
                crop=(160, 120, 0, 0),
                scale=(80, 60),
                gray=True,
            )
        )
        self.assertEqual([idx for idx, _ in frames], [0, 30, 60])
        for _, frame in frames:
            self.assertEqual(frame.shape, (60, 80))
            self.assertEqual(frame.dtype, np.uint8)

    def test_keyframe_decode_yields_only_keyframes(self):
        frames = list(
            iter_keyframe_frames(
                ffmpeg_path="ffmpeg",
                recording_path=self.path,
                out_width=320,
                out_height=240,
                channels=3,
                decode_args=[],
                crop=None,
                scale=None,
                gray=False,
                should_stop=lambda: False,
            )
        )
        # 90 frames @ -g 15 -> 6 keyframes (0,15,30,45,60,75).
        self.assertEqual(len(frames), 6)
        for f in frames:
            self.assertEqual(f.shape, (240, 320, 3))

    def test_software_fallback_on_bad_hwaccel(self):
        # An invalid hwaccel device should fail fast and fall back to software,
        # still producing all expected frames.
        frames = list(
            iter_segment_frames(
                ffmpeg_path="ffmpeg",
                recording_path=self.path,
                start_frame=0,
                end_frame=90,
                frame_step=30,
                frame_width=320,
                frame_height=240,
                decode_args=[
                    "-hwaccel",
                    "vaapi",
                    "-hwaccel_device",
                    "/dev/dri/doesnotexist",
                ],
                should_stop=lambda: False,
            )
        )
        self.assertEqual([idx for idx, _ in frames], [0, 30, 60])


class TestKeyframeEligibility(unittest.TestCase):
    def test_regular_short_gop_is_eligible(self):
        pts = [0.0, 0.5, 1.0, 1.5, 2.0]  # 0.5s gaps
        self.assertTrue(keyframe_sampling_eligible(pts))

    def test_long_gop_is_ineligible(self):
        pts = [0.0, 5.0, 10.0]  # 5s gaps
        self.assertFalse(keyframe_sampling_eligible(pts))

    def test_irregular_gop_ineligible_when_a_gap_is_long(self):
        pts = [0.0, 0.5, 1.0, 8.0]  # one 7s gap
        self.assertFalse(keyframe_sampling_eligible(pts))

    def test_too_few_keyframes_ineligible(self):
        self.assertFalse(keyframe_sampling_eligible([1.0]))
        self.assertFalse(keyframe_sampling_eligible([]))

    def test_default_max_gap_constant(self):
        self.assertEqual(KEYFRAME_MAX_GAP_SECONDS, 2.0)


class TestProbeKeyframePts(unittest.TestCase):
    def test_parses_keyframe_packets(self):
        sample = (
            '{"packets":['
            '{"pts_time":"0.000000","flags":"K__"},'
            '{"pts_time":"0.033333","flags":"___"},'
            '{"pts_time":"0.500000","flags":"K__"}]}'
        )
        completed = mock.Mock(stdout=sample, returncode=0)
        with mock.patch(
            "frigate.jobs.motion_search_decode.sp.run", return_value=completed
        ):
            pts = probe_keyframe_pts("ffprobe", "/tmp/seg.mp4")
        self.assertEqual(pts, [0.0, 0.5])

    def test_returns_empty_on_probe_failure(self):
        with mock.patch(
            "frigate.jobs.motion_search_decode.sp.run",
            side_effect=OSError("boom"),
        ):
            self.assertEqual(probe_keyframe_pts("ffprobe", "/tmp/seg.mp4"), [])


class TestVodDecodeCommand(unittest.TestCase):
    URL = "http://127.0.0.1:5000/vod/cam/start/1/end/2/index.m3u8"

    def test_keyframe_command_shape(self):
        cmd = build_vod_decode_command(
            "ffmpeg",
            self.URL,
            decode_args=[],
            crop=(100, 80, 10, 20),
            scale=(50, 40),
            gray=True,
            skip_nonkey=True,
            fps_rate=None,
        )
        joined = " ".join(cmd)
        self.assertIn("-skip_frame nokey", joined)
        self.assertIn("-protocol_whitelist pipe,file,http,tcp", joined)
        self.assertIn(f"-i {self.URL}", joined)
        self.assertIn("crop=100:80:10:20", joined)
        self.assertIn("scale=50:40", joined)
        self.assertIn("-pix_fmt gray", joined)
        self.assertNotIn("fps=", joined)

    def test_fps_command_uses_fps_filter_not_skip_frame(self):
        cmd = build_vod_decode_command(
            "ffmpeg",
            self.URL,
            decode_args=[],
            crop=None,
            scale=None,
            gray=False,
            skip_nonkey=False,
            fps_rate=2.0,
        )
        joined = " ".join(cmd)
        self.assertNotIn("skip_frame", joined)
        self.assertIn("fps=2.0", joined)
        self.assertIn("-pix_fmt bgr24", joined)

    def test_hwaccel_inserts_hwdownload(self):
        cmd = build_vod_decode_command(
            "ffmpeg",
            self.URL,
            decode_args=["-hwaccel", "vaapi"],
            crop=None,
            scale=None,
            gray=True,
            skip_nonkey=True,
            fps_rate=None,
        )
        joined = " ".join(cmd)
        self.assertIn("hwdownload", joined)
        self.assertIn("format=nv12", joined)


class TestProbeVodKeyframePts(unittest.TestCase):
    def test_parses_keyframe_packets(self):
        sample = (
            '{"packets":['
            '{"pts_time":"0.000000","flags":"K__"},'
            '{"pts_time":"1.000000","flags":"___"},'
            '{"pts_time":"2.000000","flags":"K__"}]}'
        )
        completed = mock.Mock(stdout=sample, returncode=0)
        with mock.patch(
            "frigate.jobs.motion_search_decode.sp.run", return_value=completed
        ):
            pts = probe_vod_keyframe_pts("ffprobe", "http://x/index.m3u8")
        self.assertEqual(pts, [0.0, 2.0])

    def test_returns_empty_on_failure(self):
        with mock.patch(
            "frigate.jobs.motion_search_decode.sp.run",
            side_effect=OSError("boom"),
        ):
            self.assertEqual(probe_vod_keyframe_pts("ffprobe", "http://x"), [])


class TestProbeVideoDimensions(unittest.TestCase):
    def test_parses_dimensions_and_fps(self):
        sample = (
            '{"streams":[{"width":1920,"height":1080,"avg_frame_rate":"30000/1001"}]}'
        )
        completed = mock.Mock(stdout=sample, returncode=0)
        with mock.patch(
            "frigate.jobs.motion_search_decode.sp.run", return_value=completed
        ):
            dims = probe_video_dimensions("ffprobe", "/tmp/a.mp4")
        assert dims is not None
        width, height, fps = dims
        self.assertEqual((width, height), (1920, 1080))
        self.assertAlmostEqual(fps, 29.97, places=2)

    def test_returns_none_on_zero_dimensions(self):
        sample = '{"streams":[{"width":0,"height":0,"avg_frame_rate":"0/0"}]}'
        completed = mock.Mock(stdout=sample, returncode=0)
        with mock.patch(
            "frigate.jobs.motion_search_decode.sp.run", return_value=completed
        ):
            self.assertIsNone(probe_video_dimensions("ffprobe", "/tmp/a.mp4"))


if __name__ == "__main__":
    unittest.main()
