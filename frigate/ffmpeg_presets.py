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
    "preset-vaapi": [
        "-hwaccel_flags",
        "allow_profile_mismatch",
        "-hwaccel",
        "vaapi",
        "-hwaccel_device",
        "/dev/dri/renderD128",
        "-hwaccel_output_format",
        "vaapi",
    ],
    "preset-intel-qsv-h264": [
        "-hwaccel",
        "qsv",
        "-qsv_device",
        "/dev/dri/renderD128",
        "-hwaccel_output_format",
        "qsv",
        "-c:v",
        "h264_qsv",
    ],
    "preset-intel-qsv-h265": [
        "-hwaccel",
        "qsv",
        "-qsv_device",
        "/dev/dri/renderD128",
        "-hwaccel_output_format",
        "qsv",
        "-c:v",
        "hevc_qsv",
    ],
    "preset-nvidia-h264": [
        "-hwaccel",
        "cuda",
        "-hwaccel_output_format",
        "cuda",
        "-extra_hw_frames",
        "2",
        "-c:v",
        "h264_cuvid",
    ],
    "preset-nvidia-h265": [
        "-hwaccel",
        "cuda",
        "-hwaccel_output_format",
        "cuda",
        "-extra_hw_frames",
        "2",
        "-c:v",
        "hevc_cuvid",
    ],
    "preset-nvidia-mjpeg": [
        "-hwaccel",
        "cuda",
        "-hwaccel_output_format",
        "cuda",
        "-extra_hw_frames",
        "2",
        "-c:v",
        "mjpeg_cuvid",
    ],
}

PRESETS_HW_ACCEL_SCALE = {
    "preset-vaapi": [
        "-vf",
        "fps={},scale_vaapi=w={}:h={},hwdownload,format=yuv420p",
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

PRESETS_HW_ACCEL_ENCODE = {
    "preset-intel-qsv-h264": "ffmpeg -hide_banner {0} -c:v h264_qsv -g 50 -bf 0 -profile:v high -level:v 4.1 -async_depth:v 1 {1}",
    "preset-intel-qsv-h265": "ffmpeg -hide_banner {0} -c:v h264_qsv -g 50 -bf 0 -profile:v high -level:v 4.1 -async_depth:v 1 {1}",
    "preset-nvidia-h264": "ffmpeg -hide_banner {0} -c:v h264_nvenc -g 50 -profile:v high -level:v auto -preset:v p2 -tune:v ll {1}",
    "preset-nvidia-h265": "ffmpeg -hide_banner {0} -c:v h264_nvenc -g 50 -profile:v high -level:v auto -preset:v p2 -tune:v ll {1}",
    "default": "ffmpeg -hide_banner {0} -c:v libx264 -g 50 -profile:v high -level:v 4.1 -preset:v superfast -tune:v zerolatency {1}",
}


def parse_preset_hardware_acceleration_decode(arg: Any) -> list[str]:
    """Return the correct preset if in preset format otherwise return None."""
    if not isinstance(arg, str):
        return None

    return PRESETS_HW_ACCEL_DECODE.get(arg, None)


def parse_preset_hardware_acceleration_scale(
    arg: Any,
    detect_args: list[str],
    fps: int,
    width: int,
    height: int,
) -> list[str]:
    """Return the correct scaling preset or default preset if none is set."""
    if not isinstance(arg, str) or " " in arg:
        scale = PRESETS_HW_ACCEL_SCALE["default"].copy()
        scale[1] = str(fps)
        scale[3] = f"{width}x{height}"
        scale.extend(detect_args)
        return scale

    scale = PRESETS_HW_ACCEL_SCALE.get(arg, PRESETS_HW_ACCEL_SCALE["default"]).copy()
    scale[1] = scale[1].format(fps, width, height)
    return scale


def parse_preset_hardware_acceleration_encode(arg: Any, input: str, output: str) -> str:
    """Return the correct scaling preset or default preset if none is set."""
    if not isinstance(arg, str):
        return PRESETS_HW_ACCEL_ENCODE["default"].format(input, output)

    return PRESETS_HW_ACCEL_ENCODE.get(arg, PRESETS_HW_ACCEL_ENCODE["default"]).format(
        input,
        output,
    )


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
        input = PRESETS_INPUT[arg].copy()
        input[1] = str(detect_fps)
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
