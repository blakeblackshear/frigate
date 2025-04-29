---
id: ffmpeg_presets
title: FFmpeg预设参数
---

Frigate默认提供了一些FFmpeg参数预设，以简化配置流程。所有预设参数可在[此文件](https://github.com/blakeblackshear/frigate/blob/master/frigate/ffmpeg_presets.py)中查看。

### 硬件加速预设

强烈建议在配置中使用硬件加速预设。这些预设不仅能替代冗长的参数，还能让Frigate了解可用硬件信息，从而进行其他GPU优化（如鸟瞰图重流编码或非原生分辨率缩放）。

详见[硬件加速文档](/configuration/hardware_acceleration.md)获取GPU/iGPU设置指南。

| 预设名称            | 适用场景                   | 注意事项                  |
|---------------------|---------------------------|--------------------------|
| preset-rpi-64-h264 | 64位树莓派+h264流         |                         |
| preset-rpi-64-h265 | 64位树莓派+h265流         |                         |
| preset-vaapi       | Intel/AMD VAAPI          | 需确保选择正确的驱动程序 |
| preset-intel-qsv-h264 | Intel QSV+h264流       | 遇到问题建议改用vaapi预设 |
| preset-intel-qsv-h265 | Intel QSV+h265流       | 遇到问题建议改用vaapi预设 |
| preset-nvidia      | NVIDIA显卡               |                         |
| preset-jetson-h264 | NVIDIA Jetson+h264流    |                         |
| preset-jetson-h265 | NVIDIA Jetson+h265流    |                         |
| preset-rk-h264     | 瑞芯微MPP+h264流        | 需使用*-rk后缀镜像和特权模式 |
| preset-rk-h265     | 瑞芯微MPP+h265流        | 需使用*-rk后缀镜像和特权模式 |

### 输入参数预设

输入参数预设可提升配置可读性，并针对不同类型的视频流提供最佳兼容性方案。

详见[摄像头特定配置文档](/configuration/camera_specific.md)获取非标摄像头使用建议。

| 预设名称                  | 适用场景                | 注意事项                                                                 |
|--------------------------|-----------------------|------------------------------------------------------------------------|
| preset-http-jpeg-generic | HTTP实时JPEG流        | 建议改用重流方式处理                                                   |
| preset-http-mjpeg-generic | HTTP MJPEG流         | 建议改用重流方式处理                                                   |
| preset-http-reolink     | Reolink HTTP-FLV流   | 仅适用于原生HTTP流，不适用于RTSP重流                                   |
| preset-rtmp-generic     | RTMP流               |                                                                        |
| preset-rtsp-generic     | RTSP流               | 未指定时的默认预设                                                     |
| preset-rtsp-restream    | RTSP重流源           | 适用于作为Frigate输入源的RTSP重流                                      |
| preset-rtsp-restream-low-latency | RTSP低延迟重流源 | 可降低延迟，但部分摄像头可能不兼容                                     |
| preset-rtsp-udp         | UDP协议RTSP流        | 适用于仅支持UDP的摄像头                                                |
| preset-rtsp-blue-iris   | Blue Iris RTSP流     | 适用于Blue Iris视频源                                                  |

:::warning
使用重流时需特别注意输入参数，不同协议不可混用。`http`和`rtmp`预设不能用于`rtsp`流。例如当使用Reolink摄像头的RTSP重流作为录制源时，若误用preset-http-reolink会导致崩溃。此时需要在流级别单独设置预设，参考以下示例：
:::

```yaml
go2rtc:
  streams:
    reolink_cam: http://192.168.0.139/flv?port=1935&app=bcs&stream=channel0_main.bcs&user=admin&password=password

cameras:
  reolink_cam:
    ffmpeg:
      inputs:
        - path: http://192.168.0.139/flv?port=1935&app=bcs&stream=channel0_ext.bcs&user=admin&password=password
          input_args: preset-http-reolink
          roles:
            - detect
        - path: rtsp://127.0.0.1:8554/reolink_cam
          input_args: preset-rtsp-generic
          roles:
            - record
```

### 输出参数预设

输出参数预设可优化录制文件的生成逻辑，确保录制内容的一致性。

| 预设名称                     | 适用场景                  | 注意事项                                                                 |
|-----------------------------|-------------------------|------------------------------------------------------------------------|
| preset-record-generic       | 无音频录制               | 未指定时的默认预设                                                     |
| preset-record-generic-audio-copy | 保留原始音频录制       | 启用音频录制时使用                                                     |
| preset-record-generic-audio-aac | 转码为AAC音频录制      | 源已是AAC编码时应改用preset-record-generic-audio-copy避免重复编码      |
| preset-record-mjpeg        | MJPEG流录制             | 建议改用重流方式处理                                                   |
| preset-record-jpeg         | 实时JPEG录制            | 建议改用重流方式处理                                                   |
| preset-record-ubiquiti     | Ubiquiti非标音频流录制  | 适用于Ubiquiti设备的特殊音频格式                                       |