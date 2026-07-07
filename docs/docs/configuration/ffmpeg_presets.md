---
id: ffmpeg_presets
title: FFmpeg presets
---

import ConfigTabs from "@site/src/components/ConfigTabs";
import TabItem from "@theme/TabItem";
import NavPath from "@site/src/components/NavPath";

Frigate ships with a set of FFmpeg presets to keep your configuration short and readable. Each preset expands to a longer list of FFmpeg arguments at runtime. You can see exactly what every preset expands to in [this file](https://github.com/blakeblackshear/frigate/blob/master/frigate/ffmpeg_presets.py).

In the config file you reference a preset by its name (for example, `preset-vaapi`). In the UI, the same preset is shown with a friendly label (for example, **VAAPI (Intel/AMD GPU)**). Both refer to the same thing — the tables below list the config name alongside the label you'll see in the UI.

### Hwaccel (Hardware Acceleration) Presets {#hwaccel-presets}

Hardware acceleration arguments tell FFmpeg to decode your camera's video stream on a GPU or integrated graphics chip instead of the CPU, which dramatically lowers CPU usage. Using a preset is highly recommended. Beyond replacing a long list of arguments, each preset also tells Frigate what hardware is available so it can offload additional work to the GPU — for example, encoding the Birdseye restream or scaling a stream whose resolution differs from the camera's native size.

See [the hardware acceleration docs](/configuration/hardware_acceleration_video.md) for details on setting up hardware acceleration for your GPU / iGPU, then select the preset that matches your hardware.

| Preset (YAML config)  | UI Label                | Usage                             | Notes                                                           |
| --------------------- | ----------------------- | --------------------------------- | --------------------------------------------------------------- |
| preset-rpi-64-h264    | Raspberry Pi (H.264)    | 64-bit Raspberry Pi, H.264 stream |                                                                 |
| preset-rpi-64-h265    | Raspberry Pi (H.265)    | 64-bit Raspberry Pi, H.265 stream |                                                                 |
| preset-vaapi          | VAAPI (Intel/AMD GPU)   | Intel or AMD GPU via VAAPI        | Check the hwaccel docs to ensure the correct driver is selected |
| preset-intel-qsv-h264 | Intel QuickSync (H.264) | Intel QuickSync, H.264 stream     | If you have issues, use the VAAPI preset instead                |
| preset-intel-qsv-h265 | Intel QuickSync (H.265) | Intel QuickSync, H.265 stream     | If you have issues, use the VAAPI preset instead                |
| preset-nvidia         | NVIDIA GPU              | NVIDIA GPU                        |                                                                 |
| preset-jetson-h264    | NVIDIA Jetson (H.264)   | NVIDIA Jetson, H.264 stream       |                                                                 |
| preset-jetson-h265    | NVIDIA Jetson (H.265)   | NVIDIA Jetson, H.265 stream       |                                                                 |
| preset-rkmpp          | Rockchip RKMPP          | Rockchip MPP                      | Use an image with the `-rk` suffix and run in privileged mode   |

<ConfigTabs>
<TabItem value="ui">

1. Navigate to <NavPath path="Settings > Global configuration > FFmpeg" /> and set **Hardware acceleration arguments** to the appropriate preset for your hardware.
2. To override for a specific camera, navigate to <NavPath path="Settings > Camera configuration > Streams (FFmpeg)" /> and set **Hardware acceleration arguments** for that camera.

</TabItem>
<TabItem value="yaml">

```yaml
ffmpeg:
  hwaccel_args: preset-vaapi

cameras:
  front_door:
    ffmpeg:
      hwaccel_args: preset-nvidia
```

</TabItem>
</ConfigTabs>

### Input Args Presets

Input arguments are passed to FFmpeg before your camera source and control how Frigate connects to and reads the stream — the transport protocol, timeouts, reconnection behavior, and how the stream is probed. The right input args ensure a reliable connection and maximum compatibility for each type of stream.

See [the camera-specific docs](/configuration/camera_specific.md) for more on non-standard cameras and recommendations for using them in Frigate.

| Preset (config)                  | UI Label                                  | Usage                       | Notes                                                                           |
| -------------------------------- | ----------------------------------------- | --------------------------- | ------------------------------------------------------------------------------- |
| preset-http-jpeg-generic         | HTTP JPEG (Generic)                       | HTTP live JPEG              | Restreaming the live JPEG is recommended instead                                |
| preset-http-mjpeg-generic        | HTTP MJPEG (Generic)                      | HTTP MJPEG stream           | Restreaming the MJPEG stream is recommended instead                             |
| preset-http-reolink              | HTTP - Reolink Cameras                    | Reolink HTTP-FLV stream     | Only for Reolink HTTP, not when restreaming as RTSP                             |
| preset-rtmp-generic              | RTMP (Generic)                            | RTMP stream                 |                                                                                 |
| preset-rtsp-generic              | RTSP (Generic)                            | RTSP stream                 | The default when no input args are specified                                    |
| preset-rtsp-restream             | RTSP - Restream from go2rtc               | RTSP stream from a restream | Use when a go2rtc restream is the source for Frigate                            |
| preset-rtsp-restream-low-latency | RTSP - Restream from go2rtc (Low Latency) | RTSP stream from a restream | Lowers latency for a go2rtc restream source; may cause issues with some cameras |
| preset-rtsp-udp                  | RTSP - UDP                                | RTSP stream over UDP        | Use when the camera only supports UDP                                           |
| preset-rtsp-blue-iris            | RTSP - Blue Iris                          | Blue Iris RTSP stream       | Use when consuming a stream from Blue Iris                                      |

:::warning

Be mindful of input arguments when restreaming, because you can end up with a mix of protocols. The `http` and `rtmp` presets cannot be used with `rtsp` streams. For example, using a Reolink camera with an RTSP restream as the recording source while `preset-http-reolink` is applied will cause a crash. In cases like this, set the preset at the stream level instead. See the example below.

:::

```yaml
go2rtc:
  streams:
    reolink_cam: http://192.168.0.139/flv?port=1935&app=bcs&stream=channel0_main.bcs&user=admin&password=password

cameras:
  reolink_cam:
    ffmpeg:
      inputs:
        - path: http://192.168.0.139/flv?port=1935&app=bcs&stream=channel0_ext.bcs&user=admin&password=password
          input_args: preset-http-reolink
          roles:
            - detect
        - path: rtsp://127.0.0.1:8554/reolink_cam
          input_args: preset-rtsp-generic
          roles:
            - record
```

### Output Args Presets

Output arguments are passed to FFmpeg after your camera source and control how recordings are written — which codecs are used and whether audio and video are copied as-is or re-encoded. The right output args ensure consistent, playable recordings for each type of stream.

| Preset (config)                  | UI Label                        | Usage                               | Notes                                                                                                                                                             |
| -------------------------------- | ------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| preset-record-generic            | Record (Generic, no audio)      | Record without audio                | Use this if your camera has no audio, or if you don't want to record audio                                                                                        |
| preset-record-generic-audio-copy | Record (Generic + Copy Audio)   | Record with the original audio      | Use this to keep the camera's audio in recordings without re-encoding                                                                                             |
| preset-record-generic-audio-aac  | Record (Generic + Audio to AAC) | Record with audio transcoded to AAC | The default when no output args are specified. Transcodes audio to AAC. If the source is already AAC, use `preset-record-generic-audio-copy` to avoid re-encoding |
| preset-record-mjpeg              | Record - MJPEG Cameras          | Record an MJPEG stream              | Restreaming the MJPEG stream is recommended instead                                                                                                               |
| preset-record-jpeg               | Record - JPEG Cameras           | Record a live JPEG                  | Restreaming the live JPEG is recommended instead                                                                                                                  |
| preset-record-ubiquiti           | Record - Ubiquiti Cameras       | Record a Ubiquiti stream with audio | Handles Ubiquiti's non-standard audio format                                                                                                                      |
