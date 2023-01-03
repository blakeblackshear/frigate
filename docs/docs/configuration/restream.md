---
id: restream
title: Restream
---

### RTSP

Frigate can restream your video feed as an RTSP feed for other applications such as Home Assistant to utilize it at `rtsp://<frigate_host>:8554/<camera_name>`. Port 8554 must be open. [This allows you to use a video feed for detection in frigate and Home Assistant live view at the same time without having to make two separate connections to the camera](#reduce-connections-to-camera). The video feed is copied from the original video feed directly to avoid re-encoding. This feed does not include any annotation by Frigate.

#### Force Audio

Different live view technologies (ex: MSE, WebRTC) support different audio codecs. The `restream -> force_audio` flag tells the restream to make multiple streams available so that all live view technologies are supported. Some camera streams don't work well with this, in which case `restream -> force_audio` should be disabled.

#### Birdseye Restream

Birdseye RTSP restream can be enabled at `restream -> birdseye` and accessed at `rtsp://<frigate_host>:8554/birdseye`. Enabling the restream will cause birdseye to run 24/7 which may increase CPU usage somewhat.

#### Changing Restream Codec

Generally it is recommended to let the codec from the camera be copied. But there may be some cases where h265 needs to be transcoded as h264 or an MJPEG stream can be encoded and restreamed as h264. In this case the encoding will need to be set, if any hardware acceleration presets are set then that will be used to encode the stream.

```yaml
ffmpeg:
  hwaccel_args: your-hwaccel-preset # <- highly recommended so the GPU is used

cameras:
  mjpeg_cam:
    ffmpeg:
      ...
    restream:
      video_encoding: h264
```

### RTMP (Deprecated)

In previous Frigate versions RTMP was used for re-streaming. RTMP has disadvantages however including being incompatible with H.265, high bitrates, and certain audio codecs. RTMP is deprecated and it is recommended to move to the new restream role.

## Reduce Connections To Camera

Some cameras only support one active connection or you may just want to have a single connection open to the camera. The RTSP restream allows this to be possible.

### With Single Stream

One connection is made to the camera. One for the restream, `detect` and `record` connect to the restream.

```yaml
cameras:
  test_cam:
    ffmpeg:
      inputs:
        - path: rtsp://localhost:8554/test_cam # <--- the name here must match the name of the camera
          roles:
            - record
            - detect
        - path: rtsp://192.168.1.5:554/live0 # <--- 1 connection to camera stream
          roles:
            - restream
```

### With Sub Stream

Two connections are made to the camera. One for the sub stream, one for the restream, `record` connects to the restream.

```yaml
cameras:
  test_cam:
    ffmpeg:
      inputs:
        - path: rtsp://localhost:8554/test_cam # <--- the name here must match the name of the camera
          roles:
            - record
        - path: rtsp://192.168.1.5:554/stream # <--- camera high res stream
          roles:
            - restream
        - path: rtsp://192.168.1.5:554/substream # <--- camera sub stream
          roles:
            - detect
```
