---
id: faqs
title: 常见问题解答
---

### Python致命错误: Bus error

此错误是由于共享内存(shm-size)设置过小导致的。请根据[此指南](../frigate/installation.md#calculating-required-shm-size)调整shm-size大小。

### 如何在录像中添加音频？ {#audio-in-recordings}

默认情况下，Frigate会移除录像中的音频以减少因无效数据导致失败的概率。如需保留音频，需要设置支持音频的[FFmpeg预设](/configuration/ffmpeg_presets)：

```yaml
ffmpeg:
  output_args:
    record: preset-record-generic-audio-aac
```

### 如何在实时监控中获取音频？

仅当配置了go2rtc时才支持实时监控音频，详见[实时监控文档](../configuration/live.md)。

### 无法在Web界面查看录像

请确保摄像头发送的是h264编码视频，或[进行转码](/configuration/restream.md)。

可在Chrome浏览器打开`chrome://media-internals/`页面尝试播放，该页面会显示播放失败的具体原因。

### 摄像头子码流质量不佳怎么办？

Frigate通常[推荐使用可配置子码流的摄像头](/frigate/hardware.md)。若子码流分辨率不合适，可对主码流进行缩放处理。

高效缩放需要满足以下条件：
1. 需配备GPU或集成显卡进行缩放处理
2. 需使用[硬件加速的ffmpeg预设](/configuration/hardware_acceleration.md)
3. 在配置中设置`detect -> width`和`detect -> height`为期望的检测分辨率

正确配置后，GPU将负责解码和缩放，CPU占用仅小幅增加但效果更佳。

### MJPEG流或快照显示异常绿色画面

这通常表示摄像头配置的分辨率(width/height)不正确。请使用VLC等播放器确认实际分辨率，并检查宽高值是否颠倒。

![分辨率不匹配](/img/mismatched-resolution-min.jpg)

### 日志中出现"[mov,mp4,m4a,3gp,3g2,mj2 @ 0x5639eeb6e140] moov atom not found"

某些情况下出现此日志信息是正常的。Frigate会在存储前检查录像文件完整性，偶尔这些缓存文件会无效并自动清理。

### 日志中重复出现"On connect called"

若日志频繁出现"On connect called"信息，请检查是否有多个Frigate实例。当多个容器使用相同`client_id`连接MQTT时会出现此情况。

### 错误：Database Is Locked

SQLite在网络共享存储上运行不佳。若`/media`目录映射到网络共享，请按照[此指南](../configuration/advanced.md#database)将数据库移至内部存储。

### 无法发布到MQTT：客户端未连接

在Docker中使用MQTT时，请使用MQTT服务器的实际IP地址，而非`localhost`、`127.0.0.1`或`mosquitto.ix-mosquitto.svc.cluster.local`。

因为Frigate容器不在host网络模式下运行，localhost指向的是容器自身而非宿主机网络。

### 如何判断摄像头是否离线

可通过MQTT或/api/stats接口检测，离线摄像头的camera_fps会显示为0。

此外，当摄像头离线时，Home Assistant会将其标记为不可用状态。

### 如何不通过Web界面查看Frigate日志？

Frigate既会内部管理日志，也会直接输出到Docker标准输出。通过CLI查看日志的步骤如下：

1. 在运行Frigate容器的主机上打开终端
2. 执行以下命令：
   ```
   docker logs -f frigate
   ```
   注意：若容器名称不是"frigate"，请替换为实际名称。"-f"参数表示实时跟踪日志更新，按`Ctrl+C`可退出。

更多日志查看选项可参考Docker[官方文档](https://docs.docker.com/engine/reference/commandline/logs/)。

另外，创建容器时可绑定主机目录到`/dev/shm/logs`，既持久化日志又便于使用日志分析工具：

```
docker run -d \
  --name frigate \
  --restart=unless-stopped \
  --mount type=tmpfs,target=/tmp/cache,tmpfs-size=1000000000 \
  --device /dev/bus/usb:/dev/bus/usb \
  --device /dev/dri/renderD128 \
  --shm-size=64m \
  -v /path/to/your/storage:/media/frigate \
  -v /path/to/your/config:/config \
  -v /etc/localtime:/etc/localtime:ro \
  -v /path/to/local/log/dir:/dev/shm/logs \
  -e FRIGATE_RTSP_PASSWORD='password' \
  -p 5000:5000 \
  -p 8554:8554 \
  -p 8555:8555/tcp \
  -p 8555:8555/udp \
  ghcr.io/blakeblackshear/frigate:stable
```

### RTSP流在VLC中正常播放，但在Frigate配置中使用相同URL却失败，这是bug吗？

不是。Frigate使用TCP协议连接RTSP流，而VLC会根据网络条件自动切换UDP/TCP协议。VLC能播放而Frigate失败，很可能是因为VLC选择了UDP协议。

TCP能确保数据包有序到达，这对视频录制、解码和流处理至关重要，因此Frigate强制使用TCP连接。UDP速度更快但可靠性较低，VLC的要求与Frigate不同。

如需使用UDP协议，可通过ffmpeg输入参数或`preset-rtsp-udp`预设配置，详见[ffmpeg预设文档](/configuration/ffmpeg_presets)。