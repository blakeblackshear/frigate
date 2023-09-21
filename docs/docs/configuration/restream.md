---
id: restream
title: Restream
---

## RTSP

Frigate can restream your video feed as an RTSP feed for other applications such as Home Assistant to utilize it at `rtsp://<frigate_host>:8554/<camera_name>`. Port 8554 must be open. [This allows you to use a video feed for detection in Frigate and Home Assistant live view at the same time without having to make two separate connections to the camera](#reduce-connections-to-camera). The video feed is copied from the original video feed directly to avoid re-encoding. This feed does not include any annotation by Frigate.

Frigate uses [go2rtc](https://github.com/AlexxIT/go2rtc/tree/v1.7.1) to provide its restream and MSE/WebRTC capabilities. The go2rtc config is hosted at the `go2rtc` in the config, see [go2rtc docs](https://github.com/AlexxIT/go2rtc/tree/v1.7.1#configuration) for more advanced configurations and features.

:::note

You can access the go2rtc webUI at `http://frigate_ip:5000/live/webrtc` which can be helpful to debug as well as provide useful information about your camera streams.

:::

### Birdseye Restream

Birdseye RTSP restream can be accessed at `rtsp://<frigate_host>:8554/birdseye`. Enabling the birdseye restream will cause birdseye to run 24/7 which may increase CPU usage somewhat.
```yaml
birdseye:
  restream: true
```

### Securing Restream With Authentication

The go2rtc restream can be secured with RTSP based username / password authentication. Ex:

```yaml
go2rtc:
  rtsp:
    username: "admin"
    password: "pass"
  streams:
    ...
```

**NOTE:** This does not apply to localhost requests, there is no need to provide credentials when using the restream as a source for frigate cameras.

## RTMP (Deprecated)

In previous Frigate versions RTMP was used for re-streaming. RTMP has disadvantages however including being incompatible with H.265, high bitrates, and certain audio codecs. RTMP is deprecated and it is recommended to move to the new restream role.

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

## Advanced Restream Configurations

The [exec](https://github.com/AlexxIT/go2rtc/tree/v1.7.1#source-exec) source in go2rtc can be used for custom ffmpeg commands. An example is below:

NOTE: The output will need to be passed with two curly braces `{{output}}`

```yaml
go2rtc:
  streams:
    stream1: exec:ffmpeg -hide_banner -re -stream_loop -1 -i /media/BigBuckBunny.mp4 -c copy -rtsp_transport tcp -f rtsp {{output}}
```
