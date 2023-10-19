---
id: hardware_acceleration
title: Hardware Acceleration
---

It is recommended to update your configuration to enable hardware accelerated decoding in ffmpeg. Depending on your system, these parameters may not be compatible. More information on hardware accelerated decoding for ffmpeg can be found here: https://trac.ffmpeg.org/wiki/HWAccelIntro

# Officially Supported

## Raspberry Pi 3/4

Ensure you increase the allocated RAM for your GPU to at least 128 (raspi-config > Performance Options > GPU Memory).
**NOTICE**: If you are using the addon, you may need to turn off `Protection mode` for hardware acceleration.

```yaml
ffmpeg:
  hwaccel_args: preset-rpi-64-h264
```

:::note

If running Frigate in docker, you either need to run in priviliged mode or be sure to map the /dev/video1x devices to Frigate

```yaml
docker run -d \
  --name frigate \
  ...
  --device /dev/video10 \
  ghcr.io/blakeblackshear/frigate:stable
```

:::

## Intel-based CPUs

### Via VAAPI

VAAPI supports automatic profile selection so it will work automatically with both H.264 and H.265 streams. VAAPI is recommended for all generations of Intel-based CPUs if QSV does not work.

```yaml
ffmpeg:
  hwaccel_args: preset-vaapi
```

**NOTICE**: With some of the processors, like the J4125, the default driver `iHD` doesn't seem to work correctly for hardware acceleration. You may need to change the driver to `i965` by adding the following environment variable `LIBVA_DRIVER_NAME=i965` to your docker-compose file or [in the `frigate.yaml` for HA OS users](advanced.md#environment_vars).

### Via Quicksync (>=10th Generation only)

QSV must be set specifically based on the video encoding of the stream.

#### H.264 streams

```yaml
ffmpeg:
  hwaccel_args: preset-intel-qsv-h264
```

#### H.265 streams

```yaml
ffmpeg:
  hwaccel_args: preset-intel-qsv-h265
```

### Configuring Intel GPU Stats in Docker

Additional configuration is needed for the Docker container to be able to access the `intel_gpu_top` command for GPU stats. There are two options:

1. Run the container as privileged.
2. Add the `CAP_PERFMON` capability (note: you might need to set the `perf_event_paranoid` low enough to allow access to the performance event system.)

#### Run as privileged

This method works, but it gives more permissions to the container than are actually needed.

##### Docker Compose - Privileged

```yaml
services:
  frigate:
    ...
    image: ghcr.io/blakeblackshear/frigate:stable
    privileged: true
```

##### Docker Run CLI - Privileged

```bash
docker run -d \
  --name frigate \
  ...
  --privileged \
  ghcr.io/blakeblackshear/frigate:stable
```

#### CAP_PERFMON

Only recent versions of Docker support the `CAP_PERFMON` capability. You can test to see if yours supports it by running: `docker run --cap-add=CAP_PERFMON hello-world`

##### Docker Compose - CAP_PERFMON

```yaml
services:
  frigate:
    ...
    image: ghcr.io/blakeblackshear/frigate:stable
    cap_add:
      - CAP_PERFMON
```

##### Docker Run CLI - CAP_PERFMON

```bash
docker run -d \
  --name frigate \
  ...
  --cap-add=CAP_PERFMON \
  ghcr.io/blakeblackshear/frigate:stable
```

#### perf_event_paranoid

_Note: This setting must be changed for the entire system._

For more information on the various values across different distributions, see https://askubuntu.com/questions/1400874/what-does-perf-paranoia-level-four-do.

Depending on your OS and kernel configuration, you may need to change the `/proc/sys/kernel/perf_event_paranoid` kernel tunable. You can test the change by running `sudo sh -c 'echo 2 >/proc/sys/kernel/perf_event_paranoid'` which will persist until a reboot. Make it permanent by running `sudo sh -c 'echo kernel.perf_event_paranoid=2 >> /etc/sysctl.d/local.conf'`

## AMD/ATI GPUs (Radeon HD 2000 and newer GPUs) via libva-mesa-driver

VAAPI supports automatic profile selection so it will work automatically with both H.264 and H.265 streams.

**Note:** You also need to set `LIBVA_DRIVER_NAME=radeonsi` as an environment variable on the container.

```yaml
ffmpeg:
  hwaccel_args: preset-vaapi
```

## NVIDIA GPUs

While older GPUs may work, it is recommended to use modern, supported GPUs. NVIDIA provides a [matrix of supported GPUs and features](https://developer.nvidia.com/video-encode-and-decode-gpu-support-matrix-new). If your card is on the list and supports CUVID/NVDEC, it will most likely work with Frigate for decoding. However, you must also use [a driver version that will work with FFmpeg](https://github.com/FFmpeg/nv-codec-headers/blob/master/README). Older driver versions may be missing symbols and fail to work, and older cards are not supported by newer driver versions. The only way around this is to [provide your own FFmpeg](/configuration/advanced#custom-ffmpeg-build) that will work with your driver version, but this is unsupported and may not work well if at all.

A more complete list of cards and their compatible drivers is available in the [driver release readme](https://download.nvidia.com/XFree86/Linux-x86_64/525.85.05/README/supportedchips.html).

If your distribution does not offer NVIDIA driver packages, you can [download them here](https://www.nvidia.com/en-us/drivers/unix/).

### Configuring Nvidia GPUs in Docker

Additional configuration is needed for the Docker container to be able to access the NVIDIA GPU. The supported method for this is to install the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html#docker) and specify the GPU to Docker. How you do this depends on how Docker is being run:

#### Docker Compose - Nvidia GPU

```yaml
services:
  frigate:
    ...
    image: ghcr.io/blakeblackshear/frigate:stable
    deploy:    # <------------- Add this section
      resources:
        reservations:
          devices:
            - driver: nvidia
              device_ids: ['0'] # this is only needed when using multiple GPUs
              count: 1 # number of GPUs
              capabilities: [gpu]
```

#### Docker Run CLI - Nvidia GPU

```bash
docker run -d \
  --name frigate \
  ...
  --gpus=all \
  ghcr.io/blakeblackshear/frigate:stable
```

### Setup Decoder

The decoder you need to pass in the `hwaccel_args` will depend on the input video.

A list of supported codecs (you can use `ffmpeg -decoders | grep cuvid` in the container to get the ones your card supports)

```
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

For example, for H264 video, you'll select `preset-nvidia-h264`.

```yaml
ffmpeg:
  hwaccel_args: preset-nvidia-h264
```

If everything is working correctly, you should see a significant improvement in performance.
Verify that hardware decoding is working by running `nvidia-smi`, which should show `ffmpeg`
processes:

:::note

`nvidia-smi` may not show `ffmpeg` processes when run inside the container [due to docker limitations](https://github.com/NVIDIA/nvidia-docker/issues/179#issuecomment-645579458).

:::

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

If you do not see these processes, check the `docker logs` for the container and look for decoding errors.

These instructions were originally based on the [Jellyfin documentation](https://jellyfin.org/docs/general/administration/hardware-acceleration.html#nvidia-hardware-acceleration-on-docker-linux).

# Community Supported

## NVIDIA Jetson (Orin AGX, Orin NX, Orin Nano*, Xavier AGX, Xavier NX, TX2, TX1, Nano)

A separate set of docker images is available that is based on Jetpack/L4T. They comes with an `ffmpeg` build
with codecs that use the Jetson's dedicated media engine. If your Jetson host is running Jetpack 4.6, use the
`frigate-tensorrt-jp4` image, or if your Jetson host is running Jetpack 5.0+, use the `frigate-tensorrt-jp5`
image. Note that the Orin Nano has no video encoder, so frigate will use software encoding on this platform,
but the image will still allow hardware decoding and tensorrt object detection.

You will need to use the image with the nvidia container runtime:

### Docker Run CLI - Jetson

```bash
docker run -d \
  ...
  --runtime nvidia
  ghcr.io/blakeblackshear/frigate-tensorrt-jp5
```

### Docker Compose - Jetson

```yaml
version: '2.4'
services:
  frigate:
    ...
    image: ghcr.io/blakeblackshear/frigate-tensorrt-jp5
    runtime: nvidia   # Add this
```

:::note

The `runtime:` tag is not supported on older versions of docker-compose. If you run into this, you can instead use the nvidia runtime system-wide by adding `"default-runtime": "nvidia"` to `/etc/docker/daemon.json`:

```
{
    "runtimes": {
        "nvidia": {
            "path": "nvidia-container-runtime",
            "runtimeArgs": []
        }
    },
    "default-runtime": "nvidia"
}
```

:::

### Setup Decoder

The decoder you need to pass in the `hwaccel_args` will depend on the input video.

A list of supported codecs (you can use `ffmpeg -decoders | grep nvmpi` in the container to get the ones your card supports)

```
 V..... h264_nvmpi           h264 (nvmpi) (codec h264)
 V..... hevc_nvmpi           hevc (nvmpi) (codec hevc)
 V..... mpeg2_nvmpi          mpeg2 (nvmpi) (codec mpeg2video)
 V..... mpeg4_nvmpi          mpeg4 (nvmpi) (codec mpeg4)
 V..... vp8_nvmpi            vp8 (nvmpi) (codec vp8)
 V..... vp9_nvmpi            vp9 (nvmpi) (codec vp9)
```

For example, for H264 video, you'll select `preset-jetson-h264`.

```yaml
ffmpeg:
  hwaccel_args: preset-jetson-h264
```

If everything is working correctly, you should see a significant reduction in ffmpeg CPU load and power consumption.
Verify that hardware decoding is working by running `jtop` (`sudo pip3 install -U jetson-stats`), which should show
that NVDEC/NVDEC1 are in use.
