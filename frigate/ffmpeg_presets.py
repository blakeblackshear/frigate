"""Handles inserting and maintaining ffmpeg presets."""

from typing import Any


PRESETS_HW_ACCEL = {
    "preset-rpi-32-h264": "-c:v h264_v4l2m2m",
    "preset-rpi-64-h264": "-c:v h264_v4l2m2m",
    "preset-intel-vaapi": "-hwaccel vaapi -hwaccel_device /dev/dri/renderD128 -hwaccel_output_format yuv420p",
    "preset-intel-qsv-h264": "-c:v h264_qsv",
    "preset-intel-qsv-h265": "-c:v hevc_qsv",
    "preset-amd-vaapi": "-hwaccel vaapi -hwaccel_device /dev/dri/renderD128 -hwaccel_output_format yuv420p",
    "preset-nvidia-h264": "-c:v h264_cuvid",
    "preset-nvidia-h265": "-c:v hevc_cuvid",
}

def parse_preset_hardware_acceleration(arg: Any) -> str:
    """Return the correct preset if in preset format otherwise return raw input."""
    if not isinstance(arg, str):
        return None

    return PRESETS_HW_ACCEL.get(arg, None)