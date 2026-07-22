---
id: config
title: Frigate Configuration
---

import ConfigTabs from "@site/src/components/ConfigTabs";
import TabItem from "@theme/TabItem";
import NavPath from "@site/src/components/NavPath";

Frigate can be configured through the **Settings UI** or by editing the YAML configuration file directly. The Settings UI is the recommended approach. It provides validation and a guided experience for all configuration options.

## Using the Settings UI

The Settings UI groups every configuration option into sections that are listed in the left-hand menu. Each section presents a guided form with validation, so you don't need to remember the structure of the YAML or look up option names by hand.

### Global vs. camera-level configuration

Settings are organized into two scopes:

- **Global configuration**: values under <NavPath path="Settings > Global configuration" /> apply to every camera by default. This is where you set the baseline behavior for object detection, recording, snapshots, motion, and so on.
- **Camera configuration**: values under <NavPath path="Settings > Camera configuration" /> apply to a single camera. Use the camera selector button at the top of these pages to choose which camera you are editing.

When a camera-level section is left untouched, the camera simply inherits the global values. Changing a value on a camera page **overrides** the global value for that camera only: the global setting and every other camera are unaffected. This mirrors how the YAML works, where a value set under `cameras.<name>` takes precedence over the same value set at the top level. See [Global and Camera-Level Configuration](./config_overrides.md) for the full details, including how lists and maps are handled and which settings must be enabled globally first.

To undo an override and go back to inheriting from the parent scope, use the reset button at the bottom of the section:

- On a camera section, the button is labeled **Reset to Global** and restores the camera to the global value.
- On a global section, the button is labeled **Reset to Default** and restores Frigate's built-in default.

Resetting asks for confirmation and cannot be undone once applied.

### Saving changes and the Save All button

Edits are not applied until you save them. As soon as you change a value, the UI tracks it as a pending change:

- The edited section shows a **Modified** badge, and the changed fields are highlighted.
- A **You have unsaved changes** notice appears above the section's **Save** and **Undo** buttons. **Save** commits just that section; **Undo** discards its pending edits.

Because pending changes can span multiple sections (and multiple cameras), the header provides a **Save All** button that writes every pending change at once. Next to it, **Review pending changes** opens a summary that lists each pending edit with its scope (Global or a specific camera), the affected field, and the new value, so you can confirm exactly what will be written before committing. **Undo All** discards every pending change across all sections.

### Restart-required indicators

Most settings take effect immediately, but some require Frigate to restart before they apply. Fields that require a restart are marked with a small restart icon and a **Restart required** tooltip next to the field label.

When you save a change that touches one of these fields, Frigate confirms the save and reminds you that a restart is needed (for example, _"Settings saved successfully. Restart Frigate to apply your changes."_). The notification includes a one-click **Restart Frigate** action so you can apply the change right away, or you can continue editing and restart later.

### The colored dots in the camera configuration menu

When you are working under <NavPath path="Settings > Camera configuration" />, small colored dots can appear next to a section's name in the menu. They give you an at-a-glance summary of that section's state for the selected camera:

- **Blue dot**: this section **overrides the global configuration**. One or more values in the section have been set specifically for this camera and differ from the global defaults.
- **Profile-colored dot**: when you are viewing a [camera profile](./profiles.md), a dot in that profile's assigned color indicates the section is **overridden by that profile**. Each profile is given its own distinct color so you can tell at a glance which sections it changes.
- **Amber dot**: this section has **unsaved changes**. It appears alongside the **Modified** badge whenever you have pending edits in the section that haven't been saved yet.

Hover over any dot to see a tooltip describing what it means. Open a section to see exactly which fields are overridden: the section header indicates how many fields differ from the global (or base) configuration.

## Configuration File Location

For users who prefer to edit the YAML configuration file directly, it is recommended to start with a minimal configuration and add to it as described in [the getting started guide](../guides/getting_started.md).

- **Home Assistant App:** `/addon_configs/<addon_directory>/config.yml` (see [directory list](#accessing-app-config-dir))
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

Frigate supports the use of environment variables starting with `FRIGATE_` **only** where specifically indicated in the [reference config](./advanced/reference.md). For example, the following values can be replaced at runtime by using environment variables:

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
  my_provider:
    api_key: "{FRIGATE_GENAI_API_KEY}"
```

## Common configuration examples

Here are some common starter configuration examples. These can be configured through the Settings UI or via YAML. Refer to the [reference config](./advanced/reference.md) for detailed information about all config values.

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
3. Navigate to <NavPath path="Settings > System > Detectors and model" /> and add a detector with **Type** `EdgeTPU` and **Device** `usb`
4. Navigate to <NavPath path="Settings > Global configuration > Recording" /> and set **Enable recording** to on, **Motion retention > Retention days** to `7`, **Alert retention > Event retention > Retention days** to `30`, **Alert retention > Event retention > Retention mode** to `motion`, **Detection retention > Event retention > Retention days** to `30`, **Detection retention > Event retention > Retention mode** to `motion`
5. Navigate to <NavPath path="Settings > Global configuration > Snapshots" /> and set **Enable snapshots** to on, **Snapshot retention > Default retention** to `30`
6. Navigate to <NavPath path="Settings > Global configuration > Camera management" /> and add your camera with the appropriate RTSP stream URL
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
3. Navigate to <NavPath path="Settings > System > Detectors and model" /> and add a detector with **Type** `EdgeTPU` and **Device** `usb`
4. Navigate to <NavPath path="Settings > Global configuration > Recording" /> and set **Enable recording** to on, **Motion retention > Retention days** to `7`, **Alert retention > Event retention > Retention days** to `30`, **Alert retention > Event retention > Retention mode** to `motion`, **Detection retention > Event retention > Retention days** to `30`, **Detection retention > Event retention > Retention mode** to `motion`
5. Navigate to <NavPath path="Settings > Global configuration > Snapshots" /> and set **Enable snapshots** to on, **Snapshot retention > Default retention** to `30`
6. Navigate to <NavPath path="Settings > Global configuration > Camera management" /> and add your camera with the appropriate RTSP stream URL
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
3. Navigate to <NavPath path="Settings > System > Detectors and model" /> and add a detector with **Type** `openvino` and **Device** `AUTO`
4. On the same page, in the **Custom Model** tab, configure the OpenVINO model path and settings
5. Navigate to <NavPath path="Settings > Global configuration > Recording" /> and set **Enable recording** to on, **Motion retention > Retention days** to `7`, **Alert retention > Event retention > Retention days** to `30`, **Alert retention > Event retention > Retention mode** to `motion`, **Detection retention > Event retention > Retention days** to `30`, **Detection retention > Event retention > Retention mode** to `motion`
6. Navigate to <NavPath path="Settings > Global configuration > Snapshots" /> and set **Enable snapshots** to on, **Snapshot retention > Default retention** to `30`
7. Navigate to <NavPath path="Settings > Global configuration > Camera management" /> and add your camera with the appropriate RTSP stream URL
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
