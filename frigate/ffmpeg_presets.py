"""Handles inserting and maintaining ffmpeg presets."""

from typing import Any

from frigate.version import VERSION

_user_agent_args = [
    "-user_agent",
    f"FFmpeg Frigate/{VERSION}",
]

PRESETS_HW_ACCEL_DECODE = {
    "preset-rpi-32-h264": ["-c:v", "h264_v4l2m2m"],
    "preset-rpi-64-h264": ["-c:v", "h264_v4l2m2m"],
    "preset-intel-vaapi": [
        "-hwaccel",
        "vaapi",
        "-hwaccel_device",
        "/dev/dri/renderD128",
        "-hwaccel_output_format",
        "yuv420p",
    ],
    "preset-intel-qsv-h264": ["-c:v", "h264_qsv"],
    "preset-intel-qsv-h265": ["-c:v", "hevc_qsv"],
    "preset-amd-vaapi": [
        "-hwaccel",
        "vaapi",
        "-hwaccel_device",
        "/dev/dri/renderD128",
        "-hwaccel_output_format",
        "yuv420p",
    ],
    "preset-nvidia-h264": ["-c:v", "h264_cuvid"],
    "preset-nvidia-h265": ["-c:v", "hevc_cuvid"],
    "preset-nvidia-mjpeg": ["-c:v", "mjpeg_cuvid"],
}

PRESETS_HW_ACCEL_SCALE = {
    "preset-intel-vaapi": [
        "-vf",
        "fps={},deinterlace_vaapi=rate=field:auto=1,scale_vaapi=w={}:h={},hwdownload,format=yuv420p",
        "-f",
        "rawvideo",
    ],
    "preset-intel-qsv-h264": [
        "-vf",
        "vpp_qsv=framerate={}:scale_mode=1:w={}:h={}:detail=50:denoise=100:deinterlace=2:format=nv12,hwdownload,format=nv12,format=yuv420p",
        "-f",
        "rawvideo",
    ],
    "preset-intel-qsv-h265": [
        "-vf",
        "vpp_qsv=framerate={}:scale_mode=1:w={}:h={}:detail=50:denoise=100:deinterlace=2:format=nv12,hwdownload,format=nv12,format=yuv420p",
        "-f",
        "rawvideo",
    ],
    "preset-amd-vaapi": [
        "-vf",
        "fps={},deinterlace_vaapi=rate=field:auto=1,scale_vaapi=w={}:h={},hwdownload,format=yuv420p",
        "-f",
        "rawvideo",
    ],
    "preset-nvidia-h264": [
        "-vf",
        "fps={},scale_cuda=w={}:h={}:format=nv12,hwdownload,format=nv12,format=yuv420p",
        "-f",
        "rawvideo",
    ],
    "preset-nvidia-h265": [
        "-vf",
        "fps={},scale_cuda=w={}:h={}:format=nv12,hwdownload,format=nv12,format=yuv420p",
        "-f",
        "rawvideo",
    ],
    "default": [
        "-r",
        "{}",
        "-s",
        "{}",
    ],
}


def parse_preset_hardware_acceleration_decode(arg: Any) -> list[str]:
    """Return the correct preset if in preset format otherwise return None."""
    if not isinstance(arg, str):
        return None

    return PRESETS_HW_ACCEL_DECODE.get(arg, None)


def parse_preset_hardware_acceleration_scale(
    arg: Any,
    fps: int,
    width: int,
    height: int,
) -> list[str]:
    """Return the correct scaling preset or default preset if none is set."""
    if not isinstance(arg, str):
        scale = PRESETS_HW_ACCEL_SCALE["default"]
        scale[1] = str(fps)
        scale[3] = f"{width}x{height}"
        return scale

    scale = PRESETS_HW_ACCEL_SCALE.get(arg, PRESETS_HW_ACCEL_SCALE["default"])
    scale[1] = scale[1].format(fps, height, width)
    return scale


PRESETS_INPUT = {
    "preset-http-jpeg-generic": _user_agent_args
    + [
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
        "-timeout",
        "5000000",
        "-use_wallclock_as_timestamps",
        "1",
    ],
    "preset-rtsp-udp": _user_agent_args
    + [
        "-avoid_negative_ts",
        "make_zero",
        "-fflags",
        "+genpts+discardcorrupt",
        "-rtsp_transport",
        "udp",
        "-timeout",
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
        "-timeout",
        "5000000",
        "-use_wallclock_as_timestamps",
        "1",
    ],
}


def parse_preset_input(arg: Any, detect_fps: int) -> list[str]:
    """Return the correct preset if in preset format otherwise return None."""
    if not isinstance(arg, str):
        return None

    if arg == "preset-jpeg-generic":
        return PRESETS_INPUT[arg].format(f"{detect_fps}")

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
    "preset-record-generic-audio": [
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


def parse_preset_output_record(arg: Any) -> list[str]:
    """Return the correct preset if in preset format otherwise return None."""
    if not isinstance(arg, str):
        return None

    return PRESETS_RECORD_OUTPUT.get(arg, None)


PRESETS_RTMP_OUTPUT = {
    "preset-rtmp-generic": ["-c", "copy", "-f", "flv"],
    "preset-rtmp-mjpeg": ["-c:v", "libx264", "-an", "-f", "flv"],
    "preset-rtmp-jpeg": ["-c:v", "libx264", "-an", "-f", "flv"],
    "preset-rtmp-ubiquiti": [
        "-c:v",
        "copy",
        "-f",
        "flv",
        "-ar",
        "44100",
        "-c:a",
        "aac",
    ],
}


def parse_preset_output_rtmp(arg: Any) -> list[str]:
    """Return the correct preset if in preset format otherwise return None."""
    if not isinstance(arg, str):
        return None

    return PRESETS_RTMP_OUTPUT.get(arg, None)
