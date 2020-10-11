# Hardware Acceleration for Decoding Video

FFmpeg is compiled to support hardware accelerated decoding of video streams.

## Intel-based CPUs via Quicksync (https://trac.ffmpeg.org/wiki/Hardware/QuickSync)
```yaml
ffmpeg:
  hwaccel_args:
    - -hwaccel
    - vaapi
    - -hwaccel_device
    - /dev/dri/renderD128
    - -hwaccel_output_format
    - yuv420p
```

## Raspberry Pi 3b and 4 (32bit OS)
Ensure you increase the allocated RAM for your GPU to at least 128 (raspi-config > Advanced Options > Memory Split)
```yaml
ffmpeg:
  hwaccel_args:
    - -c:v
    - h264_mmal
```

## Raspberry Pi 4 (64bit OS)
```yaml
ffmpeg:
  hwaccel_args:
    - -c:v
    - h264_v4l2m2m
```