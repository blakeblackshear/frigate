---
id: cameras
title: Cameras
---

## Setting Up Camera Inputs

Several inputs can be configured for each camera and the role of each input can be mixed and matched based on your needs. This allows you to use a lower resolution stream for object detection, but create recordings from a higher resolution stream, or vice versa.

A camera is enabled by default but can be temporarily disabled by using `enabled: False`. Existing events and recordings can still be accessed. Live streams, recording and detecting are not working. Camera specific configurations will be used.

Each role can only be assigned to one input per camera. The options for roles are as follows:

| Role       | Description                                                                              |
| ---------- | ---------------------------------------------------------------------------------------- |
| `detect`   | Main feed for object detection                                                           |
| `record`   | Saves segments of the video feed based on configuration settings. [docs](record.md)      |
| `rtmp`     | Deprecated: Broadcast as an RTMP feed for other services to consume. [docs](restream.md) |

```yaml
mqtt:
  host: mqtt.server.com
cameras:
  back:
    enabled: True
    ffmpeg:
      inputs:
        - path: rtsp://viewer:{FRIGATE_RTSP_PASSWORD}@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
          roles:
            - detect
            - rtmp # <- deprecated, recommend using restream instead
        - path: rtsp://viewer:{FRIGATE_RTSP_PASSWORD}@10.0.10.10:554/live
          roles:
            - record
    detect:
      width: 1280
      height: 720
```

Additional cameras are simply added to the config under the `cameras` entry.

```yaml
mqtt: ...
cameras:
  back: ...
  front: ...
  side: ...
```

For camera model specific settings check the [camera specific](camera_specific.md) infos.

## Setting up camera PTZ controls

Add onvif config to camera

```yaml
cameras:
  back:
    ffmpeg:
      ...
    onvif:
      host: 10.0.10.10
      port: 8000
      user: admin
      password: password
```

then PTZ controls will be available in the cameras WebUI.
