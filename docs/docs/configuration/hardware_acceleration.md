---
id: hardware_acceleration
title: Hardware Acceleration
---

It is recommended to update your configuration to enable hardware accelerated decoding in ffmpeg. Depending on your system, these parameters may not be compatible. More information on hardware accelerated decoding for ffmpeg can be found here: https://trac.ffmpeg.org/wiki/HWAccelIntro

### Raspberry Pi 3/4 (32-bit OS)

Ensure you increase the allocated RAM for your GPU to at least 128 (raspi-config > Performance Options > GPU Memory).
**NOTICE**: If you are using the addon, you may need to turn off `Protection mode` for hardware acceleration.

```yaml
ffmpeg:
  hwaccel_args:
    - -c:v
    - h264_mmal
```

### Raspberry Pi 3/4 (64-bit OS)

**NOTICE**: If you are using the addon, you may need to turn off `Protection mode` for hardware acceleration.

```yaml
ffmpeg:
  hwaccel_args:
    - -c:v
    - h264_v4l2m2m
```

### Intel-based CPUs (<10th Generation) via Quicksync

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

### Intel-based CPUs (>=10th Generation) via Quicksync

```yaml
ffmpeg:
  hwaccel_args:
    - -hwaccel
    - qsv
    - -qsv_device
    - /dev/dri/renderD128
```

### AMD/ATI GPUs (Radeon HD 2000 and newer GPUs) via libva-mesa-driver

**Note:** You also need to set `LIBVA_DRIVER_NAME=radeonsi` as an environment variable on the container.

```yaml
ffmpeg:
  hwaccel_args:
    - -hwaccel
    - vaapi
    - -hwaccel_device
    - /dev/dri/renderD128
```

### NVIDIA GPU

NVIDIA GPU based decoding via NVDEC is supported, but requires special configuration. See the [NVIDIA NVDEC documentation](/configuration/nvdec) for more details.


### TensorRT on NVIDIA Jetson family devices

For the NVIDIA Jetson family devices, you might use both ffmpeg and gstreamer decoders. As of now, ffmpeg does not fully support NVDEC on the Jetson devices. As an alternative, you may use gstreamer with the `nvv4l2decoder` plugin to enable the NVDEC and NVENC features of Jetson devices.
See the See the [GStreamer documentation](/configuration/gstreamer) for more details.