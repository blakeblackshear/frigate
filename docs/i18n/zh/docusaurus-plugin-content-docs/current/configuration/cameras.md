---
id: cameras
title: 摄像头配置
---

## 设置摄像头输入源

可以为每个摄像头配置多个输入源，并根据需求混合搭配每个输入源的角色。这样您可以使用低分辨率视频流进行物体检测，同时使用高分辨率视频流进行录像，反之亦然。

默认情况下摄像头是启用的，但可以通过设置`enabled: False`来禁用。通过配置文件禁用的摄像头不会出现在Frigate用户界面中，也不会消耗系统资源。

每个角色在每个摄像头中只能分配给一个输入源。可用的角色选项如下：

| 角色     | 描述                                                                         |
| -------- | ----------------------------------------------------------------------------------- |
| `detect` | 用于物体检测的主视频流。[文档](object_detectors.md)                         |
| `record` | 根据配置设置保存视频片段。[文档](record.md) |
| `audio`  | 用于基于音频的检测。[文档](audio_detectors.md)                          |

```yaml
mqtt:
  host: mqtt.server.com
cameras:
  back: # <- 摄像头名称，暂时只支持英文数字和下划线
    enabled: True
    ffmpeg:
      inputs:
        # 摄像头rtsp流地址可查阅摄像头文档或互联网其他人分享的教程，下面的地址仅为范例
        - path: rtsp://viewer:{FRIGATE_RTSP_PASSWORD}@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
          roles:
            - detect  # <- 用于物体检测
        # 可以设置不同的流用于不同功能，例如上面的流为子码流，节省带宽，适合检测，能够降低检测器负担
        # 主码流画面清晰，适合录制
        - path: rtsp://viewer:{FRIGATE_RTSP_PASSWORD}@10.0.10.10:554/live
          roles:
            - record  # <- 用于录像
    detect:
      width: 1280 # <- 可选，默认Frigate会尝试自动检测分辨率
      height: 720 # <- 可选，默认Frigate会尝试自动检测分辨率
```

只需在配置文件的`cameras`条目下添加更多摄像头即可。

```yaml
mqtt: ...
cameras:
  back: ...
  front: ...
  side: ...
```

:::note

如果您只定义了一个视频流输入且没有为其分配`detect`角色，Frigate会自动将其分配为`detect`角色。即使您在配置的`detect`部分中通过`enabled: False`禁用了物体检测，Frigate仍会解码视频流以支持运动检测、鸟瞰图、API图像端点和其他功能。

如果您计划仅使用Frigate进行录像，仍建议为低分辨率视频流定义`detect`角色，以减少所需视频流解码的资源消耗。

:::

关于特定摄像头型号的设置，请查看[摄像头特定](camera_specific.md)信息。

## 设置摄像头PTZ控制

:::warning

并非所有PTZ摄像头都支持ONVIF，这是Frigate用来与您的摄像头通信的标准协议。请检查[官方ONVIF兼容产品列表](https://www.onvif.org/conformant-products/)、您的摄像头文档或制造商网站，以确保您的PTZ支持ONVIF。同时，请确保您的摄像头运行最新的固件。

:::

在配置文件的摄像头部分添加onvif配置：

```yaml
cameras:
  back: # <- 为名为back的摄像头配置ONVIF
    ffmpeg: ...
    onvif:
      host: 10.0.10.10
      port: 8000
      user: admin
      password: password
```

如果ONVIF连接成功，PTZ控制将在摄像头的Web界面中可用。

:::tip

如果您的ONVIF摄像头不需要认证凭据，您可能仍需要为`user`和`password`指定空字符串，例如：`user: ""`和`password: ""`。

:::

支持视野(FOV)内相对移动的ONVIF摄像头还可以配置为自动跟踪移动物体并将其保持在画面中央。关于自动跟踪的设置，请参阅[自动跟踪](autotracking.md)文档。

## ONVIF PTZ摄像头推荐

以下工作与非工作PTZ摄像头列表基于用户反馈。

| 品牌或具体型号     | PTZ控制 | 自动跟踪 | 备注                                                                                                                                           |
| ---------------------------- | :----------: | :----------: | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Amcrest                      |      ✅      |      ✅      | ⛔️ 一般来说Amcrest应该可以工作，但一些旧型号(如常见的IP2M-841)不支持自动跟踪                                 |
| Amcrest ASH21                |      ✅      |      ❌      | ONVIF服务端口: 80                                                                                                                          |
| Amcrest IP4M-S2112EW-AI      |      ✅      |      ❌      | 不支持FOV相对移动。                                                                                                            |
| Amcrest IP5M-1190EW          |      ✅      |      ❌      | ONVIF端口: 80。不支持FOV相对移动。                                                                                            |
| Ctronics PTZ                 |      ✅      |      ❌      |                                                                                                                                                 |
| Dahua                        |      ✅      |      ✅      |                                                                                                                                                 |
| Dahua DH-SD2A500HB           |      ✅      |      ❌      |                                                                                                                                                 |
| Foscam R5                    |      ✅      |      ❌      |                                                                                                                                                 |
| Hanwha XNP-6550RH            |      ✅      |      ❌      |                                                                                                                                                 |
| Hikvision                    |      ✅      |      ❌      | ONVIF支持不完整(即使是最新固件MoveStatus也不会更新) - 在HWP-N4215IH-DE和DS-2DE3304W-DE型号上报告，但可能还有其他型号 |
| Hikvision DS-2DE3A404IWG-E/W |      ✅      |      ✅      |                                                                                                                                                 |
| Reolink 511WA                |      ✅      |      ❌      | 仅支持缩放                                                                                                                                       |
| Reolink E1 Pro               |      ✅      |      ❌      |                                                                                                                                                 |
| Reolink E1 Zoom              |      ✅      |      ❌      |                                                                                                                                                 |
| Reolink RLC-823A 16x         |      ✅      |      ❌      |                                                                                                                                                 |
| Speco O8P32X                 |      ✅      |      ❌      |                                                                                                                                                 |
| Sunba 405-D20X               |      ✅      |      ❌      | 原始型号和4k型号报告ONVIF支持不完整。怀疑所有型号都不兼容。                                            |
| Tapo                         |      ✅      |      ❌      | 支持多种型号，ONVIF服务端口: 2020                                                                                                 |
| Uniview IPC672LR-AX4DUPK     |      ✅      |      ❌      | 固件声称支持FOV相对移动，但在发送ONVIF命令时摄像头实际上不会移动                                  |
| Uniview IPC6612SR-X33-VG     |      ✅      |      ✅      | 保持`calibrate_on_startup`为`False`。有用户报告使用`absolute`缩放是有效的。                                           |
| Vikylin PTZ-2804X-I2         |      ❌      |      ❌      | ONVIF支持不完整                                                                                                                        |

## 设置摄像头分组

:::tip

建议使用用户界面设置摄像头分组。

:::

摄像头可以分组并分配名称和图标，这样可以一起查看和筛选。始终会有一个包含所有摄像头的默认分组。

```yaml
camera_groups:
  front:  # <- 分组名称，暂时只支持英文数字和下划线
    cameras:
      - driveway_cam  # <- 摄像头名称
      - garage_cam  # <- 摄像头名称
    icon: LuCar
    order: 0
```