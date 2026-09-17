---
id: audio_detectors
title: Audio Detectors
---

import ConfigTabs from "@site/src/components/ConfigTabs";
import TabItem from "@theme/TabItem";
import NavPath from "@site/src/components/NavPath";

Frigate provides a builtin audio detector which runs on the CPU. Compared to object detection in images, audio detection is a relatively lightweight operation so the only option is to run the detection on a CPU.

## Configuration

Audio events work by detecting a type of audio and creating an event, the event will end once the type of audio has not been heard for the configured amount of time. Audio events save a snapshot at the beginning of the event as well as recordings throughout the event. The recordings are retained using the configured recording retention.

### Enabling Audio Events

Audio events can be enabled globally or for specific cameras.

<ConfigTabs>
<TabItem value="ui">

**Global:** Navigate to <NavPath path="Settings > Global configuration > Audio events" /> and set **Enable audio detection** to on.

**Per-camera:** Navigate to <NavPath path="Settings > Camera configuration > Audio events" /> and set **Enable audio detection** to on for the desired camera.

</TabItem>
<TabItem value="yaml">

```yaml

audio: # <- enable audio events for all camera
  enabled: True

cameras:
  front_camera:
    ffmpeg:
    ...
    audio:
      enabled: True # <- enable audio events for the front_camera
```

</TabItem>
</ConfigTabs>

If you are using multiple streams then you must set the `audio` role on the stream that is going to be used for audio detection, this can be any stream but the stream must have audio included.

:::note

The ffmpeg process for capturing audio will be a separate connection to the camera along with the other roles assigned to the camera, for this reason it is recommended that the go2rtc restream is used for this purpose. See [the restream docs](/configuration/restream.md) for more information.

:::

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Camera configuration > Streams (FFmpeg)" /> and add an input with the `audio` role pointing to a stream that includes audio.

</TabItem>
<TabItem value="yaml">

```yaml
cameras:
  front_camera:
    ffmpeg:
      inputs:
        - path: rtsp://.../main_stream
          roles:
            - record
        - path: rtsp://.../sub_stream # <- this stream must have audio enabled
          roles:
            - audio
            - detect
```

</TabItem>
</ConfigTabs>

### Configuring Minimum Volume

The audio detector uses volume levels in the same way that motion in a camera feed is used for object detection. This means that Frigate will not run audio detection unless the audio volume is above the configured level in order to reduce resource usage. Audio levels can vary widely between camera models so it is important to run tests to see what volume levels are. The [Debug view](/usage/live#the-single-camera-view) in the Frigate UI has an Audio tab for cameras that have the `audio` role assigned where a graph and the current levels are displayed. The `min_volume` parameter should be set to the minimum the `RMS` level required to run audio detection.

:::tip

Volume is considered motion for recordings, this means when the `record -> retain -> mode` is set to `motion` any time audio volume is > min_volume that recording segment for that camera will be kept.

:::

### Configuring Audio Events

The included audio model has over [500 different types](https://github.com/blakeblackshear/frigate/blob/dev/audio-labelmap.txt) of audio that can be detected, many of which are not practical. By default `bark`, `fire_alarm`, `speech`, and `yell` are enabled but these can be customized.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Global configuration > Audio events" />.

- Set **Enable audio detection** to on
- Set **Listen types** to include the audio types you want to detect

</TabItem>
<TabItem value="yaml">

```yaml
audio:
  enabled: True
  listen:
    - bark
    - fire_alarm
    - speech
    - yell
```

</TabItem>
</ConfigTabs>

#### Grouping Audio Labels

Related audio classes can be grouped under one label by mapping their numeric
class IDs to the same name. Add the grouped name to `listen` and use it for any
corresponding filter:

```yaml
audio:
  listen:
    - dogs
  labelmap:
    69: dogs # dog
    70: dogs # bark
    75: dogs # whimper_dog
  filters:
    dogs:
      threshold: 0.8
```

Class IDs are zero-based indices in
[`audio-labelmap.txt`](https://github.com/blakeblackshear/frigate/blob/dev/audio-labelmap.txt),
so each ID is one less than the displayed file line number.
Audio label mappings are separate from the object detector's `model.labelmap`.

### Common Audio Labels

The labelmap includes hundreds of sound types. The labels below are the ones most users may find practical, grouped by what they're typically used for. Use the exact label string from the left column in your `listen` config, or search for the label in the Frigate UI directly.

Some labels cover several related sounds: `yell` is triggered by shouting, yelling, children shouting, and screaming; `crying` covers baby cries, sobbing, and whimpering; and `speech` covers ordinary talking and conversation.

**Safety and security**

| Label            | Detects                            |
| ---------------- | ---------------------------------- |
| `yell`           | Shouting, yelling, screaming       |
| `fire_alarm`     | Fire and smoke alarm sirens        |
| `smoke_detector` | Smoke detector beeps               |
| `alarm`          | General alarm sounds               |
| `car_alarm`      | Car alarms                         |
| `siren`          | Emergency vehicle and civil sirens |
| `glass`          | Glass clinking                     |
| `shatter`        | Breaking glass                     |
| `breaking`       | Something breaking                 |
| `gunshot`        | Gunshots                           |
| `explosion`      | Explosions                         |

**People and activity**

| Label       | Detects                  |
| ----------- | ------------------------ |
| `speech`    | Talking and conversation |
| `laughter`  | Laughing                 |
| `crying`    | Baby crying and sobbing  |
| `cough`     | Coughing                 |
| `footsteps` | Footsteps and walking    |
| `knock`     | Knocking on a door       |
| `doorbell`  | Doorbell                 |
| `ding-dong` | Doorbell chime           |

**Pets and animals**

| Label      | Detects          |
| ---------- | ---------------- |
| `bark`     | Dog barking      |
| `dog`      | Other dog sounds |
| `howl`     | Howling          |
| `growling` | Growling         |
| `meow`     | Cat meowing      |
| `cat`      | Other cat sounds |
| `hiss`     | Hissing          |

**Vehicles and driveway**

| Label             | Detects              |
| ----------------- | -------------------- |
| `car`             | Passing cars         |
| `honk`            | Car horns            |
| `truck`           | Trucks               |
| `reversing_beeps` | Vehicle backup beeps |
| `motorcycle`      | Motorcycles          |
| `engine_starting` | Engines starting     |

:::tip

Frequently-heard labels like `speech` can generate a lot of events, and each event could save a snapshot and recording based on your configuration, so start with a focused set and expand from there. The defaults (`bark`, `fire_alarm`, `speech`, `yell`) plus a few of the safety labels above cover most needs. See the [full audio labelmap](https://github.com/blakeblackshear/frigate/blob/dev/audio-labelmap.txt) or the Frigate UI for every available type.

:::

### Audio Transcription

Frigate supports fully local audio transcription using either `sherpa-onnx` or OpenAI's open-source Whisper models via `faster-whisper`, and can alternatively offload transcription to a [GenAI provider](#genai-provider). The goal of this feature is to support Semantic Search for `speech` audio events. Frigate is not intended to act as a continuous, fully-automatic speech transcription service. Automatically transcribing all speech (or queuing many audio events for transcription) requires substantial CPU (or GPU) resources and is impractical on most systems. For this reason, transcriptions for events are initiated manually from the UI or the API rather than being run continuously in the background.

:::info

Audio transcription requires a one-time internet connection to download the Whisper or Sherpa-ONNX model on first use. Once cached, transcription runs fully offline. See [Network Requirements](/frigate/network_requirements#one-time-model-downloads) for details.

:::

Transcription accuracy also depends heavily on the quality of your camera's microphone and recording conditions. Many cameras use inexpensive microphones, and distance to the speaker, low audio bitrate, or background noise can significantly reduce transcription quality. If you need higher accuracy, more robust long-running queues, or large-scale automatic transcription, consider using the HTTP API in combination with an automation platform and a cloud transcription service.

#### Configuration

To enable transcription, configure it globally and optionally disable for specific cameras. Audio detection must also be enabled as described above.

<ConfigTabs>
<TabItem value="ui">

**Global:** Navigate to <NavPath path="Settings > Enrichments > Audio transcription" />.

- Set **Enable audio transcription** to on
- Set **Audio transcription model or GenAI provider name** to `whisper` for Frigate's built-in local models, or to the name of a GenAI provider
- Set **Transcription device** to the desired device
- Set **Model size** to the desired size

**Per-camera:** Navigate to <NavPath path="Settings > Camera configuration > Audio transcription" /> to enable or disable transcription for a specific camera.

</TabItem>
<TabItem value="yaml">

```yaml
audio_transcription:
  enabled: True
  model: whisper
  device: ...
  model_size: ...
```

Disable audio transcription for select cameras at the camera level:

```yaml
cameras:
  back_yard:
    ...
    audio_transcription:
      enabled: False
```

</TabItem>
</ConfigTabs>

:::note

Audio detection must be enabled and configured as described above in order to use audio transcription features.

:::

The optional config parameters that can be set at the global level include:

- **`enabled`**: Enable or disable the audio transcription feature.
  - Default: `False`
  - It is recommended to only configure the features at the global level, and enable it at the individual camera level.
- **`model`**: The transcription backend.
  - Default: `whisper`
  - `whisper` uses Frigate's built-in local models, described by `device` and `model_size` below.
  - Any other value must name a key in your `genai` config whose entry has `transcribe` in its `roles`. See [GenAI Provider](#genai-provider).
- **`device`**: Device to use to run transcription and translation models.
  - Default: `CPU`
  - This can be `CPU` or `GPU`. The `sherpa-onnx` models are lightweight and run on the CPU only. The `whisper` models can run on GPU but are only supported on CUDA hardware.
  - Ignored when `model` names a GenAI provider.
- **`model_size`**: The size of the model used for live transcription.
  - Default: `small`
  - This can be `small` or `large`. The `small` setting uses `sherpa-onnx` models that are fast, lightweight, and always run on the CPU but are not as accurate as the `whisper` model.
  - This config option applies to **live transcription only**. With `model: whisper`, recorded `speech` events always use a different `whisper` model (and can be accelerated for CUDA hardware if available with `device: GPU`).
  - Ignored when `model` names a GenAI provider.
- **`language`**: Defines the language used to transcribe and translate `speech` audio events (and live audio only if using the `large` model or a GenAI provider).
  - Default: `auto`
  - `auto` lets the model detect the language itself, which most models do well. Set an explicit language only if detection is picking the wrong one.
  - Otherwise you must use a valid [language code](https://github.com/openai/whisper/blob/main/whisper/tokenizer.py#L10).
  - Transcriptions for `speech` events are translated.
  - Live audio is translated only if you are using the `large` model. The `small` `sherpa-onnx` model is English-only.

The only field that is valid at the camera level is `enabled`. In particular `model` is global only: the transcription backend is a process-wide resource shared by every camera.

#### GenAI Provider

Frigate can send audio to a GenAI provider for transcription when that provider has the `transcribe` role. This is useful if you already run a GenAI provider, or if you do not have the CPU/GPU headroom for a local whisper model. Supported providers are **OpenAI**, **Azure OpenAI**, **Gemini**, and **llama.cpp** with an audio-capable model (a dedicated ASR model such as Qwen3-ASR, or a general multimodal model that accepts audio). Ollama is not supported as it has no audio input.

To use a GenAI provider for audio transcription:

1. Configure a GenAI provider with `transcribe` in its `roles`.
2. Set the audio transcription model to that GenAI config key (e.g. `whisper_cloud`).

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Enrichments > Audio transcription" />.

| Field                                                | Description                                                                                              |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Audio transcription model or GenAI provider name** | Set to the GenAI config key (e.g. `whisper_cloud`) to use a configured GenAI provider for transcription |

The GenAI provider must also be configured with the `transcribe` role under <NavPath path="Settings > Enrichments > Generative AI" />.

</TabItem>
<TabItem value="yaml">

```yaml
genai:
  whisper_cloud:
    provider: openai
    api_key: your-api-key
    model: gpt-transcribe
    roles:
      - transcribe

audio_transcription:
  enabled: True
  model: whisper_cloud
  language: en
```

</TabItem>
</ConfigTabs>

:::warning

**Give `transcribe` its own `genai` entry.** A `genai` entry has a single `model` string that is shared by every role it holds, so `roles: [descriptions, transcribe]` would send the same model name to both the chat endpoint and the transcription endpoint. Transcription models and chat models are almost never the same model, so define a dedicated entry as shown above.

:::

:::warning

**Live transcription against a metered provider is billed continuously.** In live mode Frigate uploads an overlapping ~2 second window of audio roughly once per second, per camera, for as long as audio stays above that camera's `audio.min_volume`. Windows below that threshold are never uploaded, which is what keeps a quiet camera near zero requests, but a camera pointed at a busy street will keep sending.

Three things keep this opt-in: `transcribe` is not one of the default roles, live transcription is off by default, and the volume gate suppresses silence. Transcription of recorded `speech` events is unaffected - it remains a manual, one-request-per-event action.

:::

`device` and `model_size` have no effect on this path and no local model is ever downloaded.

`language` defaults to `auto`, which sends no language hint and lets the model detect it. Most audio models detect language well, so leave it on `auto` unless detection is picking the wrong one.

When set explicitly, it is sent as the transcription endpoint's native `language` parameter for OpenAI, Azure, and llama.cpp, and as part of the prompt for Gemini. This matters for dedicated ASR models such as Qwen3-ASR: they read the prompt as contextual biasing rather than as an instruction, so a language named in the prompt is ignored, while the endpoint parameter is honored.

#### Live transcription

The single camera Live view in the Frigate UI supports live transcription of audio for streams defined with the `audio` role. Use the Enable/Disable Live Audio Transcription button/switch to toggle transcription processing, or toggle it outside of the UI with the [`frigate/<camera_name>/audio_transcription/set`](/integrations/mqtt#frigatecamera_nameaudio_transcriptionset) MQTT topic or the HTTP API. When speech is heard, the UI will display a black box over the top of the camera stream with text. The MQTT topic `frigate/<camera_name>/audio/transcription` will also be updated in real-time with transcribed text.

Results can be error-prone due to a number of factors, including:

- Poor quality camera microphone
- Distance of the audio source to the camera microphone
- Low audio bitrate setting in the camera
- Background noise
- Using the `small` model - it's fast, but not accurate for poor quality audio

For speech sources close to the camera with minimal background noise, use the `small` model.

A [GenAI provider](#genai-provider) is generally the most accurate option for live transcription, at the cost of a network round trip per window. That round trip has to stay under about a second to keep up with the audio; if it does not, Frigate drops the oldest buffered audio rather than letting the backlog grow.

If you have CUDA hardware, you can experiment with the `large` `whisper` model on GPU. Performance is not quite as fast as the `sherpa-onnx` `small` model, but live transcription is far more accurate. Using the `large` model with CPU will likely be too slow for real-time transcription.

#### Transcription and translation of `speech` audio events

Any `speech` events in Explore can be transcribed and/or translated through the Transcribe button (the microphone icon) in the Tracked Object Details pane.

In order to use transcription and translation for past events, you must enable audio detection and define `speech` as an audio type to listen for. To have `speech` events translated into the language of your choice, set the `language` config parameter with the correct [language code](https://github.com/openai/whisper/blob/main/whisper/tokenizer.py#L10).

The transcribed/translated speech will appear in the description box in the Tracked Object Details pane. If Semantic Search is enabled, embeddings are generated for the transcription text and are fully searchable using the description search type.

:::note

Only one `speech` event may be transcribed at a time. Frigate does not automatically transcribe `speech` events or implement a queue for long-running transcription model inference.

:::

With `model: whisper`, recorded `speech` events always use a `whisper` model, regardless of the `model_size` config setting. Without a supported Nvidia GPU, generating transcriptions for longer `speech` events may take a fair amount of time, so be patient. With a [GenAI provider](#genai-provider), the recorded clip is sent to the provider instead and no local model is used.

#### FAQ

1. Why doesn't Frigate automatically transcribe all `speech` events?

   Frigate does not implement a queue mechanism for speech transcription, and adding one is not trivial. A proper queue would need backpressure, prioritization, memory/disk buffering, retry logic, crash recovery, and safeguards to prevent unbounded growth when events outpace processing. That's a significant amount of complexity for a feature that, in most real-world environments, would mostly just churn through low-value noise.

   Because transcription is **serialized (one event at a time)** and speech events can be generated far faster than they can be processed, an auto-transcribe toggle would very quickly create an ever-growing backlog and degrade core functionality. For the amount of engineering and risk involved, it adds **very little practical value** for the majority of deployments, which are often on low-powered, edge hardware.

   If you hear speech that's actually important and worth saving/indexing for the future, **just press the transcribe button (the microphone icon) in Explore** on that specific `speech` event - that keeps things explicit, reliable, and under your control.

   Other options are being considered for future versions of Frigate to add transcription options that support external `whisper` Docker containers. A single transcription service could then be shared by Frigate and other applications (for example, Home Assistant Voice), and run on more powerful machines when available.

2. Why don't you save live transcription text and use that for `speech` events?

   There's no guarantee that a `speech` event is even created from the exact audio that went through the transcription model. Live transcription and `speech` event creation are **separate, asynchronous processes**. Even when both are correctly configured, trying to align the **precise start and end time of a speech event** with whatever audio the model happened to be processing at that moment is unreliable.

   Automatically persisting that data would often result in **misaligned, partial, or irrelevant transcripts**, while still incurring all of the CPU, storage, and privacy costs of transcription. That's why Frigate treats transcription as an **explicit, user-initiated action** rather than an automatic side-effect of every `speech` event.
