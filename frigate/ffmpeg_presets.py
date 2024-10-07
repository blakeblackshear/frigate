"""Handles inserting and maintaining ffmpeg presets."""

import logging
import os
from enum import Enum
from typing import Any

from frigate.const import (
    FFMPEG_HWACCEL_NVIDIA,
    FFMPEG_HWACCEL_VAAPI,
    FFMPEG_HWACCEL_VULKAN,
)
from frigate.util.services import vainfo_hwaccel
from frigate.version import VERSION

logger = logging.getLogger(__name__)


class LibvaGpuSelector:
    "Automatically selects the correct libva GPU."

    _selected_gpu = None

    def get_selected_gpu(self) -> str:
        """Get selected libva GPU."""
        if not os.path.exists("/dev/dri"):
            return ""

        if self._selected_gpu:
            return self._selected_gpu

        devices = list(filter(lambda d: d.startswith("render"), os.listdir("/dev/dri")))

        if not devices:
            return "/dev/dri/renderD128"

        if len(devices) < 2:
            self._selected_gpu = f"/dev/dri/{devices[0]}"
            return self._selected_gpu

        for device in devices:
            check = vainfo_hwaccel(device_name=device)

            logger.debug(f"{device} return vainfo status code: {check.returncode}")

            if check.returncode == 0:
                self._selected_gpu = f"/dev/dri/{device}"
                return self._selected_gpu

        return ""


FPS_VFR_PARAM = (
    "-fps_mode vfr"
    if int(os.getenv("LIBAVFORMAT_VERSION_MAJOR", "59") or "59") >= 59
    else "-vsync 2"
)
TIMEOUT_PARAM = (
    "-timeout"
    if int(os.getenv("LIBAVFORMAT_VERSION_MAJOR", "59") or "59") >= 59
    else "-stimeout"
)

_gpu_selector = LibvaGpuSelector()
_user_agent_args = [
    "-user_agent",
    f"FFmpeg Frigate/{VERSION}",
]

PRESETS_HW_ACCEL_DECODE = {
    "preset-rpi-64-h264": "-c:v:1 h264_v4l2m2m",
    "preset-rpi-64-h265": "-c:v:1 hevc_v4l2m2m",
    FFMPEG_HWACCEL_VAAPI: f"-hwaccel_flags allow_profile_mismatch -hwaccel vaapi -hwaccel_device {_gpu_selector.get_selected_gpu()} -hwaccel_output_format vaapi",
    "preset-intel-qsv-h264": f"-hwaccel qsv -qsv_device {_gpu_selector.get_selected_gpu()} -hwaccel_output_format qsv -c:v h264_qsv",
    "preset-intel-qsv-h265": f"-load_plugin hevc_hw -hwaccel qsv -qsv_device {_gpu_selector.get_selected_gpu()} -hwaccel_output_format qsv -c:v hevc_qsv",
    FFMPEG_HWACCEL_NVIDIA: "-hwaccel cuda -hwaccel_output_format cuda",
    "preset-jetson-h264": "-c:v h264_nvmpi -resize {1}x{2}",
    "preset-jetson-h265": "-c:v hevc_nvmpi -resize {1}x{2}",
    "preset-rk-h264": "-hwaccel rkmpp -hwaccel_output_format drm_prime",
    "preset-rk-h265": "-hwaccel rkmpp -hwaccel_output_format drm_prime",
    # experimental presets
    FFMPEG_HWACCEL_VULKAN: "-hwaccel vulkan -init_hw_device vulkan=gpu:0 -filter_hw_device gpu -hwaccel_output_format vulkan",
}
PRESETS_HW_ACCEL_DECODE["preset-nvidia-h264"] = PRESETS_HW_ACCEL_DECODE[
    FFMPEG_HWACCEL_NVIDIA
]
PRESETS_HW_ACCEL_DECODE["preset-nvidia-h265"] = PRESETS_HW_ACCEL_DECODE[
    FFMPEG_HWACCEL_NVIDIA
]
PRESETS_HW_ACCEL_DECODE["preset-nvidia-mjpeg"] = PRESETS_HW_ACCEL_DECODE[
    FFMPEG_HWACCEL_NVIDIA
]

PRESETS_HW_ACCEL_SCALE = {
    "preset-rpi-64-h264": "-r {0} -vf fps={0},scale={1}:{2}",
    "preset-rpi-64-h265": "-r {0} -vf fps={0},scale={1}:{2}",
    FFMPEG_HWACCEL_VAAPI: "-r {0} -vf fps={0},scale_vaapi=w={1}:h={2},hwdownload,format=nv12,eq=gamma=1.4:gamma_weight=0.5",
    "preset-intel-qsv-h264": "-r {0} -vf vpp_qsv=framerate={0}:w={1}:h={2}:format=nv12,hwdownload,format=nv12,format=yuv420p",
    "preset-intel-qsv-h265": "-r {0} -vf vpp_qsv=framerate={0}:w={1}:h={2}:format=nv12,hwdownload,format=nv12,format=yuv420p",
    FFMPEG_HWACCEL_NVIDIA: "-r {0} -vf fps={0},scale_cuda=w={1}:h={2},hwdownload,format=nv12,eq=gamma=1.4:gamma_weight=0.5",
    "preset-jetson-h264": "-r {0}",  # scaled in decoder
    "preset-jetson-h265": "-r {0}",  # scaled in decoder
    "preset-rk-h264": "-r {0} -vf scale_rkrga=w={1}:h={2}:format=yuv420p:force_original_aspect_ratio=0,hwmap=mode=read,format=yuv420p",
    "preset-rk-h265": "-r {0} -vf scale_rkrga=w={1}:h={2}:format=yuv420p:force_original_aspect_ratio=0,hwmap=mode=read,format=yuv420p",
    "default": "-r {0} -vf fps={0},scale={1}:{2}",
    # experimental presets
    FFMPEG_HWACCEL_VULKAN: "-r {0} -vf fps={0},hwupload,scale_vulkan=w={1}:h={2},hwdownload",
}
PRESETS_HW_ACCEL_SCALE["preset-nvidia-h264"] = PRESETS_HW_ACCEL_SCALE[
    FFMPEG_HWACCEL_NVIDIA
]
PRESETS_HW_ACCEL_SCALE["preset-nvidia-h265"] = PRESETS_HW_ACCEL_SCALE[
    FFMPEG_HWACCEL_NVIDIA
]

PRESETS_HW_ACCEL_ENCODE_BIRDSEYE = {
    "preset-rpi-64-h264": "{0} -hide_banner {1} -c:v h264_v4l2m2m {2}",
    "preset-rpi-64-h265": "{0} -hide_banner {1} -c:v hevc_v4l2m2m {2}",
    FFMPEG_HWACCEL_VAAPI: "{0} -hide_banner -hwaccel vaapi -hwaccel_output_format vaapi -hwaccel_device {3} {1} -c:v h264_vaapi -g 50 -bf 0 -profile:v high -level:v 4.1 -sei:v 0 -an -vf format=vaapi|nv12,hwupload {2}",
    "preset-intel-qsv-h264": "{0} -hide_banner {1} -c:v h264_qsv -g 50 -bf 0 -profile:v high -level:v 4.1 -async_depth:v 1 {2}",
    "preset-intel-qsv-h265": "{0} -hide_banner {1} -c:v h264_qsv -g 50 -bf 0 -profile:v high -level:v 4.1 -async_depth:v 1 {2}",
    FFMPEG_HWACCEL_NVIDIA: "{0} -hide_banner {1} -c:v h264_nvenc -g 50 -profile:v high -level:v auto -preset:v p2 -tune:v ll {2}",
    "preset-jetson-h264": "{0} -hide_banner {1} -c:v h264_nvmpi -profile high {2}",
    "preset-jetson-h265": "{0} -hide_banner {1} -c:v h264_nvmpi -profile high {2}",
    "preset-rk-h264": "{0} -hide_banner {1} -c:v h264_rkmpp -profile:v high {2}",
    "preset-rk-h265": "{0} -hide_banner {1} -c:v hevc_rkmpp -profile:v high {2}",
    "default": "{0} -hide_banner {1} -c:v libx264 -g 50 -profile:v high -level:v 4.1 -preset:v superfast -tune:v zerolatency {2}",
}
PRESETS_HW_ACCEL_ENCODE_BIRDSEYE["preset-nvidia-h264"] = (
    PRESETS_HW_ACCEL_ENCODE_BIRDSEYE[FFMPEG_HWACCEL_NVIDIA]
)
PRESETS_HW_ACCEL_ENCODE_BIRDSEYE["preset-nvidia-h265"] = (
    PRESETS_HW_ACCEL_ENCODE_BIRDSEYE[FFMPEG_HWACCEL_NVIDIA]
)

PRESETS_HW_ACCEL_ENCODE_TIMELAPSE = {
    "preset-rpi-64-h264": "{0} -hide_banner {1} -c:v h264_v4l2m2m -pix_fmt yuv420p {2}",
    "preset-rpi-64-h265": "{0} -hide_banner {1} -c:v hevc_v4l2m2m -pix_fmt yuv420p {2}",
    FFMPEG_HWACCEL_VAAPI: "{0} -hide_banner -hwaccel vaapi -hwaccel_output_format vaapi -hwaccel_device {3} {1} -c:v h264_vaapi {2}",
    "preset-intel-qsv-h264": "{0} -hide_banner {1} -c:v h264_qsv -profile:v high -level:v 4.1 -async_depth:v 1 {2}",
    "preset-intel-qsv-h265": "{0} -hide_banner {1} -c:v hevc_qsv -profile:v high -level:v 4.1 -async_depth:v 1 {2}",
    FFMPEG_HWACCEL_NVIDIA: "{0} -hide_banner -hwaccel cuda -hwaccel_output_format cuda -extra_hw_frames 8 {1} -c:v h264_nvenc {2}",
    "preset-nvidia-h265": "{0} -hide_banner -hwaccel cuda -hwaccel_output_format cuda -extra_hw_frames 8 {1} -c:v hevc_nvenc {2}",
    "preset-jetson-h264": "{0} -hide_banner {1} -c:v h264_nvmpi -profile high {2}",
    "preset-jetson-h265": "{0} -hide_banner {1} -c:v hevc_nvmpi -profile high {2}",
    "preset-rk-h264": "{0} -hide_banner {1} -c:v h264_rkmpp -profile:v high {2}",
    "preset-rk-h265": "{0} -hide_banner {1} -c:v hevc_rkmpp -profile:v high {2}",
    "default": "{0} -hide_banner {1} -c:v libx264 -preset:v ultrafast -tune:v zerolatency {2}",
}
PRESETS_HW_ACCEL_ENCODE_TIMELAPSE["preset-nvidia-h264"] = (
    PRESETS_HW_ACCEL_ENCODE_TIMELAPSE[FFMPEG_HWACCEL_NVIDIA]
)

# encoding of previews is only done on CPU due to comparable encode times and better quality from libx264
PRESETS_HW_ACCEL_ENCODE_PREVIEW = {
    "default": "{0} -hide_banner {1} -c:v libx264 -profile:v baseline -preset:v ultrafast {2}",
}


def parse_preset_hardware_acceleration_decode(
    arg: Any,
    fps: int,
    width: int,
    height: int,
) -> list[str]:
    """Return the correct preset if in preset format otherwise return None."""
    if not isinstance(arg, str):
        return None

    decode = PRESETS_HW_ACCEL_DECODE.get(arg, None)

    if not decode:
        return None

    return decode.format(fps, width, height).split(" ")


def parse_preset_hardware_acceleration_scale(
    arg: Any,
    detect_args: list[str],
    fps: int,
    width: int,
    height: int,
) -> list[str]:
    """Return the correct scaling preset or default preset if none is set."""
    if not isinstance(arg, str) or " " in arg:
        scale = PRESETS_HW_ACCEL_SCALE["default"]
    else:
        scale = PRESETS_HW_ACCEL_SCALE.get(arg, PRESETS_HW_ACCEL_SCALE["default"])

    if (
        ",hwdownload,format=nv12,eq=gamma=1.4:gamma_weight=0.5" in scale
        and os.environ.get("FFMPEG_DISABLE_GAMMA_EQUALIZER") is not None
    ):
        scale.replace(
            ",hwdownload,format=nv12,eq=gamma=1.4:gamma_weight=0.5",
            ":format=nv12,hwdownload,format=nv12,format=yuv420p",
        )

    scale = scale.format(fps, width, height).split(" ")
    scale.extend(detect_args)
    return scale


class EncodeTypeEnum(str, Enum):
    birdseye = "birdseye"
    preview = "preview"
    timelapse = "timelapse"


def parse_preset_hardware_acceleration_encode(
    ffmpeg_path: str,
    arg: Any,
    input: str,
    output: str,
    type: EncodeTypeEnum = EncodeTypeEnum.birdseye,
) -> str:
    """Return the correct scaling preset or default preset if none is set."""
    if type == EncodeTypeEnum.birdseye:
        arg_map = PRESETS_HW_ACCEL_ENCODE_BIRDSEYE
    elif type == EncodeTypeEnum.preview:
        arg_map = PRESETS_HW_ACCEL_ENCODE_PREVIEW
    elif type == EncodeTypeEnum.timelapse:
        arg_map = PRESETS_HW_ACCEL_ENCODE_TIMELAPSE

    if not isinstance(arg, str):
        return arg_map["default"].format(input, output)

    # Not all jetsons have HW encoders, so fall back to default SW encoder if not
    if arg.startswith("preset-jetson-") and not os.path.exists("/dev/nvhost-msenc"):
        arg = "default"

    return arg_map.get(arg, arg_map["default"]).format(
        ffmpeg_path,
        input,
        output,
        _gpu_selector.get_selected_gpu(),
    )


PRESETS_INPUT = {
    "preset-http-jpeg-generic": [
        "-r",
        "{}",
        "-stream_loop",
        "-1",
        "-f",
        "image2",
        "-avoid_negative_ts",
        "make_zero",
        "-fflags",
        "nobuffer",
        "-flags",
        "low_delay",
        "-strict",
        "experimental",
        "-fflags",
        "+genpts+discardcorrupt",
        "-use_wallclock_as_timestamps",
        "1",
    ],
    "preset-http-mjpeg-generic": _user_agent_args
    + [
        "-avoid_negative_ts",
        "make_zero",
        "-fflags",
        "nobuffer",
        "-flags",
        "low_delay",
        "-strict",
        "experimental",
        "-fflags",
        "+genpts+discardcorrupt",
        "-use_wallclock_as_timestamps",
        "1",
    ],
    "preset-http-reolink": _user_agent_args
    + [
        "-avoid_negative_ts",
        "make_zero",
        "-fflags",
        "+genpts+discardcorrupt",
        "-flags",
        "low_delay",
        "-strict",
        "experimental",
        "-analyzeduration",
        "1000M",
        "-probesize",
        "1000M",
        "-rw_timeout",
        "5000000",
    ],
    "preset-rtmp-generic": [
        "-avoid_negative_ts",
        "make_zero",
        "-fflags",
        "nobuffer",
        "-flags",
        "low_delay",
        "-strict",
        "experimental",
        "-fflags",
        "+genpts+discardcorrupt",
        "-rw_timeout",
        "5000000",
        "-use_wallclock_as_timestamps",
        "1",
        "-f",
        "live_flv",
    ],
    "preset-rtsp-generic": _user_agent_args
    + [
        "-avoid_negative_ts",
        "make_zero",
        "-fflags",
        "+genpts+discardcorrupt",
        "-rtsp_transport",
        "tcp",
        TIMEOUT_PARAM,
        "5000000",
        "-use_wallclock_as_timestamps",
        "1",
    ],
    "preset-rtsp-restream": _user_agent_args
    + [
        "-rtsp_transport",
        "tcp",
        TIMEOUT_PARAM,
        "5000000",
    ],
    "preset-rtsp-restream-low-latency": _user_agent_args
    + [
        "-rtsp_transport",
        "tcp",
        TIMEOUT_PARAM,
        "5000000",
        "-fflags",
        "nobuffer",
        "-flags",
        "low_delay",
    ],
    "preset-rtsp-udp": _user_agent_args
    + [
        "-avoid_negative_ts",
        "make_zero",
        "-fflags",
        "+genpts+discardcorrupt",
        "-rtsp_transport",
        "udp",
        TIMEOUT_PARAM,
        "5000000",
        "-use_wallclock_as_timestamps",
        "1",
    ],
    "preset-rtsp-blue-iris": _user_agent_args
    + [
        "-user_agent",
        f"FFmpeg Frigate/{VERSION}",
        "-avoid_negative_ts",
        "make_zero",
        "-flags",
        "low_delay",
        "-strict",
        "experimental",
        "-fflags",
        "+genpts+discardcorrupt",
        "-rtsp_transport",
        "tcp",
        TIMEOUT_PARAM,
        "5000000",
        "-use_wallclock_as_timestamps",
        "1",
    ],
}


def parse_preset_input(arg: Any, detect_fps: int) -> list[str]:
    """Return the correct preset if in preset format otherwise return None."""
    if not isinstance(arg, str):
        return None

    if arg == "preset-http-jpeg-generic":
        input = PRESETS_INPUT[arg].copy()
        input[len(_user_agent_args) + 1] = str(detect_fps)
        return input

    return PRESETS_INPUT.get(arg, None)


PRESETS_RECORD_OUTPUT = {
    "preset-record-generic": [
        "-f",
        "segment",
        "-segment_time",
        "10",
        "-segment_format",
        "mp4",
        "-reset_timestamps",
        "1",
        "-strftime",
        "1",
        "-c",
        "copy",
        "-an",
    ],
    "preset-record-generic-audio-aac": [
        "-f",
        "segment",
        "-segment_time",
        "10",
        "-segment_format",
        "mp4",
        "-reset_timestamps",
        "1",
        "-strftime",
        "1",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
    ],
    "preset-record-generic-audio-copy": [
        "-f",
        "segment",
        "-segment_time",
        "10",
        "-segment_format",
        "mp4",
        "-reset_timestamps",
        "1",
        "-strftime",
        "1",
        "-c",
        "copy",
    ],
    "preset-record-mjpeg": [
        "-f",
        "segment",
        "-segment_time",
        "10",
        "-segment_format",
        "mp4",
        "-reset_timestamps",
        "1",
        "-strftime",
        "1",
        "-c:v",
        "libx264",
        "-an",
    ],
    "preset-record-jpeg": [
        "-f",
        "segment",
        "-segment_time",
        "10",
        "-segment_format",
        "mp4",
        "-reset_timestamps",
        "1",
        "-strftime",
        "1",
        "-c:v",
        "libx264",
        "-an",
    ],
    "preset-record-ubiquiti": [
        "-f",
        "segment",
        "-segment_time",
        "10",
        "-segment_format",
        "mp4",
        "-reset_timestamps",
        "1",
        "-strftime",
        "1",
        "-c:v",
        "copy",
        "-ar",
        "44100",
        "-c:a",
        "aac",
    ],
}


def parse_preset_output_record(arg: Any, force_record_hvc1: bool) -> list[str]:
    """Return the correct preset if in preset format otherwise return None."""
    if not isinstance(arg, str):
        return None

    preset = PRESETS_RECORD_OUTPUT.get(arg, None)

    if not preset:
        return None

    if force_record_hvc1:
        # Apple only supports HEVC if it is hvc1 (vs. hev1)
        preset += ["-tag:v", "hvc1"]

    return preset
