---
id: ffmpeg_presets
title: FFmpeg presets
---

Some presets of FFmpeg args are provided by default to make the configuration easier. All presets can be seen in [this file](https://github.com/blakeblackshear/frigate/blob/master/frigate/ffmpeg_presets.py).

### Hwaccel Presets

It is highly recommended to use hwaccel presets in the config. These presets not only replace the longer args, but they also give Frigate hints of what hardware is available and allows Frigate to make other optimizations using the GPU such as when encoding the birdseye restream or when scaling a stream that has a size different than the native stream size.

See [the hwaccel docs](/configuration/hardware_acceleration.md) for more info on how to setup hwaccel for your GPU / iGPU.

| Preset                | Usage                        | Other Notes                                           |
| --------------------- | ---------------------------- | ----------------------------------------------------- |
| preset-rpi-32-h264    | 32 bit Rpi with h264 stream  |                                                       |
| preset-rpi-64-h264    | 64 bit Rpi with h264 stream  |                                                       |
| preset-vaapi          | Intel & AMD VAAPI            | Check hwaccel docs to ensure correct driver is chosen |
| preset-intel-qsv-h264 | Intel QSV with h264 stream   | If issues occur recommend using vaapi preset instead  |
| preset-intel-qsv-h265 | Intel QSV with h265 stream   | If issues occur recommend using vaapi preset instead  |
| preset-nvidia-h264    | Nvidia GPU with h264 stream  |                                                       |
| preset-nvidia-h265    | Nvidia GPU with h265 stream  |                                                       |
| preset-nvidia-mjpeg   | Nvidia GPU with mjpeg stream | Recommend restreaming mjpeg and using nvidia-h264     |

### Input Args Presets

Input args presets help make the config more readable and handle use cases for different types of streams to ensure maximum compatibility.

See [the camera specific docs](/configuration/camera_specific.md) for more info on non-standard cameras and recommendations for using them in Frigate.

| Preset                           | Usage                     | Other Notes                                                                                      |
| -------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------ |
| preset-http-jpeg-generic         | HTTP Live Jpeg            | Recommend restreaming live jpeg instead                                                          |
| preset-http-mjpeg-generic        | HTTP Mjpeg Stream         | Recommend restreaming mjpeg stream instead                                                       |
| preset-http-reolink              | Reolink HTTP-FLV Stream   | Only for reolink http, not when restreaming as rtsp                                              |
| preset-rtmp-generic              | RTMP Stream               |                                                                                                  |
| preset-rtsp-generic              | RTSP Stream               | This is the default when nothing is specified                                                    |
| preset-rtsp-restream             | RTSP Stream from restream | Use for rtsp restream as source for frigate                                                      |
| preset-rtsp-restream-low-latency | RTSP Stream from restream | Use for rtsp restream as source for frigate to lower latency, may cause issues with some cameras |
| preset-rtsp-udp                  | RTSP Stream via UDP       | Use when camera is UDP only                                                                      |
| preset-rtsp-blue-iris            | Blue Iris RTSP Stream     | Use when consuming a stream from Blue Iris                                                       |

:::caution

It is important to be mindful of input args when using restream because you can have a mix of protocols. `http` and `rtmp` presets cannot be used with `rtsp` streams. For example, when using a reolink cam with the rtsp restream as a source for record the preset-http-reolink will cause a crash. In this case presets will need to be set at the stream level. See the example below.

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

Output args presets help make the config more readable and handle use cases for different types of streams to ensure consistent recordings.

| Preset                           | Usage                             | Other Notes                                   |
| -------------------------------- | --------------------------------- | --------------------------------------------- |
| preset-record-generic            | Record WITHOUT audio              | This is the default when nothing is specified |
| preset-record-generic-audio-aac  | Record WITH aac audio             | Use this to enable audio in recordings        |
| preset-record-generic-audio-copy | Record WITH original audio        | Use this to enable audio in recordings        |
| preset-record-mjpeg              | Record an mjpeg stream            | Recommend restreaming mjpeg stream instead    |
| preset-record-jpeg               | Record live jpeg                  | Recommend restreaming live jpeg instead       |
| preset-record-ubiquiti           | Record ubiquiti stream with audio | Recordings with ubiquiti non-standard audio   |
