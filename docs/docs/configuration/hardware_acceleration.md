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
  hwaccel_args: preset-rpi-64-h264
```

### Orange Pi 5 ( ArmNN )

Ensure you have installed

```sh
ffmpeg/jammy,now 7:4.4.2-0ubuntu0.22.04.1+rkmpp20230207 arm64 [installed,upgradable to: 7:5.1.2-3]
libavcodec58/jammy,now 7:4.4.2-0ubuntu0.22.04.1+rkmpp20230207 arm64 [installed,automatic]
libavdevice58/jammy,now 7:4.4.2-0ubuntu0.22.04.1+rkmpp20230207 arm64 [installed,automatic]
libavfilter7/jammy,now 7:4.4.2-0ubuntu0.22.04.1+rkmpp20230207 arm64 [installed,automatic]
libavformat58/jammy,now 7:4.4.2-0ubuntu0.22.04.1+rkmpp20230207 arm64 [installed,automatic]
libavutil56/jammy,now 7:4.4.2-0ubuntu0.22.04.1+rkmpp20230207 arm64 [installed,automatic]
libpostproc55/jammy,now 7:4.4.2-0ubuntu0.22.04.1+rkmpp20230207 arm64 [installed,automatic]
librockchip-mpp1/jammy,now 1.5.0-1+git230210.c145c84~jammy1 arm64 [installed,automatic]
libswresample3/jammy,now 7:4.4.2-0ubuntu0.22.04.1+rkmpp20230207 arm64 [installed,automatic]
libswscale5/jammy,now 7:4.4.2-0ubuntu0.22.04.1+rkmpp20230207 arm64 [installed,automatic]
```
from https://github.com/orangepi-xunlong/rk-rootfs-build/tree/rk3588_packages_jammy

```yaml
ffmpeg:
  hwaccel_args: -hwaccel drm -hwaccel_device /dev/dri/renderD128 -c:v h264_rkmpp
```

Also, for the CPU and GPU accelleration you should use `armnn` detector on this board [see](detectors.md)

Install packages [see tutorials](https://github.com/ARM-software/armnn/blob/branches/armnn_23_02/InstallationViaAptRepository.md)

```sh
armnn-latest-all/jammy,now 23.02-1~ubuntu22.04 arm64 [installed]
armnn-latest-cpu-gpu-ref/jammy,now 23.02-1~ubuntu22.04 arm64 [installed]
armnn-latest-cpu-gpu/jammy,now 23.02-1~ubuntu22.04 arm64 [installed]
armnn-latest-cpu/jammy,now 23.02-1~ubuntu22.04 arm64 [installed]
armnn-latest-gpu/jammy,now 23.02-1~ubuntu22.04 arm64 [installed]
armnn-latest-ref/jammy,now 23.02-1~ubuntu22.04 arm64 [installed]
libarmnn-cpuacc-backend32/jammy,now 23.02-1~ubuntu22.04 arm64 [installed,automatic]
libarmnn-cpuref-backend32/jammy,now 23.02-1~ubuntu22.04 arm64 [installed,automatic]
libarmnn-gpuacc-backend32/jammy,now 23.02-1~ubuntu22.04 arm64 [installed,automatic]
libarmnn22/unstable,now 20.08-12 arm64 [installed,automatic]
libarmnn32/jammy,now 23.02-1~ubuntu22.04 arm64 [installed,automatic]
libarmnnaclcommon22/unstable,now 20.08-12 arm64 [installed]
libarmnnaclcommon32/jammy,now 23.02-1~ubuntu22.04 arm64 [installed,automatic]
libarmnntfliteparser24/jammy,now 23.02-1~ubuntu22.04 arm64 [installed,automatic]
```

In order for the GPU to work install packages

```sh
libmali-g610-x11/jammy,now 1.0.2.4 arm64 [installed]
libmali-valhall-g610-g6p0-x11-gbm/now 1.9-1 arm64 [installed,local]
```

for Ubuntu

```sh
apt install ocl-icd-opencl-dev
mkdir -p /etc/OpenCL/vendors/
dpkg -i libmali-valhall-g610-g6p0-x11_1.9-1_arm64.deb
```

`clinfo | grep 'Device Name'` should show you a full output of available data about Mali GPU

```sh
root@23cfa5ff7203:/opt/frigate# clinfo | grep 'Device Name'
  Device Name                                     Mali-LODX r0p0
    Device Name                                   Mali-LODX r0p0
    Device Name                                   Mali-LODX r0p0
    Device Name                                   Mali-LODX r0p0
```




### Intel-based CPUs (<10th Generation) via VAAPI

VAAPI supports automatic profile selection so it will work automatically with both H.264 and H.265 streams. VAAPI is recommended for all generations of Intel-based CPUs if QSV does not work.

```yaml
ffmpeg:
  hwaccel_args: preset-vaapi
```

**NOTICE**: With some of the processors, like the J4125, the default driver `iHD` doesn't seem to work correctly for hardware acceleration. You may need to change the driver to `i965` by adding the following environment variable `LIBVA_DRIVER_NAME=i965` to your docker-compose file or [in the frigate.yml for HA OS users](advanced.md#environment_vars).

### Intel-based CPUs (>=10th Generation) via Quicksync

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

### AMD/ATI GPUs (Radeon HD 2000 and newer GPUs) via libva-mesa-driver

VAAPI supports automatic profile selection so it will work automatically with both H.264 and H.265 streams.

**Note:** You also need to set `LIBVA_DRIVER_NAME=radeonsi` as an environment variable on the container.

```yaml
ffmpeg:
  hwaccel_args: preset-vaapi
```

### NVIDIA GPUs

While older GPUs may work, it is recommended to use modern, supported GPUs. NVIDIA provides a [matrix of supported GPUs and features](https://developer.nvidia.com/video-encode-and-decode-gpu-support-matrix-new). If your card is on the list and supports CUVID/NVDEC, it will most likely work with Frigate for decoding. However, you must also use [a driver version that will work with FFmpeg](https://github.com/FFmpeg/nv-codec-headers/blob/master/README). Older driver versions may be missing symbols and fail to work, and older cards are not supported by newer driver versions. The only way around this is to [provide your own FFmpeg](/configuration/advanced#custom-ffmpeg-build) that will work with your driver version, but this is unsupported and may not work well if at all.

A more complete list of cards and ther compatible drivers is available in the [driver release readme](https://download.nvidia.com/XFree86/Linux-x86_64/525.85.05/README/supportedchips.html).

If your distribution does not offer NVIDIA driver packages, you can [download them here](https://www.nvidia.com/en-us/drivers/unix/).

#### Docker Configuration

Additional configuration is needed for the Docker container to be able to access the NVIDIA GPU. The supported method for this is to install the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html#docker) and specify the GPU to Docker. How you do this depends on how Docker is being run:

##### Docker Compose

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

##### Docker Run CLI

```bash
docker run -d \
  --name frigate \
  ...
  --gpus=all \
  ghcr.io/blakeblackshear/frigate:stable
```

#### Setup Decoder

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
