<p align="center">
  <img align="center" alt="logo" src="docs/static/img/frigate.png">
</p>

# Frigate - 一个具有实时目标检测的本地NVR

[English](https://github.com/blakeblackshear/frigate) | \[简体中文\]

一个完整的本地网络视频录像机（NVR），专为[Home Assistant](https://www.home-assistant.io)设计，具备AI物体检测功能。使用OpenCV和TensorFlow在本地为IP摄像头执行实时物体检测。

强烈推荐使用可选配件：[Google Coral加速器](https://coral.ai/products/)。在该场景下，Coral的性能甚至超过目前的顶级CPU，并且可以以极低的电力开销轻松处理100 以上的画面帧。

- 通过[自定义组件](https://github.com/blakeblackshear/frigate-hass-integration)与Home Assistant紧密集成
- 设计上通过仅在必要时和必要地点寻找物体，最大限度地减少资源使用并最大化性能
- 大量利用多进程处理，强调实时性而非处理每一帧
- 使用非常低开销的运动检测来确定运行物体检测的位置
- 使用TensorFlow进行物体检测，运行在单独的进程中以达到最大FPS
- 通过MQTT进行通信，便于集成到其他系统中
- 根据检测到的物体设置保留时间进行视频录制
- 24/7全天候录制
- 通过RTSP重新流传输以减少摄像头的连接数
- 支持WebRTC和MSE，实现低延迟的实时观看

## 文档（英文）

你可以在这里查看文档 https://docs.frigate.video

## 赞助

如果您想通过捐赠支持开发，请使用 [Github Sponsors](https://github.com/sponsors/blakeblackshear)。

## 截图

### 实时监控面板
<div>
<img width="800" alt="实时监控面板" src="https://github.com/blakeblackshear/frigate/assets/569905/5e713cb9-9db5-41dc-947a-6937c3bc376e">
</div>

### 简单的审查工作流程
<div>
<img width="800" alt="简单的审查工作流程" src="https://github.com/blakeblackshear/frigate/assets/569905/6fed96e8-3b18-40e5-9ddc-31e6f3c9f2ff">
</div>

### 多摄像头可按时间轴查看
<div>
<img width="800" alt="多摄像头可按时间轴查看" src="https://github.com/blakeblackshear/frigate/assets/569905/d6788a15-0eeb-4427-a8d4-80b93cae3d74">
</div>

### 内置遮罩和区域编辑器
<div>
<img width="800" alt="内置遮罩和区域编辑器" src="https://github.com/blakeblackshear/frigate/assets/569905/d7885fc3-bfe6-452f-b7d0-d957cb3e31f5">
</div>
