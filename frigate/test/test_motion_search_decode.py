"""Tests for the motion search hardware-accelerated decode helpers."""

import unittest
from types import SimpleNamespace
from unittest import mock

from frigate.jobs.motion_search_decode import (
    KEYFRAME_MAX_GAP_SECONDS,
    build_vod_decode_command,
    keyframe_sampling_eligible,
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
        # Arbitrary custom hwaccel args (a list, not a preset) decode in software
        # to preserve byte-identical results.
        self.assertEqual(
            resolve_motion_decode_args(_fake_camera_config(["-hwaccel", "vulkan"])),
            [],
        )

    def test_nvidia_codec_preset_is_accelerated(self):
        # Codec-specific nvidia presets resolve to the same cuda decode args as
        # the bare preset, so eligibility is derived from -hwaccel_output_format
        # rather than a hardcoded list that omitted these aliases.
        args = resolve_motion_decode_args(_fake_camera_config("preset-nvidia-h264"))
        self.assertIn("-hwaccel_output_format", args)
        self.assertIn("cuda", args)

    def test_software_only_preset_falls_back_to_software(self):
        # A preset with no -hwaccel_output_format (decoder-based, no GPU surface)
        # cannot use the nv12 download step, so it decodes in software.
        self.assertEqual(
            resolve_motion_decode_args(_fake_camera_config("preset-rpi-64-h264")), []
        )


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
