---
id: hardware_acceleration
title: Hardware Acceleration
---

It is recommended to update your configuration to enable hardware accelerated decoding in ffmpeg. Depending on your system, these parameters may not be compatible. More information on hardware accelerated decoding for ffmpeg can be found here: https://trac.ffmpeg.org/wiki/HWAccelIntro

### Raspberry Pi 3/4

Ensure you increase the allocated RAM for your GPU to at least 128 (raspi-config > Performance Options > GPU Memory).
**NOTICE**: If you are using the addon, you may need to turn off `Protection mode` for hardware acceleration.

```yaml
ffmpeg:
  hwaccel_args: -c:v h264_v4l2m2m
```

### Intel-based CPUs with QuickSync

Intel CPUs with build in graphics (non-F variants) since 5th generation have at least h264 decoding support. Once you've configured it and restarted frigate, verify that it's working by running `intel_gpu_top` - if everything is set up correctly, you should see non-zero load on `Video` and/or `VideoEnhance`.

#### <10th Generation via `vaapi`

```yaml
ffmpeg:
  hwaccel_args: -hwaccel vaapi -hwaccel_device /dev/dri/renderD128 -hwaccel_output_format yuv420p
```
**NOTICE**: With some of the processors, like the J4125, the default driver `iHD` doesn't seem to work correctly for hardware acceleration. You may need to change the driver to `i965` by adding the following environment variable `LIBVA_DRIVER_NAME_JELLYFIN=i965` to your docker-compose file.   

### >=10th Generation via Quicksync

```yaml
ffmpeg:
  hwaccel_args: -c:v h264_qsv
```

### >=12th Generation via Quicksync

**Note:** You should use kernel 5.18 or newer for full support.

```yaml
ffmpeg:
  input_args:
    - -c:v
    - h264_qsv # Or h265_qsv depending on your camera's format
    - -gpu_copy
    - "on"
    ...
  hwaccel_args:
    - -hwaccel
    - qsv
    - -qsv_device
    - /dev/dri/renderD128
    - -hwaccel_output_format
    - qsv 
  output_args:
    # Converts from the format used on the GPU to the format expected by frigate.
    detect: -vf vpp_qsv=format=yuv420p -f rawvideo -pix_fmt yuv420p
```
Specifying `input_args` and `output_args` overrides frigate's defaults, so you may want to append whatever options your camera requires.

### AMD/ATI GPUs (Radeon HD 2000 and newer GPUs) via libva-mesa-driver

**Note:** You also need to set `LIBVA_DRIVER_NAME=radeonsi` as an environment variable on the container.

```yaml
ffmpeg:
  hwaccel_args: -hwaccel vaapi -hwaccel_device /dev/dri/renderD128 -hwaccel_output_format yuv420p
```

### NVIDIA GPU

These instructions are based on the [jellyfin documentation](https://jellyfin.org/docs/general/administration/hardware-acceleration.html#nvidia-hardware-acceleration-on-docker-linux)

Add `--gpus all` to your docker run command or update your compose file.

```yaml
services:
  frigate:
    ...
    image: blakeblackshear/frigate:stable
  deploy:    # <------------- Add this section
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

The decoder you need to pass in the `hwaccel_args` will depend on the input video.

A list of supported codecs (you can use `ffmpeg -decoders | grep cuvid` in the container to get a list)

```shell
 V..... h263_cuvid           Nvidia CUVID H263 decoder (codec h263)
 V..... h264_cuvid           Nvidia CUVID H264 decoder (codec h264)
 V..... hevc_cuvid           Nvidia CUVID HEVC decoder (codec hevc)
 V..... mjpeg_cuvid          Nvidia CUVID MJPEG decoder (codec mjpeg)
 V..... mpeg1_cuvid          Nvidia CUVID MPEG1VIDEO decoder (codec mpeg1video)
 V..... mpeg2_cuvid          Nvidia CUVID MPEG2VIDEO decoder (codec mpeg2video)
 V..... mpeg4_cuvid          Nvidia CUVID MPEG4 decoder (codec mpeg4)
 V..... vc1_cuvid            Nvidia CUVID VC1 decoder (codec vc1)
 V..... vp8_cuvid            Nvidia CUVID VP8 decoder (codec vp8)
 V..... vp9_cuvid            Nvidia CUVID VP9 decoder (codec vp9)
```

For example, for H264 video, you'll select `h264_cuvid`.

```yaml
ffmpeg:
  hwaccel_args: -c:v h264_cuvid
```

If everything is working correctly, you should see a significant improvement in performance.
Verify that hardware decoding is working by running `nvidia-smi`, which should show the ffmpeg
processes:

```
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 455.38       Driver Version: 455.38       CUDA Version: 11.1     |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|                               |                      |               MIG M. |
|===============================+======================+======================|
|   0  GeForce GTX 166...  Off  | 00000000:03:00.0 Off |                  N/A |
| 38%   41C    P2    36W / 125W |   2082MiB /  5942MiB |      5%      Default |
|                               |                      |                  N/A |
+-------------------------------+----------------------+----------------------+

+-----------------------------------------------------------------------------+
| Processes:                                                                  |
|  GPU   GI   CI        PID   Type   Process name                  GPU Memory |
|        ID   ID                                                   Usage      |
|=============================================================================|
|    0   N/A  N/A     12737      C   ffmpeg                            249MiB |
|    0   N/A  N/A     12751      C   ffmpeg                            249MiB |
|    0   N/A  N/A     12772      C   ffmpeg                            249MiB |
|    0   N/A  N/A     12775      C   ffmpeg                            249MiB |
|    0   N/A  N/A     12800      C   ffmpeg                            249MiB |
|    0   N/A  N/A     12811      C   ffmpeg                            417MiB |
|    0   N/A  N/A     12827      C   ffmpeg                            417MiB |
+-----------------------------------------------------------------------------+
```
