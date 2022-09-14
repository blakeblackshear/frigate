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


PRESETS_INPUT_ARGS = {
    "preset-http-jpeg-generic": "-r {} -stream_loop -1 -f image2 -avoid_negative_ts make_zero -fflags nobuffer -flags low_delay -strict experimental -fflags +genpts+discardcorrupt -use_wallclock_as_timestamps 1",
    "preset-http-mjpeg-generic": "-avoid_negative_ts make_zero -fflags nobuffer -flags low_delay -strict experimental -fflags +genpts+discardcorrupt -use_wallclock_as_timestamps 1",
    "preset-http-reolink": "-avoid_negative_ts make_zero -fflags +genpts+discardcorrupt -flags low_delay -strict experimental -analyzeduration 1000M -probesize 1000M -rw_timeout 5000000",
    "preset-rtmp-generic": "-avoid_negative_ts make_zero -fflags nobuffer -flags low_delay -strict experimental -fflags +genpts+discardcorrupt -rw_timeout 5000000 -use_wallclock_as_timestamps 1 -f live_flv",
    "preset-rtsp-generic": "-avoid_negative_ts make_zero -fflags +genpts+discardcorrupt -rtsp_transport tcp -timeout 5000000 -use_wallclock_as_timestamps 1",
    "preset-rtsp-udp": "-avoid_negative_ts make_zero -fflags +genpts+discardcorrupt -rtsp_transport udp -timeout 5000000 -use_wallclock_as_timestamps 1",
    "preset-rtsp-blue-iris": "-avoid_negative_ts make_zero -flags low_delay -strict experimental -fflags +genpts+discardcorrupt -rtsp_transport tcp -timeout 5000000 -use_wallclock_as_timestamps 1",
}


def parse_preset_input(arg: Any, detect_fps: int) -> str:
    """Return the correct preset if in preset format otherwise return raw input."""
    if not isinstance(arg, str):
        return None

    if arg is "preset-jpeg-generic":
        return PRESETS_INPUT_ARGS[arg].format(f'{detect_fps}')

    return PRESETS_INPUT_ARGS.get(arg, None)
