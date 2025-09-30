<p align="center">
  <img align="center" alt="logo" src="docs/static/img/frigate.png">
</p>

# 🎨 Frigate with GUI Configuration Editor

> **Fork of [blakeblackshear/frigate](https://github.com/blakeblackshear/frigate)** featuring a comprehensive GUI configuration editor - **No more YAML nightmares!**

## ✨ What's Different in This Fork?

This fork adds a **complete GUI-based configuration editor** that makes Frigate accessible to everyone:

### 🚀 New Feature: GUI Configuration Editor

**No YAML knowledge required!** Configure everything through beautiful forms:

- ✅ **100% Coverage**: All 500+ configuration fields accessible
- ✅ **17+ Organized Sections**: Cameras, Detectors, Objects, Recording, Motion, MQTT, Audio, Face Recognition, LPR, and more
- ✅ **Smart Validation**: Real-time error checking with helpful messages
- ✅ **Tooltips Everywhere**: Every field has descriptions and examples
- ✅ **YAML Toggle**: Switch between GUI and YAML modes anytime
- ✅ **Schema-Driven**: Automatically adapts when new Frigate features are added

**[📖 Read the GUI Configuration Guide](docs/docs/guides/config_gui.md)**

---

## About Frigate

<a href="https://hosted.weblate.org/engage/frigate-nvr/">
<img src="https://hosted.weblate.org/widget/frigate-nvr/language-badge.svg" alt="Translation status" />
</a>

\[English\] | [简体中文](https://github.com/blakeblackshear/frigate/blob/dev/README_CN.md)

A complete and local NVR designed for [Home Assistant](https://www.home-assistant.io) with AI object detection. Uses OpenCV and Tensorflow to perform realtime object detection locally for IP cameras.

Use of a GPU or AI accelerator such as a [Google Coral](https://coral.ai/products/) or [Hailo](https://hailo.ai/) is highly recommended. AI accelerators will outperform even the best CPUs with very little overhead.

- Tight integration with Home Assistant via a [custom component](https://github.com/blakeblackshear/frigate-hass-integration)
- Designed to minimize resource use and maximize performance by only looking for objects when and where it is necessary
- Leverages multiprocessing heavily with an emphasis on realtime over processing every frame
- Uses a very low overhead motion detection to determine where to run object detection
- Object detection with TensorFlow runs in separate processes for maximum FPS
- Communicates over MQTT for easy integration into other systems
- Records video with retention settings based on detected objects
- 24/7 recording
- Re-streaming via RTSP to reduce the number of connections to your camera
- WebRTC & MSE support for low-latency live view

## Documentation

View the documentation at https://docs.frigate.video

## Donations

If you would like to make a donation to support development, please use [Github Sponsors](https://github.com/sponsors/blakeblackshear).

## Screenshots

### Live dashboard

<div>
<img width="800" alt="Live dashboard" src="https://github.com/blakeblackshear/frigate/assets/569905/5e713cb9-9db5-41dc-947a-6937c3bc376e">
</div>

### Streamlined review workflow

<div>
<img width="800" alt="Streamlined review workflow" src="https://github.com/blakeblackshear/frigate/assets/569905/6fed96e8-3b18-40e5-9ddc-31e6f3c9f2ff">
</div>

### Multi-camera scrubbing

<div>
<img width="800" alt="Multi-camera scrubbing" src="https://github.com/blakeblackshear/frigate/assets/569905/d6788a15-0eeb-4427-a8d4-80b93cae3d74">
</div>

### Built-in mask and zone editor

<div>
<img width="800" alt="Multi-camera scrubbing" src="https://github.com/blakeblackshear/frigate/assets/569905/d7885fc3-bfe6-452f-b7d0-d957cb3e31f5">
</div>

## Translations

We use [Weblate](https://hosted.weblate.org/projects/frigate-nvr/) to support language translations. Contributions are always welcome.

<a href="https://hosted.weblate.org/engage/frigate-nvr/">
<img src="https://hosted.weblate.org/widget/frigate-nvr/multi-auto.svg" alt="Translation status" />
</a>
