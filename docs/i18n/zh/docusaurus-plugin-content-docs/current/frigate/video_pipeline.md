---
id: video_pipeline
title: 视频处理流程
---

:::tip
由于本文涉及过多专业领域内容，对普通用户帮助不算特别多，将不会进行精翻；本文使用DeepSeek AI进行翻译，仅做参考。
:::

Frigate采用先进的视频处理流程，从摄像头获取视频流开始，逐步应用多种处理流程（如解码、移动侦测等）。

本指南概述了Frigate的核心概念，帮助用户理解其工作原理。

## 概览

高层级来看，摄像头视频流会经历五个处理步骤：

```mermaid
%%{init: {"themeVariables": {"edgeLabelBackground": "transparent"}}}%%

flowchart LR
    Feed(视频流\n获取) --> Decode(视频\n解码)
    Decode --> Motion(移动\n侦测)
    Motion --> Object(物体\n检测)
    Feed --> Recording(录像\n与\n可视化)
    Motion --> Recording
    Object --> Recording
```
如图所示，所有视频流首先需要被获取。根据数据源不同，可能简单如通过FFmpeg连接RTSP源，也可能复杂如通过go2rtc连接Apple Homekit摄像头。单个摄像头可生成主码流（高清）和子码流（低清）。

通常子码流会被解码生成全帧图像。此过程可能包含分辨率降采样和帧率控制（如保持5帧/秒）。

这些帧将通过时序比对来检测移动区域（即动态框）。动态框会组合成动态区域，并由机器学习模型分析识别已知物体。最终根据快照和录像保留策略决定保存哪些视频片段和事件。

## 视频流程详述
下图展示了比前文更详细的数据流转路径：
```mermaid
%%{init: {"themeVariables": {"edgeLabelBackground": "transparent"}}}%%

flowchart TD
    RecStore[(录像\n存储)]
    SnapStore[(快照\n存储)]

    subgraph 视频获取
        Cam["摄像头"] -->|FFmpeg支持| Stream
        Cam -->|"其他流媒体\n协议"| go2rtc
        go2rtc("go2rtc") --> Stream
        Stream[获取主/子\n码流] --> |检测码流|Decode(解码与\n降采样)
    end
    subgraph 移动侦测
        Decode --> MotionM(应用\n遮罩)
        MotionM --> MotionD(移动\n检测)
    end
    subgraph 物体识别
        MotionD --> |动态区域| ObjectD(物体检测)
        Decode --> ObjectD
        ObjectD --> ObjectFilter(应用物体过滤器&区域)
        ObjectFilter --> ObjectZ(物体追踪)
    end
    Decode --> |解码帧|Birdseye(鸟瞰图)
    MotionD --> |移动事件|Birdseye
    ObjectZ --> |物体事件|Birdseye

    MotionD --> |"视频片段\n(保留移动)"|RecStore
    ObjectZ --> |检测片段|RecStore
    Stream -->|"视频片段\n(保留全部)"| RecStore
    ObjectZ --> |检测快照|SnapStore
```

