<p align="center">
  <img align="center" alt="logo" src="docs/static/img/branding/frigate.png">
</p>

# Frigate NVR™ - Realtime Object Detection for IP Cameras

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<a href="https://hosted.weblate.org/engage/frigate-nvr/">
<img src="https://hosted.weblate.org/widget/frigate-nvr/language-badge.svg" alt="Translation status" />
</a>

\[English\] | [简体中文](https://github.com/blakeblackshear/frigate/blob/dev/README_CN.md)

---

<p align="center">
  <a href="https://www.atlascloud.ai/?utm_source=github&utm_medium=link&utm_campaign=frigate">
    <img src="docs/static/img/branding/atlas-cloud-logo.png" alt="Atlas Cloud" width="200">
  </a>
</p>

<p align="center">
  <b><a href="https://www.atlascloud.ai/?utm_source=github&utm_medium=link&utm_campaign=frigate">Atlas Cloud</a></b> is an OpenAI-compatible inference platform that can power Frigate's
  <a href="https://docs.frigate.video/configuration/genai/">Generative AI</a> features as a drop-in multimodal LLM backend.
  Point the <code>atlas</code> provider at Atlas Cloud and use a vision-capable model
  (such as <code>qwen/qwen3-vl-235b-a22b-thinking</code> or <code>Qwen/Qwen3-VL-235B-A22B-Instruct</code>)
  to generate natural-language object and review descriptions from detection frames —
  no local GPU required. See the <a href="https://docs.frigate.video/configuration/genai/">GenAI configuration docs</a>
  to get started, or grab a <a href="https://www.atlascloud.ai/console/coding-plan">coding plan</a>.
</p>

<details>
<summary>Vision-capable Atlas Cloud models for GenAI descriptions</summary>

Frigate's GenAI features require a **vision-capable** model. Good multimodal choices on Atlas Cloud include:

- `qwen/qwen3-vl-235b-a22b-thinking`
- `Qwen/Qwen3-VL-235B-A22B-Instruct`
- `qwen/qwen3-vl-30b-a3b-instruct`
- `qwen/qwen3-vl-30b-a3b-thinking`
- `qwen/qwen3-vl-8b-instruct`
- `google/gemini-3.5-flash`
- `google/gemini-3.1-pro-preview`

The full, always-current model catalog is available at the
[Atlas Cloud console](https://www.atlascloud.ai/console).

</details>

---

A complete and local NVR designed for [Home Assistant](https://www.home-assistant.io) with AI object detection. Uses OpenCV and Tensorflow to perform realtime object detection locally for IP cameras.

Use of a GPU or AI accelerator is highly recommended. AI accelerators will outperform even the best CPUs with very little overhead. See Frigate's supported [object detectors](https://docs.frigate.video/configuration/object_detectors/).

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

## License

This project is licensed under the **MIT License**.

- **Code:** The source code, configuration files, and documentation in this repository are available under the [MIT License](LICENSE). You are free to use, modify, and distribute the code as long as you include the original copyright notice.
- **Trademarks:** The "Frigate" name, the "Frigate NVR" brand, and the Frigate logo are **trademarks of Frigate, Inc.** and are **not** covered by the MIT License.

Please see our [Trademark Policy](TRADEMARK.md) for details on acceptable use of our brand assets.

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
<img width="800" alt="Built-in mask and zone editor" src="https://github.com/blakeblackshear/frigate/assets/569905/d7885fc3-bfe6-452f-b7d0-d957cb3e31f5">
</div>

## Translations

We use [Weblate](https://hosted.weblate.org/projects/frigate-nvr/) to support language translations. Contributions are always welcome.

<a href="https://hosted.weblate.org/engage/frigate-nvr/">
<img src="https://hosted.weblate.org/widget/frigate-nvr/multi-auto.svg" alt="Translation status" />
</a>

---

**Copyright © 2026 Frigate, Inc.**
