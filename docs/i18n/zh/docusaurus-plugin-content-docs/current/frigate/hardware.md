---
id: hardware
title: 推荐硬件
---

## 摄像头

能够输出H.264编码的视频和AAC音频的摄像头能最大限度兼容Frigate与Home Assistant的所有功能特性。如果摄像头支持多子码流配置就更好了，这样可分别为物体检测、实时监控和录像存储设置不同分辨率，避免转码带来的性能损耗。

建议使用支持RTSP流和ONVIF功能的摄像头，例如海康威视、TP-Link等。**不建议**选择萤石等**家用摄像头**，他们对于RTSP的支持并不完善；尤其是不要选择360、小米等不支持获取RTSP流的摄像头，它们无法接入到Frigate中。

同时应避免选择WiFi摄像头，其视频流稳定性较差，易导致连接中断或视频数据丢失。尤其是在有多路摄像头的情况下，传输稳定性会受到极大干扰，甚至会影响到你整个WiFi其他设备的使用。（国内相关讨论：https://www.v2ex.com/t/1126166）

考虑到国内基本不会使用亚马逊来购买摄像头，并且推荐的摄像头并没有在国内发行或者为马甲型号，如果有必要，建议上京东购买。以下仅为官方文档中推荐的摄像头产品，适用于海外用户。

- <a href="https://amzn.to/4fwoNWA" target="_blank" rel="nofollow noopener sponsored">Loryta(Dahua) IPC-T549M-ALED-S3</a> （推广链接）
- <a href="https://amzn.to/3YXpcMw" target="_blank" rel="nofollow noopener sponsored">Loryta(Dahua) IPC-T54IR-AS</a> （推广链接）
- <a href="https://amzn.to/3AvBHoY" target="_blank" rel="nofollow noopener sponsored">Amcrest IP5M-T1179EW-AI-V3</a> （推广链接）

## 服务器

考虑到家用环境，建议使用N100等低功耗CPU的主机，否则你的电费可能会比以往高很多。这些在淘宝或者闲鱼上都能够找到不错的选择。但需要注意关注一下是否有额外的M.2或者PCIe接口，因为可以选配Hailo8 或者 Google Coral 这种AI加速器，能够极大的提升检测效率，并且耗电量相比独立显卡要低很多。务必使用Linux系统，例如unRAID、TrueNAS、飞牛等专门适配NAS的操作系统；也可以直接安装常规的Linux发行版，例如Ubuntu、Debian等。

## 检测器
检测器是专为高效运行物体识别推理而优化的硬件设备。使用推荐检测器可显著降低检测延迟，并大幅提升每秒检测次数。Frigate的设计理念正是基于检测器硬件实现超低推理延迟——将TensorFlow任务卸载到专用检测器上，其速度可提升一个数量级，同时能极大降低CPU负载。

:::info

Frigate支持多种硬件平台的检测器方案：

**通用硬件**

- [Hailo](#hailo-8): Hailo8和Hailo8L AI加速模块有M.2接口版本及树莓派HAT扩展版本。
  - [支持多种模型](/configuration/object_detectors#配置)
  - 最好使用 tiny/small 尺寸的模型

- [Google Coral EdgeTPU](#google-coral-tpu): Google Coral EdgeTPU 有USB/M.2两种版本
  - [主要支持 ssdlite 和 mobilenet 模型](/configuration/object_detectors#edge-tpu检测器)

**AMD**

- [ROCm](#amd-gpus): ROCm 能够在AMD显卡上运行，提供高效的检测功能
  - [支持一部分模型](/configuration/object_detectors#支持的模型-1)
  - 最好运行在AMD独显上

**Intel**

- [OpenVino](#openvino): OpenVino 可以运行在 Intel Arc独立显卡、Intel 核显以及Intel的CPU
  - [支持大部分主流模型](/configuration/object_detectors#支持的模型)
  - 推荐使用tiny/small/medium尺寸的模型

**Nvidia**

- [TensortRT](#tensorrt---nvidia-gpu): TensorRT可以运行在Nvidia显卡和Jetson开发板上
  - [通过ONNX支持主流模型](/configuration/object_detectors#支持的模型-2)
  - 可流畅运行包括large在内各尺寸模型

**Rockchip**

- [RKNN](#rockchip-platform): 需搭载NPU的瑞芯微芯片
  - [支持少量模型](/configuration/object_detectors#支持的模型-5)
  - 专为低功耗设备优化，适合tiny/small模型

:::

### Hailo-8

Frigate可以使用Hailo-8或Hailo-8L AI加速器，包括集成了Hailo模块的树莓派5。Frigate会自动识别你的Hailo类型，并且能够在你没设置型号的情况下自动选择并选择模型。

**默认模型配置:**
- **Hailo-8L:** 默认模型为 **YOLOv6n**.
- **Hailo-8:** 默认模型为 **YOLOv6n**.

在实际环境中，即使你有多路摄像头，Frigate也能够表现出一致的性能。与树莓派相比，在x86平台上，Frigate能够获得更高的帧率、吞吐量和更低的延迟。

| 模型名称          | Hailo‑8 推理时间 | Hailo‑8L 推理时间 |
| ---------------- | ---------------------- | ----------------------- |
| ssd mobilenet v1 | ~ 6 ms                 | ~ 10 ms                 |
| yolov6n          | ~ 7 ms                 | ~ 11 ms                 |

### Google Coral TPU

Frigate 同时支持 USB 和 M.2 两种版本的 Google Coral 加速模块：
- USB版兼容性最佳，无需安装额外驱动，但缺少自动温控节流功能（长时间高负载可能降频）
- PCIe 和 M.2 需要安装对应的驱动才能运行，参考：https://coral.ai

单个 Coral 使用默认模型即可处理多路摄像头，能满足大多数用户需求。你可以根据 Frigate 报告的推理速度计算 Coral 的最大性能：

当推理速度为 10ms 时，你的 Coral 最高可处理 1000/10=100，即每秒 100 帧。如果你的检测帧率经常接近这个值，你可以调整动态检测遮罩降低检测区域，或考虑增加第二个Coral设备。

### OpenVINO

OpenVINO 检测器可在以下硬件平台上运行：

- 带集成显卡的第六代及以上 Intel 平台
- 配备 VPU 硬件的 x86 & arm64 主机（如 Intel NCS2）
- 多数现代 AMD CPU（虽然 Intel 官方未提供支持）

更多详细信息请参阅 [检测器文档](/configuration/object_detectors#openvino检测器)

推理速度因使用的CPU或GPU差异较大，以下是部分已知GPU的推理时间示例：

| Name                 | MobileNetV2 推理时间 | YOLO-NAS 推理时间   | RF-DETR 推理时间    | Notes                                  |
| -------------------- | -------------------------- | ------------------------- | ------------------------- | -------------------------------------- |
| Intel i3 6100T       | 15 - 35 ms                 |                           |                           | Can only run one detector instance     |
| Intel i5 6500        | ~ 15 ms                    |                           |                           |                                        |
| Intel i5 7200u       | 15 - 25 ms                 |                           |                           |                                        |
| Intel i5 7500        | ~ 15 ms                    |                           |                           |                                        |
| Intel i3 8100        | ~ 15 ms                    |                           |                           |                                        |
| Intel i5 1135G7      | 10 - 15 ms                 |                           |                           |                                        |
| Intel i3 12000       |                            | 320: ~ 19 ms 640: ~ 54 ms |                           |                                        |
| Intel i5 12600K      | ~ 15 ms                    | 320: ~ 20 ms 640: ~ 46 ms |                           |                                        |
| Intel i7 12650H      | ~ 15 ms                    | 320: ~ 20 ms 640: ~ 42 ms | 336: 50 ms                |                                        |
| Intel N100           | ~ 15 ms                    | 320: ~ 20 ms              |                           |                                        |
| Intel Arc A380       | ~ 6 ms                     | 320: ~ 10 ms 640: ~ 22 ms | 336: 20 ms 448: 27 ms     |                                        |
| Intel Arc A750       | ~ 4 ms                     | 320: ~ 8 ms               |                           |                                        |

### TensorRT - Nvidia GPU

TensorRT检测器能够在配备支持CUDA 12.x系列库的NVIDIA GPU的x86主机上运行。主机系统的最低驱动版本必须为>=525.60.13，且GPU需支持5.0或更高的计算能力。这通常对应于麦克斯韦架构（Maxwell-era）或更新的GPU，更多信息请查阅 [TensorRT 文档](/configuration/object_detectors#nvidia-tensorrt检测器).

推理速度会因GPU和所用模型的不同而有显著差异。
`tiny`的变体比对应的非tiny模型更快，以下是一些已知示例：

| Name            | YOLOv7 推理时间 | YOLO-NAS 推理时间   | RF-DETR 推理时间    |
| --------------- | --------------------- | ------------------------- | ------------------------- |
| GTX 1060 6GB    | ~ 7 ms                |                           |                           |
| GTX 1070        | ~ 6 ms                |                           |                           |
| GTX 1660 SUPER  | ~ 4 ms                |                           |                           |
| RTX 3050        | 5 - 7 ms              | 320: ~ 10 ms 640: ~ 16 ms | 336: ~ 16 ms 560: ~ 40 ms |
| RTX 3070 Mobile | ~ 5 ms                |                           |                           |
| RTX 3070        | 4 - 6 ms              | 320: ~ 6 ms 640: ~ 12 ms  | 336: ~ 14 ms 560: ~ 36 ms |
| Quadro P400 2GB | 20 - 25 ms            |                           |                           |
| Quadro P2000    | ~ 12 ms               |                           |                           |

### AMD GPU

通过使用 [rocm](../configuration/object_detectors.md#amdrocm-gpu检测器) 检测器，Frigate可以工作在大部分AMD的显卡上。

| Name            | YOLOv9 推理时间 | YOLO-NAS 推理时间   |
| --------------- | --------------------- | ------------------------- |
| AMD 780M        | ~ 14 ms               | 320: ~ 30 ms 640: ~ 60 ms |

## 社区支持的检测器

### Nvidia Jetson

Frigate支持所有的Jetson开发板，从经济实惠的Jetson Nano到性能强劲的Jetson Orin AGX都有覆盖。能够通过专门的[编解码预设参数](/configuration/ffmpeg_presets#硬件加速预设)来[调用Jetson视频硬解码功能](/configuration/hardware_acceleration#nvidia-jetson系列)进行加速。如果还配置了[TensorRT检测器](/configuration/object_detectors#nvidia-tensorrt检测器)则会利用Jetson的GPU和DLA（深度学习加速器）执行目标检测任务。

推理速度会因YOLO模型、Jetson平台型号及NVPMode（GPU/DLA/EMC时钟频率）配置而异。大多数模型的典型推理时间为20-40毫秒。
DLA（深度学习加速器）相比GPU能效更高但速度略慢，因此启用DLA会降低功耗，但会轻微增加推理耗时。

### Rockchip platform

Frigate 支持所有 Rockchip 开发板的硬件视频加速功能，但硬件目标检测仅限以下型号支持：

- RK3562
- RK3566
- RK3568
- RK3576
- RK3588

| Name            | YOLOv9 推理时间 | YOLO-NAS 推理时间     | YOLOx 推理时间      |
| --------------- | --------------------- | --------------------------- | ------------------------- |
| rk3588 3 cores  | ~ 35 ms               | small: ~ 20 ms med: ~ 30 ms | nano: 18 ms tiny: 20 ms   |
| rk3566 1 core   |                       | small: ~ 96 ms              |                           |


启用全部3个核心的RK3588芯片运行YOLO-NAS S模型时，典型推理时间为25-30毫秒。

## Frigate如何分配CPU和检测器的工作？（美式通俗解释）

根据国外贴吧[reddit的用户提问](https://www.reddit.com/r/homeassistant/comments/q8mgau/comment/hgqbxh5/?utm_source=share&utm_medium=web2x&context=3)改编，细节有些调整。

CPU说：我是CPU, Mendel是Google Coral

我和Mendel接到个任务，要求我们阻止领居家的鸟飞进爸妈的院子，但我（CPU）不太认识鸟，需要花很久时间才能认出来，而Mendel（Coral）是鸟类专家！他可以很快的认出来。
但Mendel在其他方面的能力却很拉胯，所以我们尝试分工合作：
我负责盯监控，一直盯着画面，发现有什么东西动了就立刻拍张照，然后把照片给Mendel，他很快的认出来目标是什么。虽然大部分时间都是误报（例如树叶或者影子之类的），但终于有一次Mendel找到了邻居家的鸟！任务完成！

_提高摄像头分辨率会发生什么？_

我们突然发现一个问题：院子里还是到处都是鲣鸟的便便！怎么会漏掉呢？我明明盯了一整天啊！
爸妈检查监控后发现是因为窗户太小太脏，原来的监控窗口视野有限，还蒙着灰
于是他们擦干净窗户并换了个超大落地窗

现在我们能看到整个院子了，但……

CPU有了新的烦恼： 
- 要扫描的运动区域变大了好几倍
- 必须更拼命工作才能盯住每个角落

Mendel增填了更多压力：
- 现在每张照片都超高清（细节爆炸）
- 识别每处细节是否藏着狡猾的鸟更费劲了

实际上，当你调高分辨率/帧率时，CPU负荷暴增，要处理的数据量呈指数级增长
而Coral加速器虽然强大但精力有限，它不能同时扫描所有画面（尤其是你有多个摄像头时）

Frigate的做法是：
CPU先做“运动侦察兵”，只把有动静的画面交给Coral加速器做“精准识别”；这样既能监控多路摄像头，又不会压垮检测器。

## 使用 Coral 加速器时，硬件加速参数（hwaccel args）还有用吗？
当然有用！因为Coral并不能进行视频编解码工作。

解压视频流会消耗大量CPU资源。视频压缩使用关键帧（I帧）传输完整画面，后续帧只记录差异，CPU需要将差异帧与关键帧合并还原每一帧（[更多细节可参阅本文（英文）](https://blog.video.ibm.com/streaming-video-tips/keyframes-interframe-video-compression/)）。 更高分辨率和帧率意味着需要更多算力来解码视频流，因此建议直接在摄像头端设置合适参数以避免不必要的解码负担。