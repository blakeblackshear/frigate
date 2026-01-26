---
id: cameras
title: Camera Configuration
---

## Setting Up Camera Inputs

Several inputs can be configured for each camera and the role of each input can be mixed and matched based on your needs. This allows you to use a lower resolution stream for object detection, but create recordings from a higher resolution stream, or vice versa.

A camera is enabled by default but can be disabled by using `enabled: False`. Cameras that are disabled through the configuration file will not appear in the Frigate UI and will not consume system resources.

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

:::note

Some cameras use a separate ONVIF/service account that is distinct from the device administrator credentials. If ONVIF authentication fails with the admin account, try creating or using an ONVIF/service user in the camera's firmware. Refer to your camera manufacturer's documentation for more.

:::

:::tip

If your ONVIF camera does not require authentication credentials, you may still need to specify an empty string for `user` and `password`, eg: `user: ""` and `password: ""`.

:::

An ONVIF-capable camera that supports relative movement within the field of view (FOV) can also be configured to automatically track moving objects and keep them in the center of the frame. For autotracking setup, see the [autotracking](autotracking.md) docs.

## ONVIF PTZ camera recommendations

This list of working and non-working PTZ cameras is based on user feedback. If you'd like to report specific quirks or issues with a manufacturer or camera that would be helpful for other users, open a pull request to add to this list.

The FeatureList on the [ONVIF Conformant Products Database](https://www.onvif.org/conformant-products/) can provide a starting point to determine a camera's compatibility with Frigate's autotracking. Look to see if a camera lists `PTZRelative`, `PTZRelativePanTilt` and/or `PTZRelativeZoom`. These features are required for autotracking, but some cameras still fail to respond even if they claim support. If they are missing, autotracking will not work (though basic PTZ in the WebUI might). Avoid cameras with no database entry unless they are confirmed as working below.

| Brand or specific camera     | PTZ Controls | Autotracking | Notes                                                                                                                                                                                                                                                             |
| ---------------------------- | :----------: | :----------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Amcrest                      |      ✅      |      ✅      | ⛔️ Generally, Amcrest should work, but some older models (like the common IP2M-841) don't support autotracking                                                                                                                                                    |
| Amcrest ASH21                |      ✅      |      ❌      | ONVIF service port: 80                                                                                                                                                                                                                                            |
| Amcrest IP4M-S2112EW-AI      |      ✅      |      ❌      | FOV relative movement not supported.                                                                                                                                                                                                                              |
| Amcrest IP5M-1190EW          |      ✅      |      ❌      | ONVIF Port: 80. FOV relative movement not supported.                                                                                                                                                                                                              |
| Annke CZ504                  |      ✅      |      ✅      | Annke support provide specific firmware ([V5.7.1 build 250227](https://github.com/pierrepinon/annke_cz504/raw/refs/heads/main/digicap_V5-7-1_build_250227.dav)) to fix issue with ONVIF "TranslationSpaceFov"                                                     |
| Axis Q-6155E                 |      ✅      |      ❌      | ONVIF service port: 80; Camera does not support MoveStatus.                                                                                                                                                                                                       |
| Ctronics PTZ                 |      ✅      |      ❌      |                                                                                                                                                                                                                                                                   |
| Dahua                        |      ✅      |      ✅      | Some low-end Dahuas (lite series, picoo series (commonly), among others) have been reported to not support autotracking. These models usually don't have a four digit model number with chassis prefix and options postfix (e.g. DH-P5AE-PV vs DH-SD49825GB-HNR). |
| Dahua DH-SD2A500HB           |      ✅      |      ❌      |                                                                                                                                                                                                                                                                   |
| Dahua DH-SD49825GB-HNR       |      ✅      |      ✅      |                                                                                                                                                                                                                                                                   |
| Dahua DH-P5AE-PV             |      ❌      |      ❌      |                                                                                                                                                                                                                                                                   |
| Foscam                       |      ✅      |      ❌      | In general support PTZ, but not relative move. There are no official ONVIF certifications and tests available on the ONVIF Conformant Products Database                                                                                                           |
| Foscam R5                    |      ✅      |      ❌      |                                                                                                                                                                                                                                                                   |
| Foscam SD4                   |      ✅      |      ❌      |                                                                                                                                                                                                                                                                   |
| Hanwha XNP-6550RH            |      ✅      |      ❌      |                                                                                                                                                                                                                                                                   |
| Hikvision                    |      ✅      |      ❌      | Incomplete ONVIF support (MoveStatus won't update even on latest firmware) - reported with HWP-N4215IH-DE and DS-2DE3304W-DE, but likely others                                                                                                                   |
| Hikvision DS-2DE3A404IWG-E/W |      ✅      |      ✅      |                                                                                                                                                                                                                                                                   |
| Reolink                      |      ✅      |      ❌      |                                                                                                                                                                                                                                                                   |
| Speco O8P32X                 |      ✅      |      ❌      |                                                                                                                                                                                                                                                                   |
| Sunba 405-D20X               |      ✅      |      ❌      | Incomplete ONVIF support reported on original, and 4k models. All models are suspected incompatable.                                                                                                                                                              |
| Tapo                         |      ✅      |      ❌      | Many models supported, ONVIF Service Port: 2020                                                                                                                                                                                                                   |
| Uniview IPC672LR-AX4DUPK     |      ✅      |      ❌      | Firmware says FOV relative movement is supported, but camera doesn't actually move when sending ONVIF commands                                                                                                                                                    |
| Uniview IPC6612SR-X33-VG     |      ✅      |      ✅      | Leave `calibrate_on_startup` as `False`. A user has reported that zooming with `absolute` is working.                                                                                                                                                             |
| Vikylin PTZ-2804X-I2         |      ❌      |      ❌      | Incomplete ONVIF support                                                                                                                                                                                                                                          |

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

## Two-Way Audio

See the guide [here](/configuration/live/#two-way-talk)
