---
id: index
title: 介绍
slug: /
---

一个完整的本地网络视频录像机（NVR），专为[Home Assistant](https://www.home-assistant.io)设计，具备AI物体检测功能。使用OpenCV和TensorFlow在本地为IP摄像头执行实时物体检测。

强烈推荐使用GPU或者AI加速器（例如[Google Coral加速器](https://coral.ai/products/) 或者 [Hailo](https://hailo.ai/)）。它们的性能甚至超过目前的顶级CPU，并且可以以极低的耗电实现更优的性能。
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

## 截图

![Live View](/img/live-view.png)

![Review Items](/img/review-items.png)

![Media Browser](/img/media_browser-min.png)

![Notification](/img/notification-min.png)
