---
id: index
title: Frigate Configuration
---

import ConfigTabs from "@site/src/components/ConfigTabs";
import TabItem from "@theme/TabItem";
import NavPath from "@site/src/components/NavPath";

Frigate can be configured through the **Settings UI** or by editing the YAML configuration file directly. The Settings UI is the recommended approach — it provides validation and a guided experience for all configuration options.

It is recommended to start with a minimal configuration and add to it as described in [the getting started guide](../guides/getting_started.md).

## Configuration File Location

For users who prefer to edit the YAML configuration file directly:

- **Home Assistant App:** `/addon_configs/<addon_directory>/config.yml` — see [directory list](#accessing-app-config-dir)
- **All other installations:** Map to `/config/config.yml` inside the container

It can be named `config.yml` or `config.yaml`, but if both files exist `config.yml` will be preferred and `config.yaml` will be ignored.

A minimal starting configuration:

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

## Accessing the Home Assistant App configuration directory {#accessing-app-config-dir}

When running Frigate through the HA App, the Frigate `/config` directory is mapped to `/addon_configs/<addon_directory>` in the host, where `<addon_directory>` is specific to the variant of the Frigate App you are running.

| App Variant                | Configuration directory                   |
| -------------------------- | ----------------------------------------- |
| Frigate                    | `/addon_configs/ccab4aaf_frigate`         |
| Frigate (Full Access)      | `/addon_configs/ccab4aaf_frigate-fa`      |
| Frigate Beta               | `/addon_configs/ccab4aaf_frigate-beta`    |
| Frigate Beta (Full Access) | `/addon_configs/ccab4aaf_frigate-fa-beta` |

**Whenever you see `/config` in the documentation, it refers to this directory.**

If for example you are running the standard App variant and use the [VS Code App](https://github.com/hassio-addons/addon-vscode) to browse your files, you can click _File_ > _Open folder..._ and navigate to `/addon_configs/ccab4aaf_frigate` to access the Frigate `/config` directory and edit the `config.yaml` file. You can also use the built-in config editor in the Frigate UI.

## VS Code Configuration Schema

VS Code supports JSON schemas for automatically validating configuration files. You can enable this feature by adding `# yaml-language-server: $schema=http://frigate_host:5000/api/config/schema.json` to the beginning of the configuration file. Replace `frigate_host` with the IP address or hostname of your Frigate server. If you're using both VS Code and Frigate as an App, you should use `ccab4aaf-frigate` instead. Make sure to expose the internal unauthenticated port `5000` when accessing the config from VS Code on another machine.

## Environment Variable Substitution

Frigate supports the use of environment variables starting with `FRIGATE_` **only** where specifically indicated in the [reference config](./reference.md). For example, the following values can be replaced at runtime by using environment variables:

```yaml
mqtt:
  host: "{FRIGATE_MQTT_HOST}"
  user: "{FRIGATE_MQTT_USER}"
  password: "{FRIGATE_MQTT_PASSWORD}"
```

```yaml
- path: rtsp://{FRIGATE_RTSP_USER}:{FRIGATE_RTSP_PASSWORD}@10.0.10.10:8554/unicast
```

```yaml
onvif:
  host: "192.168.1.12"
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

Here are some common starter configuration examples. These can be configured through the Settings UI or via YAML. Refer to the [reference config](./reference.md) for detailed information about all config values.

### Raspberry Pi Home Assistant App with USB Coral

- Single camera with 720p, 5fps stream for detect
- MQTT connected to the Home Assistant Mosquitto App
- Hardware acceleration for decoding video
- USB Coral detector
- Save all video with any detectable motion for 7 days regardless of whether any objects were detected or not
- Continue to keep all video if it qualified as an alert or detection for 30 days
- Save snapshots for 30 days
- Motion mask for the camera timestamp

<ConfigTabs>
<TabItem value="ui">

1. Navigate to <NavPath path="Settings > System > MQTT" /> and configure the MQTT connection to your Home Assistant Mosquitto broker
2. Navigate to <NavPath path="Settings > Global configuration > FFmpeg" /> and set **Hardware acceleration arguments** to `Raspberry Pi (H.264)`
3. Navigate to <NavPath path="Settings > System > Detector hardware" /> and add a detector with **Type** `EdgeTPU` and **Device** `usb`
4. Navigate to <NavPath path="Settings > Global configuration > Recording" /> and set **Enable recording** to on, **Motion retention > Retention days** to `7`, **Alert retention > Event retention > Retention days** to `30`, **Alert retention > Event retention > Retention mode** to `motion`, **Detection retention > Event retention > Retention days** to `30`, **Detection retention > Event retention > Retention mode** to `motion`
5. Navigate to <NavPath path="Settings > Global configuration > Snapshots" /> and set **Enable snapshots** to on, **Snapshot retention > Default retention** to `30`
6. Navigate to <NavPath path="Settings > Camera configuration > Management" /> and add your camera with the appropriate RTSP stream URL
7. Navigate to <NavPath path="Settings > Camera configuration > Masks / Zones" /> to add a motion mask for the camera timestamp

</TabItem>
<TabItem value="yaml">

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

</TabItem>
</ConfigTabs>

### Standalone Intel Mini PC with USB Coral

- Single camera with 720p, 5fps stream for detect
- MQTT disabled (not integrated with Home Assistant)
- VAAPI hardware acceleration for decoding video
- USB Coral detector
- Save all video with any detectable motion for 7 days regardless of whether any objects were detected or not
- Continue to keep all video if it qualified as an alert or detection for 30 days
- Save snapshots for 30 days
- Motion mask for the camera timestamp

<ConfigTabs>
<TabItem value="ui">

1. Navigate to <NavPath path="Settings > System > MQTT" /> and set **Enable MQTT** to off
2. Navigate to <NavPath path="Settings > Global configuration > FFmpeg" /> and set **Hardware acceleration arguments** to `VAAPI (Intel/AMD GPU)`
3. Navigate to <NavPath path="Settings > System > Detector hardware" /> and add a detector with **Type** `EdgeTPU` and **Device** `usb`
4. Navigate to <NavPath path="Settings > Global configuration > Recording" /> and set **Enable recording** to on, **Motion retention > Retention days** to `7`, **Alert retention > Event retention > Retention days** to `30`, **Alert retention > Event retention > Retention mode** to `motion`, **Detection retention > Event retention > Retention days** to `30`, **Detection retention > Event retention > Retention mode** to `motion`
5. Navigate to <NavPath path="Settings > Global configuration > Snapshots" /> and set **Enable snapshots** to on, **Snapshot retention > Default retention** to `30`
6. Navigate to <NavPath path="Settings > Camera configuration > Management" /> and add your camera with the appropriate RTSP stream URL
7. Navigate to <NavPath path="Settings > Camera configuration > Masks / Zones" /> to add a motion mask for the camera timestamp

</TabItem>
<TabItem value="yaml">

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

</TabItem>
</ConfigTabs>

### Home Assistant integrated Intel Mini PC with OpenVINO

- Single camera with 720p, 5fps stream for detect
- MQTT connected to same MQTT server as Home Assistant
- VAAPI hardware acceleration for decoding video
- OpenVINO detector
- Save all video with any detectable motion for 7 days regardless of whether any objects were detected or not
- Continue to keep all video if it qualified as an alert or detection for 30 days
- Save snapshots for 30 days
- Motion mask for the camera timestamp

<ConfigTabs>
<TabItem value="ui">

1. Navigate to <NavPath path="Settings > System > MQTT" /> and configure the connection to your MQTT broker
2. Navigate to <NavPath path="Settings > Global configuration > FFmpeg" /> and set **Hardware acceleration arguments** to `VAAPI (Intel/AMD GPU)`
3. Navigate to <NavPath path="Settings > System > Detector hardware" /> and add a detector with **Type** `openvino` and **Device** `AUTO`
4. Navigate to <NavPath path="Settings > System > Detection model" /> and configure the OpenVINO model path and settings
5. Navigate to <NavPath path="Settings > Global configuration > Recording" /> and set **Enable recording** to on, **Motion retention > Retention days** to `7`, **Alert retention > Event retention > Retention days** to `30`, **Alert retention > Event retention > Retention mode** to `motion`, **Detection retention > Event retention > Retention days** to `30`, **Detection retention > Event retention > Retention mode** to `motion`
6. Navigate to <NavPath path="Settings > Global configuration > Snapshots" /> and set **Enable snapshots** to on, **Snapshot retention > Default retention** to `30`
7. Navigate to <NavPath path="Settings > Camera configuration > Management" /> and add your camera with the appropriate RTSP stream URL
8. Navigate to <NavPath path="Settings > Camera configuration > Masks / Zones" /> to add a motion mask for the camera timestamp

</TabItem>
<TabItem value="yaml">

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

</TabItem>
</ConfigTabs>
