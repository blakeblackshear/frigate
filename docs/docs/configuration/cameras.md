---
id: cameras
title: Camera Configuration
---

## Setting Up Camera Inputs

Several inputs can be configured for each camera and the role of each input can be mixed and matched based on your needs. This allows you to use a lower resolution stream for object detection, but create recordings from a higher resolution stream, or vice versa.

A camera is enabled by default but can be temporarily disabled by using `enabled: False`. Existing tracked objects and recordings can still be accessed. Live streams, recording and detecting are not working. Camera specific configurations will be used.

Each role can only be assigned to one input per camera. The options for roles are as follows:

| Role     | Description                                                                         |
| -------- | ----------------------------------------------------------------------------------- |
| `detect` | Main feed for object detection. [docs](object_detectors.md)                         |
| `record` | Saves segments of the video feed based on configuration settings. [docs](record.md) |
| `audio`  | Feed for audio based detection. [docs](audio_detectors.md)                          |

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

:::note

If you only define one stream in your `inputs` and do not assign a `detect` role to it, Frigate will automatically assign it the `detect` role. Frigate will always decode a stream to support motion detection, Birdseye, the API image endpoints, and other features, even if you have disabled object detection with `enabled: False` in your config's `detect` section.

If you plan to use Frigate for recording only, it is still recommended to define a `detect` role for a low resolution stream to minimize resource usage from the required stream decoding.

:::

For camera model specific settings check the [camera specific](camera_specific.md) infos.

## Setting up camera PTZ controls

:::warning

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

:::tip

If your ONVIF camera does not require authentication credentials, you may still need to specify an empty string for `user` and `password`, eg: `user: ""` and `password: ""`.

:::

An ONVIF-capable camera that supports relative movement within the field of view (FOV) can also be configured to automatically track moving objects and keep them in the center of the frame. For autotracking setup, see the [autotracking](autotracking.md) docs.

## ONVIF PTZ camera recommendations

This list of working and non-working PTZ cameras is based on user feedback.

| Brand or specific camera     | PTZ Controls | Autotracking | Notes                                                                                                                                           |
| ---------------------------- | :----------: | :----------: | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Amcrest                      |      ✅      |      ✅      | ⛔️ Generally, Amcrest should work, but some older models (like the common IP2M-841) don't support autotracking                                 |
| Amcrest ASH21                |      ✅      |      ❌      | ONVIF service port: 80                                                                                                                          |
| Amcrest IP4M-S2112EW-AI      |      ✅      |      ❌      | FOV relative movement not supported.                                                                                                            |
| Amcrest IP5M-1190EW          |      ✅      |      ❌      | ONVIF Port: 80. FOV relative movement not supported.                                                                                            |
| Ctronics PTZ                 |      ✅      |      ❌      |                                                                                                                                                 |
| Dahua                        |      ✅      |      ✅      |                                                                                                                                                 |
| Dahua DH-SD2A500HB           |      ✅      |      ❌      |                                                                                                                                                 |
| Foscam R5                    |      ✅      |      ❌      |                                                                                                                                                 |
| Hanwha XNP-6550RH            |      ✅      |      ❌      |                                                                                                                                                 |
| Hikvision                    |      ✅      |      ❌      | Incomplete ONVIF support (MoveStatus won't update even on latest firmware) - reported with HWP-N4215IH-DE and DS-2DE3304W-DE, but likely others |
| Hikvision DS-2DE3A404IWG-E/W |      ✅      |      ✅      |                                                                                                                                                 |
| Reolink 511WA                |      ✅      |      ❌      | Zoom only                                                                                                                                       |
| Reolink E1 Pro               |      ✅      |      ❌      |                                                                                                                                                 |
| Reolink E1 Zoom              |      ✅      |      ❌      |                                                                                                                                                 |
| Reolink RLC-823A 16x         |      ✅      |      ❌      |                                                                                                                                                 |
| Speco O8P32X                 |      ✅      |      ❌      |                                                                                                                                                 |
| Sunba 405-D20X               |      ✅      |      ❌      |                                                                                                                                                 |
| Tapo                         |      ✅      |      ❌      | Many models supported, ONVIF Service Port: 2020                                                                                                 |
| Uniview IPC672LR-AX4DUPK     |      ✅      |      ❌      | Firmware says FOV relative movement is supported, but camera doesn't actually move when sending ONVIF commands                                  |
| Uniview IPC6612SR-X33-VG     |      ✅      |      ✅      | Leave `calibrate_on_startup` as `False`. A user has reported that zooming with `absolute` is working.                                           |
| Vikylin PTZ-2804X-I2         |      ❌      |      ❌      | Incomplete ONVIF support                                                                                                                        |

## Setting up camera groups

:::tip

It is recommended to set up camera groups using the UI.

:::

Cameras can be grouped together and assigned a name and icon, this allows them to be reviewed and filtered together. There will always be the default group for all cameras.

```yaml
camera_groups:
  front:
    cameras:
      - driveway_cam
      - garage_cam
    icon: LuCar
    order: 0
```
