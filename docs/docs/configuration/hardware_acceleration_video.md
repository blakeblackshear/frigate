---
id: hardware_acceleration_video
title: Video Decoding
---

import CommunityBadge from '@site/src/components/CommunityBadge';
import ConfigTabs from "@site/src/components/ConfigTabs";
import TabItem from "@theme/TabItem";
import NavPath from "@site/src/components/NavPath";

# Video Decoding

It is highly recommended to use an integrated or discrete GPU for hardware acceleration video decoding in Frigate.

Some types of hardware acceleration are detected and used automatically, but you may need to update your configuration to enable hardware accelerated decoding in ffmpeg. To verify that hardware acceleration is working:

- Check the logs: A message will either say that hardware acceleration was automatically detected, or there will be a warning that no hardware acceleration was automatically detected
- If hardware acceleration is specified in the config, verification can be done by ensuring the logs are free from errors. There is no CPU fallback for hardware acceleration.

:::info

Frigate supports presets for optimal hardware accelerated video decoding:

**AMD**

- [AMD](#amd-based-cpus): Frigate can utilize modern AMD integrated GPUs and AMD discrete GPUs to accelerate video decoding.

**Intel**

- [Intel](#intel-based-cpus): Frigate can utilize most Intel integrated GPUs and Arc GPUs to accelerate video decoding.

**Nvidia GPU**

- [Nvidia GPU](#nvidia-gpus): Frigate can utilize most modern Nvidia GPUs to accelerate video decoding.

**Raspberry Pi 3/4**

- [Raspberry Pi](#raspberry-pi-34): Frigate can utilize the media engine in the Raspberry Pi 3 and 4 to slightly accelerate video decoding.

**Nvidia Jetson** <CommunityBadge />

- [Jetson](#nvidia-jetson): Frigate can utilize the media engine in Jetson hardware to accelerate video decoding.

**Rockchip** <CommunityBadge />

- [RKNN](#rockchip-platform): Frigate can utilize the media engine in RockChip SOCs to accelerate video decoding.

**Other Hardware**

Depending on your system, these presets may not be compatible, and you may need to use manual hwaccel args to take advantage of your hardware. More information on hardware accelerated decoding for ffmpeg can be found here: https://trac.ffmpeg.org/wiki/HWAccelIntro

:::

## Intel-based CPUs

Frigate can utilize most Intel integrated GPUs and Arc GPUs to accelerate video decoding.

:::info

**Recommended hwaccel Preset**

| CPU Generation     | Intel Driver | Recommended Preset  | Notes                                       |
| ------------------ | ------------ | ------------------- | ------------------------------------------- |
| gen1 - gen5        | i965         | preset-vaapi        | qsv is not supported, may not support H.265 |
| gen6 - gen7        | iHD          | preset-vaapi        | qsv is not supported                        |
| gen8 - gen12       | iHD          | preset-vaapi        | preset-intel-qsv-\* can also be used        |
| gen13+             | iHD / Xe     | preset-intel-qsv-\* |                                             |
| Intel Arc A-series | iHD / Xe     | preset-intel-qsv-\* |                                             |
| Intel Arc B-series | iHD / Xe     | preset-intel-qsv-\* | Requires host kernel 6.12+                  |

:::

:::note

The default driver is `iHD`. You may need to change the driver to `i965` by adding the following environment variable `LIBVA_DRIVER_NAME=i965` to your docker-compose file or [in the `config.yml` for HA App users](advanced.md#environment_vars).

See [The Intel Docs](https://www.intel.com/content/www/us/en/support/articles/000005505/processors.html) to figure out what generation your CPU is.

:::

### Via VAAPI

VAAPI supports automatic profile selection so it will work automatically with both H.264 and H.265 streams.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Global configuration > FFmpeg" /> and set **Hardware acceleration arguments** to `VAAPI (Intel/AMD GPU)`. For per-camera overrides, navigate to <NavPath path="Settings > Camera configuration > FFmpeg" />.

</TabItem>
<TabItem value="yaml">

```yaml
ffmpeg:
  hwaccel_args: preset-vaapi
```

</TabItem>
</ConfigTabs>

### Via Quicksync

#### H.264 streams

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Global configuration > FFmpeg" /> and set **Hardware acceleration arguments** to `Intel QuickSync (H.264)`. For per-camera overrides, navigate to <NavPath path="Settings > Camera configuration > FFmpeg" />.

</TabItem>
<TabItem value="yaml">

```yaml
ffmpeg:
  hwaccel_args: preset-intel-qsv-h264
```

</TabItem>
</ConfigTabs>

#### H.265 streams

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Global configuration > FFmpeg" /> and set **Hardware acceleration arguments** to `Intel QuickSync (H.265)`. For per-camera overrides, navigate to <NavPath path="Settings > Camera configuration > FFmpeg" />.

</TabItem>
<TabItem value="yaml">

```yaml
ffmpeg:
  hwaccel_args: preset-intel-qsv-h265
```

</TabItem>
</ConfigTabs>

### Configuring Intel GPU Stats

Frigate reads Intel GPU utilization directly from the kernel's per-client DRM usage counters exposed at `/proc/<pid>/fdinfo/<fd>`. This requires:

- Linux kernel **5.19 or newer** for the `i915` driver, or any release of the `xe` driver.
- Frigate running with permission to read other processes' fdinfo. Running as root inside the container (the default) satisfies this; non-root setups may need `CAP_SYS_PTRACE`.

No `intel_gpu_top` binary, `CAP_PERFMON`, privileged mode, or `perf_event_paranoid` tuning is required.

#### Stats for SR-IOV or specific devices

If the host has more than one Intel GPU (e.g. an iGPU plus a discrete GPU, or SR-IOV virtual functions), pin stats collection to a specific device by setting `intel_gpu_device` to either its PCI bus address or a DRM card/render-node path:

```yaml
telemetry:
  stats:
    intel_gpu_device: "0000:00:02.0"
```

```yaml
telemetry:
  stats:
    intel_gpu_device: "/dev/dri/card1"
```

When passing a device path, make sure the device is also passed through to the container.

## AMD-based CPUs

Frigate can utilize modern AMD integrated GPUs and AMD GPUs to accelerate video decoding using VAAPI.

### Configuring Radeon Driver

You need to change the driver to `radeonsi` by adding the following environment variable `LIBVA_DRIVER_NAME=radeonsi` to your docker-compose file or [in the `config.yml` for HA App users](advanced.md#environment_vars).

### Via VAAPI

VAAPI supports automatic profile selection so it will work automatically with both H.264 and H.265 streams.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Global configuration > FFmpeg" /> and set **Hardware acceleration arguments** to `VAAPI (Intel/AMD GPU)`. For per-camera overrides, navigate to <NavPath path="Settings > Camera configuration > FFmpeg" />.

</TabItem>
<TabItem value="yaml">

```yaml
ffmpeg:
  hwaccel_args: preset-vaapi
```

</TabItem>
</ConfigTabs>

## NVIDIA GPUs

While older GPUs may work, it is recommended to use modern, supported GPUs. NVIDIA provides a [matrix of supported GPUs and features](https://developer.nvidia.com/video-encode-and-decode-gpu-support-matrix-new). If your card is on the list and supports CUVID/NVDEC, it will most likely work with Frigate for decoding. However, you must also use [a driver version that will work with FFmpeg](https://github.com/FFmpeg/nv-codec-headers/blob/master/README). Older driver versions may be missing symbols and fail to work, and older cards are not supported by newer driver versions. The only way around this is to [provide your own FFmpeg](/configuration/advanced#custom-ffmpeg-build) that will work with your driver version, but this is unsupported and may not work well if at all.

A more complete list of cards and their compatible drivers is available in the [driver release readme](https://download.nvidia.com/XFree86/Linux-x86_64/525.85.05/README/supportedchips.html).

If your distribution does not offer NVIDIA driver packages, you can [download them here](https://www.nvidia.com/en-us/drivers/unix/).

### Configuring Nvidia GPUs in Docker

Additional configuration is needed for the Docker container to be able to access the NVIDIA GPU. The supported method for this is to install the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html#docker) and specify the GPU to Docker. How you do this depends on how Docker is being run:

#### Docker Compose - Nvidia GPU

```yaml {5-12}
services:
  frigate:
    ...
    image: ghcr.io/blakeblackshear/frigate:stable-tensorrt
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

```bash {4}
docker run -d \
  --name frigate \
  ...
  --gpus=all \
  ghcr.io/blakeblackshear/frigate:stable-tensorrt
```

### Setup Decoder

Using `preset-nvidia` ffmpeg will automatically select the necessary profile for the incoming video, and will log an error if the profile is not supported by your GPU.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Global configuration > FFmpeg" /> and set **Hardware acceleration arguments** to `NVIDIA GPU`. For per-camera overrides, navigate to <NavPath path="Settings > Camera configuration > FFmpeg" />.

</TabItem>
<TabItem value="yaml">

```yaml
ffmpeg:
  hwaccel_args: preset-nvidia
```

</TabItem>
</ConfigTabs>

If everything is working correctly, you should see a significant improvement in performance.
Verify that hardware decoding is working by running `nvidia-smi`, which should show `ffmpeg`
processes:

:::note

`nvidia-smi` will not show `ffmpeg` processes when run inside the container [due to docker limitations](https://github.com/NVIDIA/nvidia-docker/issues/179#issuecomment-645579458).

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

## Raspberry Pi 3/4

Ensure you increase the allocated RAM for your GPU to at least 128 (`raspi-config` > Performance Options > GPU Memory).
If you are using the HA App, you may need to use the full access variant and turn off _Protection mode_ for hardware acceleration.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Global configuration > FFmpeg" /> and set **Hardware acceleration arguments** to `Raspberry Pi (H.264)` (for H.264 streams) or `Raspberry Pi (H.265)` (for H.265/HEVC streams). For per-camera overrides, navigate to <NavPath path="Settings > Camera configuration > FFmpeg" />.

</TabItem>
<TabItem value="yaml">

```yaml
# if you want to decode a h264 stream
ffmpeg:
  hwaccel_args: preset-rpi-64-h264

# if you want to decode a h265 (hevc) stream
ffmpeg:
  hwaccel_args: preset-rpi-64-h265
```

</TabItem>
</ConfigTabs>

:::note

If running Frigate through Docker, you either need to run in privileged mode or
map the `/dev/video*` devices to Frigate. With Docker Compose add:

```yaml {4-5}
services:
  frigate:
    ...
    devices:
      - /dev/video11:/dev/video11
```

Or with `docker run`:

```bash {4}
docker run -d \
  --name frigate \
  ...
  --device /dev/video11 \
  ghcr.io/blakeblackshear/frigate:stable
```

`/dev/video11` is the correct device (on Raspberry Pi 4B). You can check
by running the following and looking for `H264`:

```bash
for d in /dev/video*; do
  echo -e "---\n$d"
  v4l2-ctl --list-formats-ext -d $d
done
```

Or map in all the `/dev/video*` devices.

:::

# Community Supported

## NVIDIA Jetson

A separate set of docker images is available for Jetson devices. They come with an `ffmpeg` build with codecs that use the Jetson's dedicated media engine. If your Jetson host is running Jetpack 6.0+ use the `stable-tensorrt-jp6` tagged image. Note that the Orin Nano has no video encoder, so frigate will use software encoding on this platform, but the image will still allow hardware decoding and tensorrt object detection.

You will need to use the image with the nvidia container runtime:

### Docker Run CLI - Jetson

```bash {3}
docker run -d \
  ...
  --runtime nvidia
  ghcr.io/blakeblackshear/frigate:stable-tensorrt-jp6
```

### Docker Compose - Jetson

```yaml {5}
services:
  frigate:
    ...
    image: ghcr.io/blakeblackshear/frigate:stable-tensorrt-jp6
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

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Global configuration > FFmpeg" /> and set **Hardware acceleration arguments** to `NVIDIA Jetson (H.264)` (or `NVIDIA Jetson (H.265)` for HEVC streams). For per-camera overrides, navigate to <NavPath path="Settings > Camera configuration > FFmpeg" />.

</TabItem>
<TabItem value="yaml">

```yaml
ffmpeg:
  hwaccel_args: preset-jetson-h264
```

</TabItem>
</ConfigTabs>

If everything is working correctly, you should see a significant reduction in ffmpeg CPU load and power consumption.
Verify that hardware decoding is working by running `jtop` (`sudo pip3 install -U jetson-stats`), which should show
that NVDEC/NVDEC1 are in use.

## Rockchip platform

Hardware accelerated video de-/encoding is supported on all Rockchip SoCs using [Nyanmisaka's FFmpeg 6.1 Fork](https://github.com/nyanmisaka/ffmpeg-rockchip) based on [Rockchip's mpp library](https://github.com/rockchip-linux/mpp).

### Prerequisites

Make sure to follow the [Rockchip specific installation instructions](/frigate/installation#rockchip-platform).

### Configuration

Set the FFmpeg hwaccel preset to enable hardware video processing.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Global configuration > FFmpeg" /> and set **Hardware acceleration arguments** to `Rockchip RKMPP`. For per-camera overrides, navigate to <NavPath path="Settings > Camera configuration > FFmpeg" />.

</TabItem>
<TabItem value="yaml">

```yaml
ffmpeg:
  hwaccel_args: preset-rkmpp
```

</TabItem>
</ConfigTabs>

:::note

Make sure that your SoC supports hardware acceleration for your input stream. For example, if your camera streams with h265 encoding and a 4k resolution, your SoC must be able to de- and encode h265 with a 4k resolution or higher. If you are unsure whether your SoC meets the requirements, take a look at the datasheet.

:::

:::warning

If one or more of your cameras are not properly processed and this error is shown in the logs:

```
[segment @ 0xaaaaff694790] Timestamps are unset in a packet for stream 0. This is deprecated and will stop working in the future. Fix your code to set the timestamps properly
[Parsed_scale_rkrga_0 @ 0xaaaaff819070] No hw context provided on input
[Parsed_scale_rkrga_0 @ 0xaaaaff819070] Failed to configure output pad on Parsed_scale_rkrga_0
Error initializing filters!
Error marking filters as finished
[out#1/rawvideo @ 0xaaaaff3d8730] Nothing was written into output file, because at least one of its streams received no packets.
Restarting ffmpeg...
```

you should try to uprade to FFmpeg 7. This can be done using this config option:

```yaml
ffmpeg:
  path: "7.0"
```

You can set this option globally to use FFmpeg 7 for all cameras or on camera level to use it only for specific cameras. Do not confuse this option with:

```yaml
cameras:
  name:
    ffmpeg:
      inputs:
        - path: rtsp://viewer:{FRIGATE_RTSP_PASSWORD}@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
```

:::

## Synaptics

Hardware accelerated video de-/encoding is supported on Synpatics SL-series SoC.

### Prerequisites

Make sure to follow the [Synaptics specific installation instructions](/frigate/installation#synaptics).

### Configuration

Set the FFmpeg hwaccel args to enable hardware video processing.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Global configuration > FFmpeg" /> and configure the hardware acceleration args and input args manually for Synaptics hardware. For per-camera overrides, navigate to <NavPath path="Settings > Camera configuration > FFmpeg" />.

</TabItem>
<TabItem value="yaml">

```yaml {2}
ffmpeg:
  hwaccel_args: -c:v h264_v4l2m2m
  input_args: preset-rtsp-restream
output_args:
  record: preset-record-generic-audio-aac
```

</TabItem>
</ConfigTabs>

:::warning

Make sure that your SoC supports hardware acceleration for your input stream and your input stream is h264 encoding. For example, if your camera streams with h264 encoding, your SoC must be able to de- and encode with it. If you are unsure whether your SoC meets the requirements, take a look at the datasheet.

:::
