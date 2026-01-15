---
id: index
title: Frigate Configuration
---

For Home Assistant Add-on installations, the config file should be at `/addon_configs/<addon_directory>/config.yml`, where `<addon_directory>` is specific to the variant of the Frigate Add-on you are running. See the list of directories [here](#accessing-add-on-config-dir).

For all other installation types, the config file should be mapped to `/config/config.yml` inside the container.

It can be named `config.yml` or `config.yaml`, but if both files exist `config.yml` will be preferred and `config.yaml` will be ignored.

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

## Accessing the Home Assistant Add-on configuration directory {#accessing-add-on-config-dir}

When running Frigate through the HA Add-on, the Frigate `/config` directory is mapped to `/addon_configs/<addon_directory>` in the host, where `<addon_directory>` is specific to the variant of the Frigate Add-on you are running.

| Add-on Variant             | Configuration directory                   |
| -------------------------- | ----------------------------------------- |
| Frigate                    | `/addon_configs/ccab4aaf_frigate`         |
| Frigate (Full Access)      | `/addon_configs/ccab4aaf_frigate-fa`      |
| Frigate Beta               | `/addon_configs/ccab4aaf_frigate-beta`    |
| Frigate Beta (Full Access) | `/addon_configs/ccab4aaf_frigate-fa-beta` |

**Whenever you see `/config` in the documentation, it refers to this directory.**

If for example you are running the standard Add-on variant and use the [VS Code Add-on](https://github.com/hassio-addons/addon-vscode) to browse your files, you can click _File_ > _Open folder..._ and navigate to `/addon_configs/ccab4aaf_frigate` to access the Frigate `/config` directory and edit the `config.yaml` file. You can also use the built-in file editor in the Frigate UI to edit the configuration file.

## VS Code Configuration Schema

VS Code supports JSON schemas for automatically validating configuration files. You can enable this feature by adding `# yaml-language-server: $schema=http://frigate_host:5000/api/config/schema.json` to the beginning of the configuration file. Replace `frigate_host` with the IP address or hostname of your Frigate server. If you're using both VS Code and Frigate as an Add-on, you should use `ccab4aaf-frigate` instead. Make sure to expose the internal unauthenticated port `5000` when accessing the config from VS Code on another machine.

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

```yaml
genai:
  api_key: "{FRIGATE_GENAI_API_KEY}"
```

## Common configuration examples

Here are some common starter configuration examples. Refer to the [reference config](./reference.md) for detailed information about all the config values.

### Raspberry Pi Home Assistant Add-on with USB Coral

- Single camera with 720p, 5fps stream for detect
- MQTT connected to the Home Assistant Mosquitto Add-on
- Hardware acceleration for decoding video
- USB Coral detector
- Save all video with any detectable motion for 7 days regardless of whether any objects were detected or not
- Continue to keep all video if it qualified as an alert or detection for 30 days
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
  motion:
    days: 7
  alerts:
    retain:
      days: 30
      mode: motion
  detections:
    retain:
      days: 30
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
        timestamp:
          friendly_name: "Camera timestamp"
          enabled: true
          coordinates: "0.000,0.427,0.002,0.000,0.999,0.000,0.999,0.781,0.885,0.456,0.700,0.424,0.701,0.311,0.507,0.294,0.453,0.347,0.451,0.400"
```

### Standalone Intel Mini PC with USB Coral

- Single camera with 720p, 5fps stream for detect
- MQTT disabled (not integrated with home assistant)
- VAAPI hardware acceleration for decoding video
- USB Coral detector
- Save all video with any detectable motion for 7 days regardless of whether any objects were detected or not
- Continue to keep all video if it qualified as an alert or detection for 30 days
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
  motion:
    days: 7
  alerts:
    retain:
      days: 30
      mode: motion
  detections:
    retain:
      days: 30
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
        timestamp:
          friendly_name: "Camera timestamp"
          enabled: true
          coordinates: "0.000,0.427,0.002,0.000,0.999,0.000,0.999,0.781,0.885,0.456,0.700,0.424,0.701,0.311,0.507,0.294,0.453,0.347,0.451,0.400"
```

### Home Assistant integrated Intel Mini PC with OpenVino

- Single camera with 720p, 5fps stream for detect
- MQTT connected to same mqtt server as home assistant
- VAAPI hardware acceleration for decoding video
- OpenVino detector
- Save all video with any detectable motion for 7 days regardless of whether any objects were detected or not
- Continue to keep all video if it qualified as an alert or detection for 30 days
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
  width: 300
  height: 300
  input_tensor: nhwc
  input_pixel_format: bgr
  path: /openvino-model/ssdlite_mobilenet_v2.xml
  labelmap_path: /openvino-model/coco_91cl_bkgr.txt

record:
  enabled: True
  motion:
    days: 7
  alerts:
    retain:
      days: 30
      mode: motion
  detections:
    retain:
      days: 30
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
        timestamp:
          friendly_name: "Camera timestamp"
          enabled: true
          coordinates: "0.000,0.427,0.002,0.000,0.999,0.000,0.999,0.781,0.885,0.456,0.700,0.424,0.701,0.311,0.507,0.294,0.453,0.347,0.451,0.400"
```
