"""Handles inserting and maintaining ffmpeg presets."""

PRESETS_HW_ACCEL = {
    "preset-rpi-32": "-c:v h264_v4l2m2m",
    "preset-rpi-64": "-c:v h264_v4l2m2m",
    "preset-intel-vaapi": "-hwaccel vaapi -hwaccel_device /dev/dri/renderD128 -hwaccel_output_format yuv420p",
    "preset-intel-qsv-h264": "-c:v h264_qsv",
    "preset-intel-qsv-h265": "-c:v hevc_qsv",
    "preset-amd-vaapi": "-hwaccel vaapi -hwaccel_device /dev/dri/renderD128 -hwaccel_output_format yuv420p",
    "preset-nvidia-h264": "-c:v h264_cuvid",
    "preset-nvidia-h265": "-c:v hevc_cuvid",
}