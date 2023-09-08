---
id: video_pipeline
title: The Video Pipeline
---
Frigate uses a sophisticated video pipeline that starts with the camera feeds and progressively applies transformations to them (e.g. decoding, motion detection, etc.).

This guide provides an overview to help users put the key Frigate concepts on a map.

### High level view of the video pipeline

```mermaid
%%{init: {"themeVariables": {"edgeLabelBackground": "transparent"}}}%%

flowchart LR
    Feed(Feed\nProcessing) --> Decode(Video\ndecoding)
    Decode --> Motion(Motion\nDetection)
    Motion --> Object(Object\nDetection)
    Feed --> Recording(Recording\n&\nVisualization)
    Motion --> Recording
    Object --> Recording
```

### Detailed view of the video pipeline


```mermaid
%%{init: {"themeVariables": {"edgeLabelBackground": "transparent"}}}%%

flowchart TD
    ClipStore[(Clip\nstore)]
    SnapStore[(Snapshot\nstore)]

    subgraph Camera
        MainS[\Main Stream\n/] --> Go2RTC
        SubS[\Sub Stream/] -.-> Go2RTC
        Go2RTC("Go2RTC\n(optional)") --> Stream
        Stream[Video\nstreams] --> |detect stream|Decode(Decode & Downscale)
    end
    subgraph Motion
        Decode --> MotionM(Apply\nmotion masks)
        MotionM --> MotionD(Motion\ndetection)
    end
    subgraph Detection
        MotionD --> |motion regions| ObjectD(Object\ndetection)
        Decode --> ObjectD
        ObjectD --> ObjectZ(Track objects and apply zones)
    end
    MotionD --> |motion snapshots|BirdsEye
    ObjectZ --> |detection snapshot|BirdsEye

    MotionD --> |motion clips|ClipStore
    ObjectZ --> |detection clip|ClipStore
    Stream -->|continuous record| ClipStore
    ObjectZ --> |detection snapshot|SnapStore

```