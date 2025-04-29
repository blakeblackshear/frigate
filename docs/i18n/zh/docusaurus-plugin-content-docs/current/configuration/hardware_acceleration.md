---
id: hardware_acceleration
title: 硬件加速
---

# 硬件加速

强烈建议在Frigate中使用GPU进行硬件加速。某些类型的硬件加速会被自动检测并使用，但您可能需要更新配置以在ffmpeg中启用硬件加速解码。

根据您的系统，这些参数可能不兼容。更多关于ffmpeg硬件加速解码的信息请参考：https://trac.ffmpeg.org/wiki/HWAccelIntro

# 官方支持

## 树莓派3/4

确保为GPU分配至少128MB内存（通过`raspi-config` > 性能选项 > GPU内存设置）。
如果使用Home Assistant插件，可能需要使用完全访问版本并关闭"保护模式"以启用硬件加速。

```yaml
# 解码h264流
ffmpeg:
  hwaccel_args: preset-rpi-64-h264

# 解码h265(hevc)流  
ffmpeg:
  hwaccel_args: preset-rpi-64-h265
```

:::note

如果通过Docker运行Frigate，需要以特权模式运行或将`/dev/video*`设备映射到Frigate。使用Docker Compose添加：

```yaml
services:
  frigate:
    ...
    devices:
      - /dev/video11:/dev/video11
```

或使用`docker run`：

```bash
docker run -d \
  --name frigate \
  ...
  --device /dev/video11 \
  ghcr.io/blakeblackshear/frigate:stable
```

`/dev/video11`是正确的设备（树莓派4B）。可以通过以下命令检查：

```bash
for d in /dev/video*; do
  echo -e "---\n$d"
  v4l2-ctl --list-formats-ext -d $d
done
```

或者映射所有`/dev/video*`设备。

:::

## Intel显卡

:::info

**推荐硬件加速预设**

| CPU代数 | Intel驱动 | 推荐预设 | 说明 |
|---------|------------|----------|------|
| 1-7代   | i965       | preset-vaapi | 不支持qsv |
| 8-12代  | iHD        | preset-vaapi | 也可使用preset-intel-qsv-* |
| 13代+   | iHD/Xe     | preset-intel-qsv-* | |
| Intel Arc显卡 | iHD/Xe | preset-intel-qsv-* | |

:::

:::note

默认驱动是`iHD`。如需要改为i965驱动，可能需要通过添加环境变量`LIBVA_DRIVER_NAME=i965`（在docker-compose文件中或[HA插件的config.yml](advanced.md#环境变量)中）。

参考[Intel文档](https://www.intel.com/content/www/us/en/support/articles/000005505/processors.html)确认您的CPU是第几代的。

:::

### 通过VAAPI

VAAPI支持自动配置文件选择，可自动处理H.264和H.265流。

```yaml
ffmpeg:
  hwaccel_args: preset-vaapi
```

### 通过QuickSync

:::warning

部分用户反馈使用`preset-intel-qsv-*`可能无法正常启动Frigate，这种情况建议使用VAAPI

:::

#### H.264流

```yaml
ffmpeg:
  hwaccel_args: preset-intel-qsv-h264
```

#### H.265流

```yaml
ffmpeg:
  hwaccel_args: preset-intel-qsv-h265
```

### Docker中配置Intel GPU统计

需要额外配置才能使Docker容器访问`intel_gpu_top`命令获取GPU统计信息。有两种方法：

1. 以特权模式运行容器
2. 添加`CAP_PERFMON`能力（注意：可能需要降低`perf_event_paranoid`值）

#### 特权模式运行

这种方法有效但会赋予容器过多权限。

##### Docker Compose - 特权模式

```yaml
services:
  frigate:
    ...
    privileged: true
```

##### Docker Run CLI - 特权模式

```bash
docker run -d \
  --name frigate \
  ...
  --privileged \
  ghcr.io/blakeblackshear/frigate:stable
```

#### CAP_PERFMON

只有较新版本的Docker支持`CAP_PERFMON`能力。可通过运行测试：`docker run --cap-add=CAP_PERFMON hello-world`

##### Docker Compose - CAP_PERFMON

```yaml
services:
  frigate:
    ...
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

_注意：此设置需针对整个系统修改。_

关于不同发行版的值，参考：https://askubuntu.com/questions/1400874/what-does-perf-paranoia-level-four-do

临时修改（重启后失效）：
```bash
sudo sh -c 'echo 2 >/proc/sys/kernel/perf_event_paranoid'
```

永久修改：
```bash
sudo sh -c 'echo kernel.perf_event_paranoid=2 >> /etc/sysctl.d/local.conf'
```

#### SR-IOV设备统计

使用SR-IOV虚拟化GPU时，需要额外参数才能使GPU统计正常工作：

```yaml
telemetry:
  stats:
    sriov: True
```

## AMD/ATI显卡（Radeon HD 2000及更新）

VAAPI支持自动配置文件选择，可自动处理H.264和H.265流。

:::note

需要通过环境变量`LIBVA_DRIVER_NAME=radeonsi`将驱动改为radeonsi（在docker-compose文件中或[HA插件的config.yml](advanced.md#environment_vars)中）。

:::

```yaml
ffmpeg:
  hwaccel_args: preset-vaapi
```

## NVIDIA显卡

建议使用现代支持的GPU。NVIDIA提供了[支持的GPU和功能矩阵](https://developer.nvidia.com/video-encode-and-decode-gpu-support-matrix-new)。如果您的显卡在列表中且支持CUVID/NVDEC，则很可能可用于解码。但必须使用[与FFmpeg兼容的驱动版本](https://github.com/FFmpeg/nv-codec-headers/blob/master/README)。

更完整的显卡和驱动兼容列表见[驱动发布说明](https://download.nvidia.com/XFree86/Linux-x86_64/525.85.05/README/supportedchips.html)。

### Docker中配置NVIDIA显卡

需要安装[NVIDIA容器工具包](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html#docker)并指定GPU。

#### Docker Compose - NVIDIA显卡

```yaml
services:
  frigate:
    ...
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              device_ids: ['0'] # 仅需在多GPU时指定
              count: 1 # GPU数量
              capabilities: [gpu]
```

#### Docker Run CLI - NVIDIA显卡

```bash
docker run -d \
  --name frigate \
  ...
  --gpus=all \
  ghcr.io/blakeblackshear/frigate:stable
```

### 设置解码器

使用`preset-nvidia`时，ffmpeg会自动选择适合的配置文件，如果不支持会记录错误。

```yaml
ffmpeg:
  hwaccel_args: preset-nvidia
```

验证硬件解码是否工作，运行`nvidia-smi`应显示`ffmpeg`进程：

:::note

由于Docker限制，`nvidia-smi`在容器内运行时可能不显示`ffmpeg`进程。

:::

这些说明基于[Jellyfin文档](https://jellyfin.org/docs/general/administration/hardware-acceleration.html#nvidia-hardware-acceleration-on-docker-linux)。

# 社区支持

## NVIDIA Jetson系列

提供基于Jetpack/L4T的专用Docker镜像，包含使用Jetson专用媒体引擎的ffmpeg构建。Jetpack 6.0+主机使用`stable-tensorrt-jp6`标签镜像。注意Orin Nano没有视频编码器，将使用软件编码。

### Docker Run CLI - Jetson

```bash
docker run -d \
  ...
  --runtime nvidia
  ghcr.io/blakeblackshear/frigate:stable-tensorrt-jp6
```

### Docker Compose - Jetson

```yaml
services:
  frigate:
    ...
    image: ghcr.io/blakeblackshear/frigate:stable-tensorrt-jp6
    runtime: nvidia
```

:::note

旧版docker-compose不支持`runtime:`标签。可改为在`/etc/docker/daemon.json`中添加`"default-runtime": "nvidia"`：

```json
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

### 设置解码器

根据输入视频选择解码器（在容器内运行`ffmpeg -decoders | grep nvmpi`查看支持的解码器）：

```yaml
ffmpeg:
  hwaccel_args: preset-jetson-h264
```

验证硬件解码是否工作，运行`jtop`（`sudo pip3 install -U jetson-stats`）应显示NVDEC/NVDEC1在使用。

## Rockchip平台

所有Rockchip SoC都支持使用[Nyanmisaka的FFmpeg 6.1分支](https://github.com/nyanmisaka/ffmpeg-rockchip)进行硬件加速编解码。

### 前提条件

按照[Rockchip特定安装说明](/frigate/installation#rockchip平台)操作。

### 配置

在`config.yml`中添加以下预设之一：

```yaml
# 解码h264流
ffmpeg:
  hwaccel_args: preset-rk-h264

# 解码h265(hevc)流
ffmpeg:
  hwaccel_args: preset-rk-h265
```

:::note

确保您的SoC支持输入流的硬件加速。例如，如果摄像头以h265编码和4K分辨率流式传输，您的SoC必须能够以4K或更高分辨率编解码h265。如果不确定，请查阅SoC数据手册。

:::