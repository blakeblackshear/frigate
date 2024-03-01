---
id: index
title: Frigate Configuration
---

For Home Assistant Addon installations, the config file needs to be in the root of your Home Assistant config directory (same location as `configuration.yaml`). It can be named `frigate.yaml` or `frigate.yml`, but if both files exist `frigate.yaml` will be preferred and `frigate.yml` will be ignored.

For all other installation types, the config file should be mapped to `/config/config.yml` inside the container.

It is recommended to start with a minimal configuration and add to it as described in [this guide](../guides/getting_started.md) and use the built in configuration editor in Frigate's UI which supports validation.

```yaml
mqtt:
  enabled: False

cameras:
  dummy_camera: # <--- this will be changed to your actual camera later
    enabled: False
    ffmpeg:
      inputs:
        - path: rtsp://127.0.0.1:554/rtsp
          roles:
            - detect
```

## VSCode Configuration Schema

VSCode supports JSON schemas for automatically validating configuration files. You can enable this feature by adding `# yaml-language-server: $schema=http://frigate_host:5000/api/config/schema.json` to the beginning of the configuration file. Replace `frigate_host` with the IP address or hostname of your Frigate server. If you're using both VSCode and Frigate as an add-on, you should use `ccab4aaf-frigate` instead. Make sure to expose port `5000` for the Web Interface when accessing the config from VSCode on another machine.

## Environment Variable Substitution

Frigate supports the use of environment variables starting with `FRIGATE_` **only** where specifically indicated in the [reference config](./reference.md). For example, the following values can be replaced at runtime by using environment variables:

```yaml
mqtt:
  user: "{FRIGATE_MQTT_USER}"
  password: "{FRIGATE_MQTT_PASSWORD}"
```

```yaml
- path: rtsp://{FRIGATE_RTSP_USER}:{FRIGATE_RTSP_PASSWORD}@10.0.10.10:8554/unicast
```

```yaml
onvif:
  host: 10.0.10.10
  port: 8000
  user: "{FRIGATE_RTSP_USER}"
  password: "{FRIGATE_RTSP_PASSWORD}"
```

```yaml
go2rtc:
  rtsp:
    username: "{FRIGATE_GO2RTC_RTSP_USERNAME}"
    password: "{FRIGATE_GO2RTC_RTSP_PASSWORD}"
```

## Common configuration examples

Here are some common starter configuration examples. Refer to the [reference config](./reference.md) for detailed information about all the config values.

### Raspberry Pi Home Assistant Addon with USB Coral

- Single camera with 720p, 5fps stream for detect
- MQTT connected to home assistant mosquitto addon
- Hardware acceleration for decoding video
- USB Coral detector
- Save all video with any detectable motion for 7 days regardless of whether any objects were detected or not
- Continue to keep all video if it was during any event for 30 days
- Save snapshots for 30 days
- Motion mask for the camera timestamp

```yaml
mqtt:
  host: core-mosquitto
  user: mqtt-user
  password: xxxxxxxxxx

ffmpeg:
  hwaccel_args: preset-rpi-64-h264

detectors:
  coral:
    type: edgetpu
    device: usb

record:
  enabled: True
  retain:
    days: 7
    mode: motion
  events:
    retain:
      default: 30
      mode: motion

snapshots:
  enabled: True
  retain:
    default: 30

cameras:
  name_of_your_camera:
    detect:
      width: 1280
      height: 720
      fps: 5
    ffmpeg:
      inputs:
        - path: rtsp://10.0.10.10:554/rtsp
          roles:
            - detect
    motion:
      mask:
        - 0,461,3,0,1919,0,1919,843,1699,492,1344,458,1346,336,973,317,869,375,866,432
```

### Standalone Intel Mini PC with USB Coral

- Single camera with 720p, 5fps stream for detect
- MQTT disabled (not integrated with home assistant)
- VAAPI hardware acceleration for decoding video
- USB Coral detector
- Save all video with any detectable motion for 7 days regardless of whether any objects were detected or not
- Continue to keep all video if it was during any event for 30 days
- Save snapshots for 30 days
- Motion mask for the camera timestamp

```yaml
mqtt:
  enabled: False

ffmpeg:
  hwaccel_args: preset-vaapi

detectors:
  coral:
    type: edgetpu
    device: usb

record:
  enabled: True
  retain:
    days: 7
    mode: motion
  events:
    retain:
      default: 30
      mode: motion

snapshots:
  enabled: True
  retain:
    default: 30

cameras:
  name_of_your_camera:
    detect:
      width: 1280
      height: 720
      fps: 5
    ffmpeg:
      inputs:
        - path: rtsp://10.0.10.10:554/rtsp
          roles:
            - detect
    motion:
      mask:
        - 0,461,3,0,1919,0,1919,843,1699,492,1344,458,1346,336,973,317,869,375,866,432
```

### Home Assistant integrated Intel Mini PC with OpenVino

- Single camera with 720p, 5fps stream for detect
- MQTT connected to same mqtt server as home assistant
- VAAPI hardware acceleration for decoding video
- OpenVino detector
- Save all video with any detectable motion for 7 days regardless of whether any objects were detected or not
- Continue to keep all video if it was during any event for 30 days
- Save snapshots for 30 days
- Motion mask for the camera timestamp

```yaml
mqtt:
  host: 192.168.X.X # <---- same mqtt broker that home assistant uses
  user: mqtt-user
  password: xxxxxxxxxx

ffmpeg:
  hwaccel_args: preset-vaapi

detectors:
  ov:
    type: openvino
    device: AUTO
    model:
      path: /openvino-model/ssdlite_mobilenet_v2.xml

model:
  width: 300
  height: 300
  input_tensor: nhwc
  input_pixel_format: bgr
  labelmap_path: /openvino-model/coco_91cl_bkgr.txt

record:
  enabled: True
  retain:
    days: 7
    mode: motion
  events:
    retain:
      default: 30
      mode: motion

snapshots:
  enabled: True
  retain:
    default: 30

cameras:
  name_of_your_camera:
    detect:
      width: 1280
      height: 720
      fps: 5
    ffmpeg:
      inputs:
        - path: rtsp://10.0.10.10:554/rtsp
          roles:
            - detect
    motion:
      mask:
        - 0,461,3,0,1919,0,1919,843,1699,492,1344,458,1346,336,973,317,869,375,866,432
```
