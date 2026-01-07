---
id: audio_detectors
title: Audio Detectors
---

Frigate provides a builtin audio detector which runs on the CPU. Compared to object detection in images, audio detection is a relatively lightweight operation so the only option is to run the detection on a CPU.

## Configuration

Audio events work by detecting a type of audio and creating an event, the event will end once the type of audio has not been heard for the configured amount of time. Audio events save a snapshot at the beginning of the event as well as recordings throughout the event. The recordings are retained using the configured recording retention.

### Enabling Audio Events

Audio events can be enabled for all cameras or only for specific cameras.

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

If you are using multiple streams then you must set the `audio` role on the stream that is going to be used for audio detection, this can be any stream but the stream must have audio included.

:::note

The ffmpeg process for capturing audio will be a separate connection to the camera along with the other roles assigned to the camera, for this reason it is recommended that the go2rtc restream is used for this purpose. See [the restream docs](/configuration/restream.md) for more information.

:::

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

### Configuring Minimum Volume

The audio detector uses volume levels in the same way that motion in a camera feed is used for object detection. This means that Frigate will not run audio detection unless the audio volume is above the configured level in order to reduce resource usage. Audio levels can vary widely between camera models so it is important to run tests to see what volume levels are. The Debug view in the Frigate UI has an Audio tab for cameras that have the `audio` role assigned where a graph and the current levels are is displayed. The `min_volume` parameter should be set to the minimum the `RMS` level required to run audio detection.

:::tip

Volume is considered motion for recordings, this means when the `record -> retain -> mode` is set to `motion` any time audio volume is > min_volume that recording segment for that camera will be kept.

:::

### Configuring Audio Events

The included audio model has over [500 different types](https://github.com/blakeblackshear/frigate/blob/dev/audio-labelmap.txt) of audio that can be detected, many of which are not practical. By default `bark`, `fire_alarm`, `scream`, `speech`, and `yell` are enabled but these can be customized.

```yaml
audio:
  enabled: True
  listen:
    - bark
    - fire_alarm
    - scream
    - speech
    - yell
```

### Audio Transcription

Frigate supports fully local audio transcription using either `sherpa-onnx` or OpenAI’s open-source Whisper models via `faster-whisper`. The goal of this feature is to support Semantic Search for `speech` audio events. Frigate is not intended to act as a continuous, fully-automatic speech transcription service — automatically transcribing all speech (or queuing many audio events for transcription) requires substantial CPU (or GPU) resources and is impractical on most systems. For this reason, transcriptions for events are initiated manually from the UI or the API rather than being run continuously in the background.

Transcription accuracy also depends heavily on the quality of your camera's microphone and recording conditions. Many cameras use inexpensive microphones, and distance to the speaker, low audio bitrate, or background noise can significantly reduce transcription quality. If you need higher accuracy, more robust long-running queues, or large-scale automatic transcription, consider using the HTTP API in combination with an automation platform and a cloud transcription service.

#### Configuration

To enable transcription, enable it in your config. Note that audio detection must also be enabled as described above in order to use audio transcription features.

```yaml
audio_transcription:
  enabled: True
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

:::note

Audio detection must be enabled and configured as described above in order to use audio transcription features.

:::

The optional config parameters that can be set at the global level include:

- **`enabled`**: Enable or disable the audio transcription feature.
  - Default: `False`
  - It is recommended to only configure the features at the global level, and enable it at the individual camera level.
- **`device`**: Device to use to run transcription and translation models.
  - Default: `CPU`
  - This can be `CPU` or `GPU`. The `sherpa-onnx` models are lightweight and run on the CPU only. The `whisper` models can run on GPU but are only supported on CUDA hardware.
- **`model_size`**: The size of the model used for live transcription.
  - Default: `small`
  - This can be `small` or `large`. The `small` setting uses `sherpa-onnx` models that are fast, lightweight, and always run on the CPU but are not as accurate as the `whisper` model.
  - This config option applies to **live transcription only**. Recorded `speech` events will always use a different `whisper` model (and can be accelerated for CUDA hardware if available with `device: GPU`).
- **`language`**: Defines the language used by `whisper` to translate `speech` audio events (and live audio only if using the `large` model).
  - Default: `en`
  - You must use a valid [language code](https://github.com/openai/whisper/blob/main/whisper/tokenizer.py#L10).
  - Transcriptions for `speech` events are translated.
  - Live audio is translated only if you are using the `large` model. The `small` `sherpa-onnx` model is English-only.

The only field that is valid at the camera level is `enabled`.

#### Live transcription

The single camera Live view in the Frigate UI supports live transcription of audio for streams defined with the `audio` role. Use the Enable/Disable Live Audio Transcription button/switch to toggle transcription processing. When speech is heard, the UI will display a black box over the top of the camera stream with text. The MQTT topic `frigate/<camera_name>/audio/transcription` will also be updated in real-time with transcribed text.

Results can be error-prone due to a number of factors, including:

- Poor quality camera microphone
- Distance of the audio source to the camera microphone
- Low audio bitrate setting in the camera
- Background noise
- Using the `small` model - it's fast, but not accurate for poor quality audio

For speech sources close to the camera with minimal background noise, use the `small` model.

If you have CUDA hardware, you can experiment with the `large` `whisper` model on GPU. Performance is not quite as fast as the `sherpa-onnx` `small` model, but live transcription is far more accurate. Using the `large` model with CPU will likely be too slow for real-time transcription.

#### Transcription and translation of `speech` audio events

Any `speech` events in Explore can be transcribed and/or translated through the Transcribe button in the Tracked Object Details pane.

In order to use transcription and translation for past events, you must enable audio detection and define `speech` as an audio type to listen for in your config. To have `speech` events translated into the language of your choice, set the `language` config parameter with the correct [language code](https://github.com/openai/whisper/blob/main/whisper/tokenizer.py#L10).

The transcribed/translated speech will appear in the description box in the Tracked Object Details pane. If Semantic Search is enabled, embeddings are generated for the transcription text and are fully searchable using the description search type.

:::note

Only one `speech` event may be transcribed at a time. Frigate does not automatically transcribe `speech` events or implement a queue for long-running transcription model inference.

:::

Recorded `speech` events will always use a `whisper` model, regardless of the `model_size` config setting. Without a supported Nvidia GPU, generating transcriptions for longer `speech` events may take a fair amount of time, so be patient.

#### FAQ

1. Why doesn't Frigate automatically transcribe all `speech` events?

   Frigate does not implement a queue mechanism for speech transcription, and adding one is not trivial. A proper queue would need backpressure, prioritization, memory/disk buffering, retry logic, crash recovery, and safeguards to prevent unbounded growth when events outpace processing. That’s a significant amount of complexity for a feature that, in most real-world environments, would mostly just churn through low-value noise.

   Because transcription is **serialized (one event at a time)** and speech events can be generated far faster than they can be processed, an auto-transcribe toggle would very quickly create an ever-growing backlog and degrade core functionality. For the amount of engineering and risk involved, it adds **very little practical value** for the majority of deployments, which are often on low-powered, edge hardware.

   If you hear speech that’s actually important and worth saving/indexing for the future, **just press the transcribe button in Explore** on that specific `speech` event - that keeps things explicit, reliable, and under your control.

   Other options are being considered for future versions of Frigate to add transcription options that support external `whisper` Docker containers. A single transcription service could then be shared by Frigate and other applications (for example, Home Assistant Voice), and run on more powerful machines when available.

2. Why don't you save live transcription text and use that for `speech` events?

   There’s no guarantee that a `speech` event is even created from the exact audio that went through the transcription model. Live transcription and `speech` event creation are **separate, asynchronous processes**. Even when both are correctly configured, trying to align the **precise start and end time of a speech event** with whatever audio the model happened to be processing at that moment is unreliable.

   Automatically persisting that data would often result in **misaligned, partial, or irrelevant transcripts**, while still incurring all of the CPU, storage, and privacy costs of transcription. That’s why Frigate treats transcription as an **explicit, user-initiated action** rather than an automatic side-effect of every `speech` event.
