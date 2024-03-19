---
id: cameras
title: Camera Configuration
---

## Setting Up Camera Inputs

Several inputs can be configured for each camera and the role of each input can be mixed and matched based on your needs. This allows you to use a lower resolution stream for object detection, but create recordings from a higher resolution stream, or vice versa.

A camera is enabled by default but can be temporarily disabled by using `enabled: False`. Existing events and recordings can still be accessed. Live streams, recording and detecting are not working. Camera specific configurations will be used.

Each role can only be assigned to one input per camera. The options for roles are as follows:

| Role     | Description                                                                              |
| -------- | ---------------------------------------------------------------------------------------- |
| `detect` | Main feed for object detection. [docs](object_detectors.md)                              |
| `record` | Saves segments of the video feed based on configuration settings. [docs](record.md)      |
| `audio`  | Feed for audio based detection. [docs](audio_detectors.md)                               |
| `rtmp`   | Deprecated: Broadcast as an RTMP feed for other services to consume. [docs](restream.md) |

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
      width: 1280 # <- optional, by default Frigate tries to automatically detect resolution
      height: 720 # <- optional, by default Frigate tries to automatically detect resolution
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

:::caution

Not every PTZ supports ONVIF, which is the standard protocol Frigate uses to communicate with your camera. Check the [official list of ONVIF conformant products](https://www.onvif.org/conformant-products/), your camera documentation, or camera manufacturer's website to ensure your PTZ supports ONVIF. Also, ensure your camera is running the latest firmware.

:::

Add the onvif section to your camera in your configuration file:

```yaml
cameras:
  back:
    ffmpeg: ...
    onvif:
      host: 10.0.10.10
      port: 8000
      user: admin
      password: password
```

If the ONVIF connection is successful, PTZ controls will be available in the camera's WebUI.

An ONVIF-capable camera that supports relative movement within the field of view (FOV) can also be configured to automatically track moving objects and keep them in the center of the frame. For autotracking setup, see the [autotracking](autotracking.md) docs.

## ONVIF PTZ camera recommendations

This list of working and non-working PTZ cameras is based on user feedback.

| Brand or specific camera | PTZ Controls | Autotracking | Notes                                                                                                                                           |
| ------------------------ | :----------: | :----------: | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Amcrest                  |      ✅      |      ✅      | ⛔️ Generally, Amcrest should work, but some older models (like the common IP2M-841) don't support auto tracking                                  |
| Amcrest ASH21            |      ❌      |      ❌      | No ONVIF support                                                                                                                                |
| Ctronics PTZ             |      ✅      |      ❌      |                                                                                                                                                 |
| Dahua                    |      ✅      |      ✅      |                                                                                                                                                 |
| Foscam R5                |      ✅      |      ❌      |                                                                                                                                                 |
| Hanwha XNP-6550RH        |      ✅      |      ❌      |                                                                                                                                                 |
| Hikvision                |      ✅      |      ❌      | Incomplete ONVIF support (MoveStatus won't update even on latest firmware) - reported with HWP-N4215IH-DE and DS-2DE3304W-DE, but likely others |
| Reolink 511WA            |      ✅      |      ❌      | Zoom only                                                                                                                                       |
| Reolink E1 Pro           |      ✅      |      ❌      |                                                                                                                                                 |
| Reolink E1 Zoom          |      ✅      |      ❌      |                                                                                                                                                 |
| Reolink RLC-823A 16x     |      ✅      |      ❌      |                                                                                                                                                 |
| Sunba 405-D20X           |      ✅      |      ❌      |                                                                                                                                                 |
| Tapo C200                |      ✅      |      ❌      | Incomplete ONVIF support                                                                                                                        |
| Tapo C210                |      ✅      |      ❌      | Incomplete ONVIF support, ONVIF Service Port: 2020                                                                                              |
| Tapo C220                |      ✅      |      ❌      | Incomplete ONVIF support, ONVIF Service Port: 2020                                                                                              |
| Tapo C225                |      ✅      |      ❌      | Incomplete ONVIF support, ONVIF Service Port: 2020                                                                                              |
| Tapo C520WS              |      ✅      |      ❌      | Incomplete ONVIF support, ONVIF Service Port: 2020                                                                                              |
| Uniview IPC672LR-AX4DUPK |      ✅      |      ❌      | Firmware says FOV relative movement is supported, but camera doesn't actually move when sending ONVIF commands                                  |
| Vikylin PTZ-2804X-I2     |      ❌      |      ❌      | Incomplete ONVIF support                                                                                                                        |
