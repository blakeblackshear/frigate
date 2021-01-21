---
id: optimizing
title: Optimizing performance
---

- **Google Coral**: It is strongly recommended to use a Google Coral, but Frigate will fall back to CPU in the event one is not found. Offloading TensorFlow to the Google Coral is an order of magnitude faster and will reduce your CPU load dramatically. A $60 device will outperform $2000 CPU. Frigate should work with any supported Coral device from https://coral.ai
- **Resolution**: For the `detect` input, choose a camera resolution where the smallest object you want to detect barely fits inside a 300x300px square. The model used by Frigate is trained on 300x300px images, so you will get worse performance and no improvement in accuracy by using a larger resolution since Frigate resizes the area where it is looking for objects to 300x300 anyway.
- **FPS**: 5 frames per second should be adequate. Higher frame rates will require more CPU usage without improving detections or accuracy. Reducing the frame rate on your camera will have the greatest improvement on system resources.
- **Hardware Acceleration**: Make sure you configure the `hwaccel_args` for your hardware. They provide a significant reduction in CPU usage if they are available.
- **Masks**: Masks can be used to ignore motion and reduce your idle CPU load. If you have areas with regular motion such as timestamps or trees blowing in the wind, frigate will constantly try to determine if that motion is from a person or other object you are tracking. Those detections not only increase your average CPU usage, but also clog the pipeline for detecting objects elsewhere. If you are experiencing high values for `detection_fps` when no objects of interest are in the cameras, you should use masks to tell frigate to ignore movement from trees, bushes, timestamps, or any part of the image where detections should not be wasted looking for objects.

### FFmpeg Hardware Acceleration

Frigate works on Raspberry Pi 3b/4 and x86 machines. It is recommended to update your configuration to enable hardware accelerated decoding in ffmpeg. Depending on your system, these parameters may not be compatible.

Raspberry Pi 3/4 (32-bit OS)
**NOTICE**: If you are using the addon, ensure you turn off `Protection mode` for hardware acceleration.

```yaml
ffmpeg:
  hwaccel_args:
    - -c:v
    - h264_mmal
```

Raspberry Pi 3/4 (64-bit OS)
**NOTICE**: If you are using the addon, ensure you turn off `Protection mode` for hardware acceleration.

```yaml
ffmpeg:
  hwaccel_args:
    - -c:v
    - h264_v4l2m2m
```

Intel-based CPUs (<10th Generation) via Quicksync (https://trac.ffmpeg.org/wiki/Hardware/QuickSync)

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

Intel-based CPUs (>=10th Generation) via Quicksync (https://trac.ffmpeg.org/wiki/Hardware/QuickSync)

```yaml
ffmpeg:
  hwaccel_args:
    - -hwaccel
    - qsv
    - -qsv_device
    - /dev/dri/renderD128
```

AMD/ATI GPUs (Radeon HD 2000 and newer GPUs) via libva-mesa-driver (https://trac.ffmpeg.org/wiki/Hardware/QuickSync)
**Note:** You also need to set `LIBVA_DRIVER_NAME=radeonsi` as an environment variable on the container.

```yaml
ffmpeg:
  hwaccel_args:
    - -hwaccel
    - vaapi
    - -hwaccel_device
    - /dev/dri/renderD128
```

Nvidia GPU based decoding via NVDEC is supported, but requires special configuration. See the [nvidia NVDEC documentation](/configuration/nvdec) for more details.
