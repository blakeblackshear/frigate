---
id: getting_started
title: Creating a config file
---

This guide walks through the steps to build a configuration file for Frigate. It assumes that you already have an environment setup as described in [Installation](../frigate/installation.md). You should also configure your cameras according to the [camera setup guide](/guides/camera_setup)

### Step 1: Configure the MQTT server

Frigate requires a functioning MQTT server. Start by adding the mqtt section at the top level in your config:

```yaml
mqtt:
  host: <ip of your mqtt server>
```

If using the Mosquitto Addon in Home Assistant, a username and password is required. For example:

```yaml
mqtt:
  host: <ip of your mqtt server>
  user: <username>
  password: <password>
```

Frigate supports many configuration options for mqtt. See the [configuration reference](../configuration/index.md#full-configuration-reference) for more info.

### Step 2: Configure detectors

By default, Frigate will use a single CPU detector. If you have a USB Coral, you will need to add a detectors section to your config.

```yaml
mqtt:
  host: <ip of your mqtt server>

detectors:
  coral:
    type: edgetpu
    device: usb
```

More details on available detectors can be found [here](../configuration/detectors.md).

### Step 3: Add a minimal camera configuration

Now let's add the first camera:

:::caution

Note that passwords that contain special characters often cause issues with ffmpeg connecting to the camera. If receiving `end-of-file` or `unauthorized` errors with a verified correct password, try changing the password to something simple to rule out the possibility that the password is the issue.

:::

```yaml
mqtt:
  host: <ip of your mqtt server>

detectors:
  coral:
    type: edgetpu
    device: usb

cameras:
  camera_1: # <------ Name the camera
    ffmpeg:
      inputs:
        - path: rtsp://10.0.10.10:554/rtsp # <----- Update for your camera
          roles:
            - detect
            - rtmp
    rtmp:
      enabled: False # <-- RTMP should be disabled if your stream is not H264
    detect:
      width: 1280 # <---- update for your camera's resolution
      height: 720 # <---- update for your camera's resolution
```

### Step 4: Start Frigate

At this point you should be able to start Frigate and see the the video feed in the UI.

If you get a green image from the camera, this means ffmpeg was not able to get the video feed from your camera. Check the logs for error messages from ffmpeg. The default ffmpeg arguments are designed to work with H264 RTSP cameras that support TCP connections. If you do not have H264 cameras, make sure you have disabled RTMP. It is possible to enable it, but you must tell ffmpeg to re-encode the video with customized output args.

FFmpeg arguments for other types of cameras can be found [here](../configuration/camera_specific.md).

### Step 5: Configure hardware acceleration (optional)

Now that you have a working camera configuration, you want to setup hardware acceleration to minimize the CPU required to decode your video streams. See the [hardware acceleration](../configuration/hardware_acceleration.md) config reference for examples applicable to your hardware.

In order to best evaluate the performance impact of hardware acceleration, it is recommended to temporarily disable detection.

```yaml
mqtt: ...

detectors: ...

cameras:
  camera_1:
    ffmpeg: ...
    detect:
      enabled: False
      ...
```

Here is an example configuration with hardware acceleration configured:

```yaml
mqtt: ...

detectors: ...

cameras:
  camera_1:
    ffmpeg:
      inputs: ...
      hwaccel_args: -c:v h264_v4l2m2m
    detect: ...
```

### Step 6: Setup motion masks

Now that you have optimized your configuration for decoding the video stream, you will want to check to see where to implement motion masks. To do this, navigate to the camera in the UI, select "Debug" at the top, and enable "Motion boxes" in the options below the video feed. Watch for areas that continuously trigger unwanted motion to be detected. Common areas to mask include camera timestamps and trees that frequently blow in the wind. The goal is to avoid wasting object detection cycles looking at these areas.

Now that you know where you need to mask, use the "Mask & Zone creator" in the options pane to generate the coordinates needed for your config file. More information about masks can be found [here](../configuration/masks.md).

:::caution

Note that motion masks should not be used to mark out areas where you do not want objects to be detected or to reduce false positives. They do not alter the image sent to object detection, so you can still get events and detections in areas with motion masks. These only prevent motion in these areas from initiating object detection.

:::

Your configuration should look similar to this now.

```yaml
mqtt:
  host: mqtt.local

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
            - rtmp
    detect:
      width: 1280
      height: 720
    motion:
      mask:
        - 0,461,3,0,1919,0,1919,843,1699,492,1344,458,1346,336,973,317,869,375,866,432
```

### Step 7: Enable recording (optional)

To enable recording video, add the `record` role to a stream and enable it in the config.

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
            - rtmp
        - path: rtsp://10.0.10.10:554/high_res_stream # <----- Add high res stream
          roles:
            - record
    detect: ...
    record: # <----- Enable recording
      enabled: True
    motion: ...
```

If you don't have separate streams for detect and record, you would just add the record role to the list on the first input.

By default, Frigate will retain video of all events for 10 days. The full set of options for recording can be found [here](../configuration/index.md#full-configuration-reference).

### Step 8: Enable snapshots (optional)

To enable snapshots of your events, just enable it in the config.

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
