---
id: getting_started
title: Getting started
---

This guide walks through the steps to build a configuration file for Frigate. It assumes that you already have an environment setup as described in [Installation](../frigate/installation.md). You should also configure your cameras according to the [camera setup guide](/frigate/camera_setup). Pay particular attention to the section on choosing a detect resolution.

### Step 1: Add a detect stream

First we will add the detect stream for the camera:

```yaml
mqtt:
  enabled: False

cameras:
  camera_1: # <------ Name the camera
    ffmpeg:
      inputs:
        - path: rtsp://10.0.10.10:554/rtsp # <----- The stream you want to use for detection
          roles:
            - detect
    detect:
      enabled: False # <---- disable detection until you have a working camera feed
      width: 1280 # <---- update for your camera's resolution
      height: 720 # <---- update for your camera's resolution
```

### Step 2: Start Frigate

At this point you should be able to start Frigate and see the the video feed in the UI.

If you get an error image from the camera, this means ffmpeg was not able to get the video feed from your camera. Check the logs for error messages from ffmpeg. The default ffmpeg arguments are designed to work with H264 RTSP cameras that support TCP connections.

FFmpeg arguments for other types of cameras can be found [here](../configuration/camera_specific.md).

### Step 3: Configure hardware acceleration (recommended)

Now that you have a working camera configuration, you want to setup hardware acceleration to minimize the CPU required to decode your video streams. See the [hardware acceleration](../configuration/hardware_acceleration.md) config reference for examples applicable to your hardware.

Here is an example configuration with hardware acceleration configured for Intel processors with an integrated GPU using the [preset](../configuration/ffmpeg_presets.md):

```yaml
mqtt: ...

cameras:
  camera_1:
    ffmpeg:
      inputs: ...
      hwaccel_args: preset-vaapi
    detect: ...
```

### Step 4: Configure detectors

By default, Frigate will use a single CPU detector. If you have a USB Coral, you will need to add a detectors section to your config.

```yaml
mqtt: ...

detectors: # <---- add detectors
  coral:
    type: edgetpu
    device: usb

cameras:
  camera_1:
    ffmpeg: ...
    detect:
      enabled: True # <---- turn on detection
      ...
```

More details on available detectors can be found [here](../configuration/detectors.md).

Restart Frigate and you should start seeing detections for `person`. If you want to track other objects, they will need to be added according to the [configuration file reference](../configuration/index.md#full-configuration-reference).

### Step 5: Setup motion masks

Now that you have optimized your configuration for decoding the video stream, you will want to check to see where to implement motion masks. To do this, navigate to the camera in the UI, select "Debug" at the top, and enable "Motion boxes" in the options below the video feed. Watch for areas that continuously trigger unwanted motion to be detected. Common areas to mask include camera timestamps and trees that frequently blow in the wind. The goal is to avoid wasting object detection cycles looking at these areas.

Now that you know where you need to mask, use the "Mask & Zone creator" in the options pane to generate the coordinates needed for your config file. More information about masks can be found [here](../configuration/masks.md).

:::caution

Note that motion masks should not be used to mark out areas where you do not want objects to be detected or to reduce false positives. They do not alter the image sent to object detection, so you can still get events and detections in areas with motion masks. These only prevent motion in these areas from initiating object detection.

:::

Your configuration should look similar to this now.

```yaml
mqtt:
  enabled: False

detectors:
  coral:
    type: edgetpu
    device: usb

cameras:
  camera_1:
    ffmpeg:
      inputs:
        - path: rtsp://10.0.10.10:554/rtsp
          roles:
            - detect
    detect:
      width: 1280
      height: 720
    motion:
      mask:
        - 0,461,3,0,1919,0,1919,843,1699,492,1344,458,1346,336,973,317,869,375,866,432
```

### Step 6: Enable recording and/or snapshots

In order to see Events in the Frigate UI, either snapshots or record will need to be enabled.

#### Record

To enable recording video, add the `record` role to a stream and enable it in the config. If record is disabled in the config, turning it on via the UI will not have any effect.

```yaml
mqtt: ...

detectors: ...

cameras:
  camera_1:
    ffmpeg:
      inputs:
        - path: rtsp://10.0.10.10:554/rtsp
          roles:
            - detect
        - path: rtsp://10.0.10.10:554/high_res_stream # <----- Add stream you want to record from
          roles:
            - record
    detect: ...
    record: # <----- Enable recording
      enabled: True
    motion: ...
```

If you don't have separate streams for detect and record, you would just add the record role to the list on the first input.

By default, Frigate will retain video of all events for 10 days. The full set of options for recording can be found [here](../configuration/index.md#full-configuration-reference).

#### Snapshots

To enable snapshots of your events, just enable it in the config. Snapshots are taken from the detect stream because it is the only stream decoded.

```yaml
mqtt: ...

detectors: ...

cameras:
  camera_1: ...
    detect: ...
    record: ...
    snapshots: # <----- Enable snapshots
      enabled: True
    motion: ...
```

By default, Frigate will retain snapshots of all events for 10 days. The full set of options for snapshots can be found [here](../configuration/index.md#full-configuration-reference).

### Step 7: Follow up guides

Now that you have a working install, you can use the following guides for additional features:

1. [Configuring go2rtc](configuring_go2rtc) - Additional live view options and RTSP relay
2. [Home Assistant Integration](../integrations/home-assistant.md) - Integrate with Home Assistant
