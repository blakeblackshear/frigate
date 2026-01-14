---
id: restream
title: Restream
---

## RTSP

Frigate can restream your video feed as an RTSP feed for other applications such as Home Assistant to utilize it at `rtsp://<frigate_host>:8554/<camera_name>`. Port 8554 must be open. [This allows you to use a video feed for detection in Frigate and Home Assistant live view at the same time without having to make two separate connections to the camera](#reduce-connections-to-camera). The video feed is copied from the original video feed directly to avoid re-encoding. This feed does not include any annotation by Frigate.

Frigate uses [go2rtc](https://github.com/AlexxIT/go2rtc/tree/v1.9.13) to provide its restream and MSE/WebRTC capabilities. The go2rtc config is hosted at the `go2rtc` in the config, see [go2rtc docs](https://github.com/AlexxIT/go2rtc/tree/v1.9.13#configuration) for more advanced configurations and features.

:::note

You can access the go2rtc stream info at `/api/go2rtc/streams` which can be helpful to debug as well as provide useful information about your camera streams.

:::

### Birdseye Restream

Birdseye RTSP restream can be accessed at `rtsp://<frigate_host>:8554/birdseye`. Enabling the birdseye restream will cause birdseye to run 24/7 which may increase CPU usage somewhat.

```yaml
birdseye:
  restream: True
```

:::tip

To improve connection speed when using Birdseye via restream you can enable a small idle heartbeat by setting `birdseye.idle_heartbeat_fps` to a low value (e.g. `1–2`). This makes Frigate periodically push the last frame even when no motion is detected, reducing initial connection latency.

:::

### Securing Restream With Authentication

The go2rtc restream can be secured with RTSP based username / password authentication. Ex:

```yaml
go2rtc:
  rtsp:
    username: "admin"
    password: "pass"
  streams: ...
```

**NOTE:** This does not apply to localhost requests, there is no need to provide credentials when using the restream as a source for frigate cameras.

## Reduce Connections To Camera

Some cameras only support one active connection or you may just want to have a single connection open to the camera. The RTSP restream allows this to be possible.

### With Single Stream

One connection is made to the camera. One for the restream, `detect` and `record` connect to the restream.

```yaml
go2rtc:
  streams:
    name_your_rtsp_cam: # <- for RTSP streams
      - rtsp://192.168.1.5:554/live0 # <- stream which supports video & aac audio
      - "ffmpeg:name_your_rtsp_cam#audio=opus" # <- copy of the stream which transcodes audio to the missing codec (usually will be opus)
    name_your_http_cam: # <- for other streams
      - http://192.168.50.155/flv?port=1935&app=bcs&stream=channel0_main.bcs&user=user&password=password # <- stream which supports video & aac audio
      - "ffmpeg:name_your_http_cam#audio=opus" # <- copy of the stream which transcodes audio to the missing codec (usually will be opus)

cameras:
  name_your_rtsp_cam:
    ffmpeg:
      output_args:
        record: preset-record-generic-audio-copy
      inputs:
        - path: rtsp://127.0.0.1:8554/name_your_rtsp_cam # <--- the name here must match the name of the camera in restream
          input_args: preset-rtsp-restream
          roles:
            - record
            - detect
            - audio # <- only necessary if audio detection is enabled
  name_your_http_cam:
    ffmpeg:
      output_args:
        record: preset-record-generic-audio-copy
      inputs:
        - path: rtsp://127.0.0.1:8554/name_your_http_cam # <--- the name here must match the name of the camera in restream
          input_args: preset-rtsp-restream
          roles:
            - record
            - detect
            - audio # <- only necessary if audio detection is enabled
```

### With Sub Stream

Two connections are made to the camera. One for the sub stream, one for the restream, `record` connects to the restream.

```yaml
go2rtc:
  streams:
    name_your_rtsp_cam:
      - rtsp://192.168.1.5:554/live0 # <- stream which supports video & aac audio. This is only supported for rtsp streams, http must use ffmpeg
      - "ffmpeg:name_your_rtsp_cam#audio=opus" # <- copy of the stream which transcodes audio to opus
    name_your_rtsp_cam_sub:
      - rtsp://192.168.1.5:554/substream # <- stream which supports video & aac audio. This is only supported for rtsp streams, http must use ffmpeg
      - "ffmpeg:name_your_rtsp_cam_sub#audio=opus" # <- copy of the stream which transcodes audio to opus
    name_your_http_cam:
      - http://192.168.50.155/flv?port=1935&app=bcs&stream=channel0_main.bcs&user=user&password=password # <- stream which supports video & aac audio. This is only supported for rtsp streams, http must use ffmpeg
      - "ffmpeg:name_your_http_cam#audio=opus" # <- copy of the stream which transcodes audio to opus
    name_your_http_cam_sub:
      - http://192.168.50.155/flv?port=1935&app=bcs&stream=channel0_ext.bcs&user=user&password=password # <- stream which supports video & aac audio. This is only supported for rtsp streams, http must use ffmpeg
      - "ffmpeg:name_your_http_cam_sub#audio=opus" # <- copy of the stream which transcodes audio to opus

cameras:
  name_your_rtsp_cam:
    ffmpeg:
      output_args:
        record: preset-record-generic-audio-copy
      inputs:
        - path: rtsp://127.0.0.1:8554/name_your_rtsp_cam # <--- the name here must match the name of the camera in restream
          input_args: preset-rtsp-restream
          roles:
            - record
        - path: rtsp://127.0.0.1:8554/name_your_rtsp_cam_sub # <--- the name here must match the name of the camera_sub in restream
          input_args: preset-rtsp-restream
          roles:
            - audio # <- only necessary if audio detection is enabled
            - detect
  name_your_http_cam:
    ffmpeg:
      output_args:
        record: preset-record-generic-audio-copy
      inputs:
        - path: rtsp://127.0.0.1:8554/name_your_http_cam # <--- the name here must match the name of the camera in restream
          input_args: preset-rtsp-restream
          roles:
            - record
        - path: rtsp://127.0.0.1:8554/name_your_http_cam_sub # <--- the name here must match the name of the camera_sub in restream
          input_args: preset-rtsp-restream
          roles:
            - audio # <- only necessary if audio detection is enabled
            - detect
```

## Handling Complex Passwords

go2rtc expects URL-encoded passwords in the config, [urlencoder.org](https://urlencoder.org) can be used for this purpose.

For example:

```yaml
go2rtc:
  streams:
    my_camera: rtsp://username:$@foo%@192.168.1.100
```

becomes

```yaml
go2rtc:
  streams:
    my_camera: rtsp://username:$%40foo%25@192.168.1.100
```

See [this comment](https://github.com/AlexxIT/go2rtc/issues/1217#issuecomment-2242296489) for more information.

## Preventing go2rtc from blocking two-way audio {#two-way-talk-restream}

For cameras that support two-way talk, go2rtc will automatically establish an audio output backchannel when connecting to an RTSP stream. This backchannel blocks access to the camera's audio output for two-way talk functionality, preventing both Frigate and other applications from using it.

To prevent this, you must configure two separate stream instances:

1. One stream instance with `#backchannel=0` for Frigate's viewing, recording, and detection (prevents go2rtc from establishing the blocking backchannel)
2. A second stream instance without `#backchannel=0` for two-way talk functionality (can be used by Frigate's WebRTC viewer or other applications)

Configuration example:

```yaml
go2rtc:
  streams:
    front_door:
      - rtsp://user:password@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2#backchannel=0
    front_door_twoway:
      - rtsp://user:password@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
```

In this configuration:

- `front_door` stream is used by Frigate for viewing, recording, and detection. The `#backchannel=0` parameter prevents go2rtc from establishing the audio output backchannel, so it won't block two-way talk access.
- `front_door_twoway` stream is used for two-way talk functionality. This stream can be used by Frigate's WebRTC viewer when two-way talk is enabled, or by other applications (like Home Assistant Advanced Camera Card) that need access to the camera's audio output channel.

## Security: Restricted Stream Sources

For security reasons, the `echo:`, `expr:`, and `exec:` stream sources are disabled by default in go2rtc. These sources allow arbitrary command execution and can pose security risks if misconfigured.

If you attempt to use these sources in your configuration, the streams will be removed and an error message will be printed in the logs.

To enable these sources, you must set the environment variable `GO2RTC_ALLOW_ARBITRARY_EXEC=true`. This can be done in your Docker Compose file or container environment:

```yaml
environment:
  - GO2RTC_ALLOW_ARBITRARY_EXEC=true
```

:::warning

Enabling arbitrary exec sources allows execution of arbitrary commands through go2rtc stream configurations. Only enable this if you understand the security implications and trust all sources of your configuration.

:::

## Advanced Restream Configurations

The [exec](https://github.com/AlexxIT/go2rtc/tree/v1.9.13#source-exec) source in go2rtc can be used for custom ffmpeg commands. An example is below:

:::warning

The `exec:`, `echo:`, and `expr:` sources are disabled by default for security. You must set `GO2RTC_ALLOW_ARBITRARY_EXEC=true` to use them. See [Security: Restricted Stream Sources](#security-restricted-stream-sources) for more information.

:::

:::warning

The `exec:`, `echo:`, and `expr:` sources are disabled by default for security. You must set `GO2RTC_ALLOW_ARBITRARY_EXEC=true` to use them. See [Security: Restricted Stream Sources](#security-restricted-stream-sources) for more information.

:::

NOTE: The output will need to be passed with two curly braces `{{output}}`

```yaml
go2rtc:
  streams:
    stream1: exec:ffmpeg -hide_banner -re -stream_loop -1 -i /media/BigBuckBunny.mp4 -c copy -rtsp_transport tcp -f rtsp {{output}}
```
