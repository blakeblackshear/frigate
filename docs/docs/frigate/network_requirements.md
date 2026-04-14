---
id: network_requirements
title: Network and Internet Requirements
---

# Network Requirements

Frigate is designed to run locally and does not require a persistent internet connection for core functionality. However, certain features need internet access for initial setup or ongoing operation. This page describes what connects to the internet, when, and how to control it.

## How Frigate Uses the Internet

Frigate's internet usage falls into three categories:

1. **One-time model downloads** — ML models are downloaded the first time a feature is enabled, then cached locally. No internet is needed on subsequent startups.
2. **Optional cloud services** — Features like Frigate+ and Generative AI connect to external APIs only when explicitly configured.
3. **Build-time dependencies** — Components bundled into the Docker image during the build process. These require no internet at runtime.

:::tip

After initial setup, Frigate can run fully offline as long as all required models have been downloaded and no cloud-dependent features are enabled.

:::

## One-Time Model Downloads

The following models are downloaded automatically the first time their associated feature is enabled. Once cached in `/config/model_cache/`, they do not require internet again.

| Feature                                                                                       | Models Downloaded                                                          | Source               |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------- |
| [Semantic search](/configuration/semantic_search)                                             | Jina CLIP v1 or v2 (ONNX) + tokenizer                                      | HuggingFace          |
| [Face recognition](/configuration/face_recognition)                                           | FaceNet, ArcFace, face detection model                                     | GitHub               |
| [License plate recognition](/configuration/license_plate_recognition)                         | PaddleOCR (detection, classification, recognition) + YOLOv9 plate detector | GitHub               |
| [Bird classification](/configuration/bird_classification)                                     | MobileNetV2 bird model + label map                                         | GitHub               |
| [Custom classification](/configuration/custom_classification/state_classification) (training) | MobileNetV2 ImageNet base weights (via Keras)                              | Google storage       |
| [Audio transcription](/configuration/advanced)                                                | Whisper or Sherpa-ONNX streaming model                                     | HuggingFace / OpenAI |

### Hardware-Specific Detector Models

If you are using one of the following hardware detectors and have not provided your own model file, a default model will be downloaded on first startup:

| Detector                                                           | Model Downloaded     | Source                   |
| ------------------------------------------------------------------ | -------------------- | ------------------------ |
| [Rockchip RKNN](/configuration/object_detectors#rockchip-platform) | RKNN detection model | GitHub                   |
| [Hailo 8 / 8L](/configuration/object_detectors#hailo-8)            | YOLOv6n (.hef)       | Hailo Model Zoo (AWS S3) |
| [AXERA AXEngine](/configuration/object_detectors)                  | Detection model      | HuggingFace              |

:::note

The default CPU, EdgeTPU, and OpenVINO object detection models are bundled into the Docker image and do not require any download at runtime.

:::

### Preventing Model Downloads

If you have already downloaded all required models and want to prevent Frigate from attempting any outbound connections to HuggingFace or the Transformers library, set the following environment variables on your Frigate container:

```yaml
environment:
  HF_HUB_OFFLINE: "1"
  TRANSFORMERS_OFFLINE: "1"
```

:::warning

Setting these variables without having the correct model files already cached in `/config/model_cache/` will cause failures. Only use these after a successful initial setup with internet access.

:::

### Mirror Support

If your Frigate instance has restricted internet access, you can point model downloads at internal mirrors using environment variables:

| Environment Variable                | Default                             | Used By                                       |
| ----------------------------------- | ----------------------------------- | --------------------------------------------- |
| `HF_ENDPOINT`                       | `https://huggingface.co`            | Semantic search, Sherpa-ONNX, AXEngine models |
| `GITHUB_ENDPOINT`                   | `https://github.com`                | Face recognition, LPR, RKNN models            |
| `GITHUB_RAW_ENDPOINT`               | `https://raw.githubusercontent.com` | Bird classification                           |
| `TF_KERAS_MOBILENET_V2_WEIGHTS_URL` | Google storage (Keras default)      | Custom classification training                |

## Optional Cloud Services

These features connect to external services during normal operation and require internet whenever they are active.

### Frigate+

When a Frigate+ API key is configured, Frigate communicates with `https://api.frigate.video` to download models, upload snapshots for training, submit annotations, and report false positives. Remove the API key to disable all Frigate+ network activity.

See [Frigate+](/integrations/plus) for details.

### Generative AI

When a Generative AI provider is configured, Frigate sends images and prompts to the configured provider for event descriptions, chat, and camera monitoring. Available providers:

| Provider      | Internet Required                                                |
| ------------- | ---------------------------------------------------------------- |
| OpenAI        | Yes — connects to OpenAI API (or custom base URL)                |
| Google Gemini | Yes — connects to Google Generative AI API                       |
| Azure OpenAI  | Yes — connects to your Azure endpoint                            |
| Ollama        | Depends — typically local (`localhost:11434`), but can be remote |
| llama.cpp     | No — runs entirely locally                                       |

Disable Generative AI by removing the `genai` configuration from your cameras. See [Generative AI](/configuration/genai/genai_config) for details.

### Version Check

Frigate checks GitHub for the latest release version on startup by querying `https://api.github.com`. This can be disabled:

```yaml
telemetry:
  version_check: false
```

### Push Notifications

When [notifications](/configuration/notifications) are enabled and users have registered for push notifications in the web UI, Frigate sends push messages through the browser vendor's push service (e.g., Google FCM, Mozilla autopush). This requires internet access from the Frigate server to these push endpoints.

### MQTT

If an [MQTT broker](/integrations/mqtt) is configured, Frigate maintains a connection to the broker's host and port. This is typically a local network connection, but will require internet if you use a cloud-hosted MQTT broker.

### DeepStack / CodeProject.AI

When using the [DeepStack detector plugin](/configuration/object_detectors), Frigate sends images to the configured API endpoint for inference. This is typically local but depends on where the service is hosted.

## WebRTC (STUN)

For [WebRTC live streaming](/configuration/live), Frigate uses STUN for NAT traversal:

- **go2rtc** defaults to a local STUN listener (`stun:8555`) — no internet required.
- **The web UI's WebRTC player** includes a fallback to Google's public STUN server (`stun:stun.l.google.com:19302`), which requires internet.

## Home Assistant Supervisor

When running as a Home Assistant add-on, the go2rtc startup script queries the local Supervisor API (`http://supervisor/`) to discover the host IP address and WebRTC port. This is a local network call to the Home Assistant host, not an internet connection.

## What Does NOT Require Internet

- **Object detection** — CPU, EdgeTPU, OpenVINO, and other bundled detector models are included in the Docker image.
- **Recording and playback** — All video is stored and served locally.
- **Live streaming** — Camera streams are pulled over your local network. MSE and HLS streaming work without any external connections.
- **The web interface** — Fully self-contained with no external fonts, scripts, analytics, or CDN dependencies. All translations are bundled locally.
- **Custom classification inference** — After training, custom models run entirely locally.
- **Audio detection** — The YAMNet audio classification model is bundled in the Docker image.

## Running Frigate Offline

To run Frigate in an air-gapped or offline environment:

1. **Pre-download models** — Start Frigate with internet access once with all desired features enabled. Models will be cached in `/config/model_cache/`.
2. **Disable version check** — Set `telemetry.version_check: false` in your configuration.
3. **Block outbound model requests** — Set the `HF_HUB_OFFLINE=1` and `TRANSFORMERS_OFFLINE=1` environment variables to prevent HuggingFace and Transformers from attempting any network requests.
4. **Avoid cloud features** — Do not configure Frigate+, Generative AI providers that require internet, or cloud MQTT brokers.
5. **Use local model mirrors** — If limited internet is available, set the `HF_ENDPOINT`, `GITHUB_ENDPOINT`, and `GITHUB_RAW_ENDPOINT` environment variables to point to local mirrors.

After these steps, Frigate will operate with no outbound internet connections.
