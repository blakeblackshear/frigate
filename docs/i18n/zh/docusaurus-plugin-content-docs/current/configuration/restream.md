---
id: restream
title: 重流功能
---

## RTSP重流

Frigate可以将您的视频流重新以RTSP协议流式传输，供其他应用程序（如Home Assistant）使用，地址为`rtsp://<frigate_host>:8554/<camera_name>`。必须开放8554端口。[这样您就可以同时使用一个视频流进行Frigate检测和Home Assistant实时查看，而无需与摄像头建立两个独立连接](#减少摄像头连接数)。视频流直接从原始视频流复制，避免重新编码。此流不包含Frigate的任何标注。

Frigate使用[go2rtc](https://github.com/AlexxIT/go2rtc/tree/v1.9.9)提供重流和MSE/WebRTC功能。go2rtc配置位于配置文件的`go2rtc`部分，更多高级配置和功能请参阅[go2rtc文档](https://github.com/AlexxIT/go2rtc/tree/v1.9.9#configuration)。

:::note

您可以通过`/api/go2rtc/streams`访问go2rtc流信息，这对调试很有帮助，也能提供有关摄像头流的有用信息。

:::

### 鸟瞰图重流

鸟瞰图RTSP重流可通过`rtsp://<frigate_host>:8554/birdseye`访问。启用鸟瞰图重流将使鸟瞰图24/7运行，这可能会略微增加CPU使用率。

```yaml
birdseye:
  restream: True
```

### 使用认证保护重流

go2rtc重流可以通过基于RTSP的用户名/密码认证进行保护。例如：

```yaml
go2rtc:
  rtsp:
    username: "admin"
    password: "pass"
  streams: ...
```

**注意：**这不适用于本地主机请求，当使用重流作为Frigate摄像头源时无需提供凭据。

## 减少摄像头连接数

某些摄像头仅支持一个活动连接，或者您可能只想与摄像头保持单一连接。RTSP重流使这成为可能。

### 单流配置

与摄像头建立一个连接。一个用于重流，`detect`和`record`连接到重流。

```yaml
go2rtc:
  streams:
    name_your_rtsp_cam: # <- RTSP流
      - rtsp://192.168.1.5:554/live0 # <- 支持视频和AAC音频的流
      - "ffmpeg:name_your_rtsp_cam#audio=opus" # <- 将音频转码为缺失编解码器(通常是opus)的流副本
    name_your_http_cam: # <- 其他流
      - http://192.168.50.155/flv?port=1935&app=bcs&stream=channel0_main.bcs&user=user&password=password # <- 支持视频和AAC音频的流
      - "ffmpeg:name_your_http_cam#audio=opus" # <- 将音频转码为缺失编解码器(通常是opus)的流副本

cameras:
  name_your_rtsp_cam:
    ffmpeg:
      output_args:
        record: preset-record-generic-audio-copy
      inputs:
        - path: rtsp://127.0.0.1:8554/name_your_rtsp_cam # <--- 这里的名称必须与重流中的摄像头名称匹配
          input_args: preset-rtsp-restream
          roles:
            - record
            - detect
            - audio # <- 仅在启用音频检测时需要
  name_your_http_cam:
    ffmpeg:
      output_args:
        record: preset-record-generic-audio-copy
      inputs:
        - path: rtsp://127.0.0.1:8554/name_your_http_cam # <--- 这里的名称必须与重流中的摄像头名称匹配
          input_args: preset-rtsp-restream
          roles:
            - record
            - detect
            - audio # <- 仅在启用音频检测时需要
```

### 子流配置

与摄像头建立两个连接。一个用于子流，一个用于重流，`record`连接到重流。

```yaml
go2rtc:
  streams:
    name_your_rtsp_cam:
      - rtsp://192.168.1.5:554/live0 # <- 支持视频和AAC音频的流。仅适用于RTSP流，HTTP必须使用ffmpeg
      - "ffmpeg:name_your_rtsp_cam#audio=opus" # <- 将音频转码为opus的流副本
    name_your_rtsp_cam_sub:
      - rtsp://192.168.1.5:554/substream # <- 支持视频和AAC音频的流。仅适用于RTSP流，HTTP必须使用ffmpeg
      - "ffmpeg:name_your_rtsp_cam_sub#audio=opus" # <- 将音频转码为opus的流副本
    name_your_http_cam:
      - http://192.168.50.155/flv?port=1935&app=bcs&stream=channel0_main.bcs&user=user&password=password # <- 支持视频和AAC音频的流。仅适用于RTSP流，HTTP必须使用ffmpeg
      - "ffmpeg:name_your_http_cam#audio=opus" # <- 将音频转码为opus的流副本
    name_your_http_cam_sub:
      - http://192.168.50.155/flv?port=1935&app=bcs&stream=channel0_ext.bcs&user=user&password=password # <- 支持视频和AAC音频的流。仅适用于RTSP流，HTTP必须使用ffmpeg
      - "ffmpeg:name_your_http_cam_sub#audio=opus" # <- 将音频转码为opus的流副本

cameras:
  name_your_rtsp_cam:
    ffmpeg:
      output_args:
        record: preset-record-generic-audio-copy
      inputs:
        - path: rtsp://127.0.0.1:8554/name_your_rtsp_cam # <--- 这里的名称必须与重流中的摄像头名称匹配
          input_args: preset-rtsp-restream
          roles:
            - record
        - path: rtsp://127.0.0.1:8554/name_your_rtsp_cam_sub # <--- 这里的名称必须与重流中的camera_sub名称匹配
          input_args: preset-rtsp-restream
          roles:
            - audio # <- 仅在启用音频检测时需要
            - detect
  name_your_http_cam:
    ffmpeg:
      output_args:
        record: preset-record-generic-audio-copy
      inputs:
        - path: rtsp://127.0.0.1:8554/name_your_http_cam # <--- 这里的名称必须与重流中的摄像头名称匹配
          input_args: preset-rtsp-restream
          roles:
            - record
        - path: rtsp://127.0.0.1:8554/name_your_http_cam_sub # <--- 这里的名称必须与重流中的camera_sub名称匹配
          input_args: preset-rtsp-restream
          roles:
            - audio # <- 仅在启用音频检测时需要
            - detect
```

## 处理复杂密码

go2rtc期望配置中使用URL编码的密码，可以使用[urlencoder.org](https://urlencoder.org)进行编码。

例如：

```yaml
go2rtc:
  streams:
    my_camera: rtsp://username:$@foo%@192.168.1.100
```

编码后变为：

```yaml
go2rtc:
  streams:
    my_camera: rtsp://username:$%40foo%25@192.168.1.100
```

更多信息请参阅[此评论](https://github.com/AlexxIT/go2rtc/issues/1217#issuecomment-2242296489)。

## 高级重流配置

go2rtc中的[exec](https://github.com/AlexxIT/go2rtc/tree/v1.9.9#source-exec)源可用于自定义ffmpeg命令。示例如下：

注意：输出需要使用两个大括号`{{output}}`传递

```yaml
go2rtc:
  streams:
    stream1: exec:ffmpeg -hide_banner -re -stream_loop -1 -i /media/BigBuckBunny.mp4 -c copy -rtsp_transport tcp -f rtsp {{output}}
```