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

The audio detector uses volume levels in the same way that motion in a camera feed is used for object detection. This means that frigate will not run audio detection unless the audio volume is above the configured level in order to reduce resource usage. Audio levels can vary widely between camera models so it is important to run tests to see what volume levels are. The Debug view in the Frigate UI has an Audio tab for cameras that have the `audio` role assigned where a graph and the current levels are is displayed. The `min_volume` parameter should be set to the minimum the `RMS` level required to run audio detection.

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

Frigate supports fully local audio transcription using either `sherpa-onnx` or OpenAI’s open-source Whisper models via `faster-whisper`. To enable transcription, it is recommended to only configure the features at the global level, and enable it at the individual camera level.

```yaml
audio_transcription:
  enabled: False
  device: ...
  model_size: ...
```

Enable audio transcription for select cameras at the camera level:

```yaml
cameras:
  back_yard:
    ...
    audio_transcription:
      enabled: True
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
  - The
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

Recorded `speech` events will always use a `whisper` model, regardless of the `model_size` config setting. Without a GPU, generating transcriptions for longer `speech` events may take a fair amount of time, so be patient.
