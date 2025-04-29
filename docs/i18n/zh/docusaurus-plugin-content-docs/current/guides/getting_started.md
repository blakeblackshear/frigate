---
id: getting_started
title: 入门指南
---

# 入门指南

:::tip

如果你已经有一个安装了Linux和Docker的环境，可以直接跳转到下面的[安装Frigate](#installing-frigate)部分。

如果你已经通过Docker或Home Assistant插件安装了Frigate，可以直接跳转到下面的[配置Frigate](#configuring-frigate)部分。

:::

## 硬件设置

本节将指导你如何在Debian Bookworm上设置服务器并安装Docker。

### 安装Debian 12 (Bookworm)

关于如何安装Debian服务器有很多指南，所以这里只提供简略指南。将临时显示器和键盘连接到你的设备，以便安装一个没有桌面环境的最小化服务器。

#### 准备安装媒介

1. 从[Debian网站](https://www.debian.org/distrib/netinst)下载小型安装镜像
1. 将ISO写入USB设备（推荐使用[balena Etcher](https://etcher.balena.io/)工具）
1. 从USB启动你的设备

#### 安装并设置Debian以进行远程访问

1. 确保你的设备已连接到网络，以便可以安装更新和软件
1. 如果没有连接鼠标，选择非图形化安装选项，但两种安装方式都可以正常工作
1. 系统会提示你设置root用户密码并创建一个带密码的用户
1. 安装最小化软件。更少的依赖意味着更少的维护工作。
   1. 取消选中"Debian桌面环境"和"GNOME"
   1. 选中"SSH服务器"
   1. 保持"标准系统实用工具"选中
1. 重启后，以root身份登录命令提示符，将用户添加到sudoers
   1. 安装sudo
      ```bash
      apt update && apt install -y sudo
      ```
   1. 将你创建的用户添加到sudo组（将`blake`改为你自己的用户名）
      ```bash
      usermod -aG sudo blake
      ```
1. 运行`poweroff`关机

此时，你可以将设备安装到永久位置。剩余步骤可以通过SSH从另一台设备完成。如果你没有SSH客户端，可以安装[Visual Studio Code文档](https://code.visualstudio.com/docs/remote/troubleshooting#_installing-a-supported-ssh-client)中列出的选项之一。

#### 通过SSH完成设置

1. 通过SSH连接并使用安装时创建的非root用户登录
1. 设置无密码sudo，这样就不用每次执行sudo命令时都输入密码（将下面命令中的`blake`改为你的用户名）

   ```bash
   echo 'blake    ALL=(ALL) NOPASSWD:ALL' | sudo tee /etc/sudoers.d/user
   ```

1. 注销并重新登录以激活无密码sudo
1. 为操作系统设置自动安全更新（可选）
   1. 运行以下命令确保所有内容都是最新的
      ```bash
      sudo apt update && sudo apt upgrade -y
      ```
   1. 安装无人值守更新
      ```bash
      sudo apt install -y unattended-upgrades
      echo unattended-upgrades unattended-upgrades/enable_auto_updates boolean true | sudo debconf-set-selections
      sudo dpkg-reconfigure -f noninteractive unattended-upgrades
      ```

现在你有了一个需要很少维护的最小化Debian服务器。

### 安装Docker

1. 使用[官方文档](https://docs.docker.com/engine/install/debian/)安装Docker Engine（不是Docker Desktop）
   1. 具体来说，按照[使用apt仓库安装](https://docs.docker.com/engine/install/debian/#install-using-the-repository)部分的步骤操作
2. 按照[Linux安装后步骤](https://docs.docker.com/engine/install/linux-postinstall/)中的说明将你的用户添加到docker组

## 安装Frigate

本节展示如何在Debian上为Docker安装创建最小目录结构。如果你已经通过Home Assistant插件或其他方式安装了Frigate，可以继续[配置Frigate](#configuring-frigate)部分。

### 设置目录

如果配置文件在初始启动时不存在，Frigate将创建一个配置文件。以下目录结构是开始所需的最低要求。一旦Frigate运行起来，你可以使用内置的配置编辑器，它支持配置验证。

```
.
├── docker-compose.yml
├── config/
└── storage/
```

这将创建上述结构：

```bash
mkdir storage config && touch docker-compose.yml
```

如果你通过SSH在Linux设备上设置Frigate，可以使用[nano](https://itsfoss.com/nano-editor-guide/)来编辑以下文件。如果你更喜欢使用完整的编辑器而不是终端来编辑远程文件，我推荐使用带[Remote SSH扩展](https://code.visualstudio.com/docs/remote/ssh-tutorial)的[Visual Studio Code](https://code.visualstudio.com/)。

:::note

这个`docker-compose.yml`文件只是amd64设备的入门文件。你需要根据[安装文档](/frigate/installation#docker)中的详细说明来自定义它以适应你的设置。

:::
`docker-compose.yml`

```yaml
services:
  frigate:
    container_name: frigate
    restart: unless-stopped
    stop_grace_period: 30s
    image: ghcr.io/blakeblackshear/frigate:stable
    volumes:
      - ./config:/config
      - ./storage:/media/frigate
      - type: tmpfs # 可选：1GB内存，减少SSD/SD卡损耗
        target: /tmp/cache
        tmpfs:
          size: 1000000000
    ports:
      - "8971:8971"
      - "8554:8554" # RTSP feeds
```

现在你应该可以在包含`docker-compose.yml`的文件夹中运行`docker compose up -d`来启动Frigate。在启动时，系统会创建一个管理员用户和密码，并在日志中输出。你可以通过运行`docker logs frigate`来查看。现在应该可以通过`https://server_ip:8971`访问Frigate，你可以使用`admin`用户登录并使用内置的配置编辑器完成配置。

## 配置Frigate

本节假设你已经按照[安装](../frigate/installation.md)中的说明设置了环境。你还应该根据[摄像头设置指南](/frigate/camera_setup)配置你的摄像头。特别注意选择检测分辨率的部分。

### 步骤1：添加检测流

首先我们将为摄像头添加检测流：

```yaml
mqtt:
  enabled: False

cameras:
  name_of_your_camera: # <------ 命名你的摄像头
    enabled: True
    ffmpeg:
      inputs:
        - path: rtsp://10.0.10.10:554/rtsp # <----- 你想用于检测的流
          roles:
            - detect
```

### 步骤2：启动Frigate

此时你应该能够启动Frigate并在UI中看到视频流。

如果你从摄像头获得错误图像，这意味着ffmpeg无法从你的摄像头获取视频流。检查日志中的ffmpeg错误消息。默认的ffmpeg参数设计用于支持TCP连接的H264 RTSP摄像头。

其他类型摄像头的FFmpeg参数可以在[这里](../configuration/camera_specific.md)找到。

### 步骤3：配置硬件加速（推荐）

现在你已经有了一个工作正常的摄像头配置，你需要设置硬件加速以最小化解码视频流所需的CPU。查看[硬件加速](../configuration/hardware_acceleration.md)配置参考，了解适用于你的硬件的示例。

这里是一个使用[预设](../configuration/ffmpeg_presets.md)配置硬件加速的示例，适用于大多数带集成GPU的Intel处理器：

`docker-compose.yml`（修改后，你需要运行`docker compose up -d`来应用更改）

```yaml
services:
  frigate:
    ...
    devices:
      - /dev/dri/renderD128:/dev/dri/renderD128 # 用于intel硬件加速，需要根据你的硬件更新
    ...
```

`config.yml`

```yaml
mqtt: ...

cameras:
  name_of_your_camera:
    ffmpeg:
      inputs: ...
      hwaccel_args: preset-vaapi
    detect: ...
```

### 步骤4：配置检测器

默认情况下，Frigate将使用单个CPU检测器。如果你有USB Coral，你需要在配置中添加检测器部分。

`docker-compose.yml`（修改后，你需要运行`docker compose up -d`来应用更改）

```yaml
services:
  frigate:
    ...
    devices:
      - /dev/bus/usb:/dev/bus/usb # 传递USB Coral，需要为其他版本修改
      - /dev/apex_0:/dev/apex_0 # 传递PCIe Coral，按照这里的驱动说明操作 https://coral.ai/docs/m2/get-started/#2a-on-linux
    ...
```

```yaml
mqtt: ...

detectors: # <---- 添加检测器
  coral:
    type: edgetpu
    device: usb

cameras:
  name_of_your_camera:
    ffmpeg: ...
    detect:
      enabled: True # <---- 开启检测
      ...
```

更多关于可用检测器的详细信息可以在[这里](../configuration/object_detectors.md)找到。

重启Frigate，你应该就能开始看到`person`的检测结果。如果你想跟踪其他对象，需要根据[配置文件参考](../configuration/reference.md)添加。

### 步骤5：设置运动遮罩

现在你已经优化了解码视频流的配置，你需要检查在哪里实现运动遮罩。要做到这一点，在UI中导航到摄像头，选择顶部的“调试”，并在视频流下方的选项中启用“运动遮罩”。观察持续触发不需要的运动检测的区域。常见的需要遮罩的区域包括摄像头时间戳和经常在风中摇摆的树木。目标是避免浪费对象检测周期来查看这些区域。

现在你知道需要在哪里遮罩，使用选项窗格中的"Mask & Zone creator"来生成配置文件所需的坐标。更多关于遮罩的信息可以在[这里](../configuration/masks.md)找到。

:::warning

注意，运动遮罩不应用于标记你不想检测对象的区域或减少误报。它们不会改变发送到对象检测的图像，所以你仍然可以在有运动遮罩的区域获得跟踪对象、警报和检测。这些只是防止这些区域的运动启动对象检测。

:::

你的配置现在应该看起来类似这样。

```yaml
mqtt:
  enabled: False

detectors:
  coral:
    type: edgetpu
    device: usb

cameras:
  name_of_your_camera:
    ffmpeg:
      inputs:
        - path: rtsp://10.0.10.10:554/rtsp
          roles:
            - detect
    motion:
      mask:
        - 0,461,3,0,1919,0,1919,843,1699,492,1344,458,1346,336,973,317,869,375,866,432
```

### 步骤6：启用录制

为了在Frigate UI中查看活动，需要启用录制。

要启用视频录制，向流添加`record`角色并在配置中启用它。如果在配置中禁用了录制，就无法在UI中启用它。

```yaml
mqtt: ...

detectors: ...

cameras:
  name_of_your_camera:
    ffmpeg:
      inputs:
        - path: rtsp://10.0.10.10:554/rtsp
          roles:
            - detect
        - path: rtsp://10.0.10.10:554/high_res_stream # <----- 添加你想要录制的流
          roles:
            - record
    detect: ...
    record: # <----- 启用录制
      enabled: True
    motion: ...
```

如果你的检测和录制没有单独的流，你只需要在第一个输入的角色列表中添加record角色。

:::note

如果你在`inputs`中只定义了一个流且没有为其分配`detect`角色，Frigate会自动为其分配`detect`角色。即使你在配置的`detect`部分使用`enabled: False`禁用了对象检测，Frigate仍然会解码一个流以支持运动检测、Birdseye、API图像端点和其他功能。

如果你只计划使用Frigate进行录制，仍建议为低分辨率流定义一个`detect`角色，以最小化所需流解码的资源使用。

:::

默认情况下，Frigate会保留所有跟踪对象的视频10天。完整的录制选项可以在[这里](../configuration/reference.md)找到。

### 步骤7：完整配置

此时你已经有了一个具有基本功能的完整配置。
- 查看[常见配置示例](../configuration/index.md#common-configuration-examples)获取常见配置示例列表。
- 查看[完整配置参考](../configuration/reference.md)获取完整的配置选项列表。

### 后续步骤

现在你已经有了一个可工作的安装，你可以使用以下文档了解其他功能：

1. [配置go2rtc](configuring_go2rtc.md) - 额外的实时查看选项和RTSP中继
2. [区域](../configuration/zones.md)
3. [回顾](../configuration/review.md)
4. [遮罩](../configuration/masks.md)
5. [Home Assistant集成](/integrations/home-assistant.md) - 与Home Assistant集成