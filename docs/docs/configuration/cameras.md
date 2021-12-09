---
id: cameras
title: Cameras
---

## Setting Up Camera Inputs

Several inputs can be configured for each camera and the role of each input can be mixed and matched based on your needs. This allows you to use a lower resolution stream for object detection, but create recordings from a higher resolution stream, or vice versa.

Each role can only be assigned to one input per camera. The options for roles are as follows:

| Role     | Description                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------- |
| `detect` | Main feed for object detection                                                                  |
| `record` | Saves segments of the video feed based on configuration settings. [docs](/configuration/record) |
| `rtmp`   | Broadcast as an RTMP feed for other services to consume. [docs](/configuration/rtmp)            |

```yaml
mqtt:
  host: mqtt.server.com
cameras:
  back:
    ffmpeg:
      inputs:
        - path: rtsp://viewer:{FRIGATE_RTSP_PASSWORD}@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
          roles:
            - detect
            - rtmp
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
