---
id: restream
title: Restream
---

### RTSP

Frigate can restream your video feed as an RTSP feed for other applications such as Home Assistant to utilize it at `rtsp://<frigate_host>:8554/<camera_name>`. Port 8554 must be open. [This allows you to use a video feed for detection in Frigate and Home Assistant live view at the same time without having to make two separate connections to the camera](#reduce-connections-to-camera). The video feed is copied from the original video feed directly to avoid re-encoding. This feed does not include any annotation by Frigate.

Frigate uses [go2rtc](https://github.com/AlexxIT/go2rtc) to provide its restream and MSE/WebRTC capabilities. The go2rtc config is hosted at the `go2rtc` in the config, see [go2rtc docs](https://github.com/AlexxIT/go2rtc#configuration) for more advanced configurations and features.

#### Birdseye Restream

Birdseye RTSP restream can be enabled at `birdseye -> restream` and accessed at `rtsp://<frigate_host>:8554/birdseye`. Enabling the restream will cause birdseye to run 24/7 which may increase CPU usage somewhat.

### RTMP (Deprecated)

In previous Frigate versions RTMP was used for re-streaming. RTMP has disadvantages however including being incompatible with H.265, high bitrates, and certain audio codecs. RTMP is deprecated and it is recommended to move to the new restream role.

## Reduce Connections To Camera

Some cameras only support one active connection or you may just want to have a single connection open to the camera. The RTSP restream allows this to be possible.

### With Single Stream

One connection is made to the camera. One for the restream, `detect` and `record` connect to the restream.

```yaml
go2rtc:
  streams:
    test_cam: ffmpeg:rtsp://192.168.1.5:554/live0#video=copy#audio=aac#audio=opus

cameras:
  test_cam:
    ffmpeg:
      output_args:
        record: preset-record-generic-audio-copy
      inputs:
        - path: rtsp://127.0.0.1:8554/test_cam?video=copy&audio=aac # <--- the name here must match the name of the camera in restream
          input_args: preset-rtsp-restream
          roles:
            - record
            - detect
```

### With Sub Stream

Two connections are made to the camera. One for the sub stream, one for the restream, `record` connects to the restream.

```yaml
go2rtc:
  streams:
    test_cam: ffmpeg:rtsp://192.168.1.5:554/live0#video=copy#audio=aac#audio=opus
    test_cam_sub: ffmpeg:rtsp://192.168.1.5:554/substream#video=copy#audio=aac#audio=opus

cameras:
  test_cam:
    ffmpeg:
      output_args:
        record: preset-record-generic-audio-copy
      inputs:
        - path: rtsp://127.0.0.1:8554/test_cam?video=copy&audio=aac # <--- the name here must match the name of the camera in restream
          input_args: preset-rtsp-restream
          roles:
            - record
        - path: rtsp://127.0.0.1:8554/test_cam_sub?video=copy&audio=aac # <--- the name here must match the name of the camera_sub in restream
          input_args: preset-rtsp-restream
          roles:
            - detect
```
