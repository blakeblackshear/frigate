---
id: config_overrides
title: Global and Camera-Level Configuration
---

import ConfigTabs from "@site/src/components/ConfigTabs";
import TabItem from "@theme/TabItem";
import NavPath from "@site/src/components/NavPath";

Most of Frigate's configuration can be set once for all cameras and then adjusted for individual cameras. The global value acts as the default for every camera, and any camera can override it.

This page explains how that inheritance works. For a tour of the Settings UI itself, see [Frigate Configuration](./config.md).

## The basics

Set a value globally and every camera uses it. Set the same value on a camera and that camera uses its own value instead.

<ConfigTabs>
<TabItem value="ui">

1. Navigate to <NavPath path="Settings > Global configuration > Object detection" /> and set **Detect FPS** to `5`. Every camera now detects at 5 fps.
2. Navigate to <NavPath path="Settings > Camera configuration > Object detection" />, select the `driveway` camera, and set **Detect FPS** to `10`.

The `driveway` camera now detects at 10 fps. Every other camera still uses the global value of 5.

</TabItem>
<TabItem value="yaml">

```yaml
detect:
  fps: 5 # every camera detects at 5 fps

cameras:
  front_door:
    ffmpeg: ...
  driveway:
    ffmpeg: ...
    detect:
      fps: 10 # except this one
```

`front_door` inherits `fps: 5`, and `driveway` uses `10`.

</TabItem>
</ConfigTabs>

## Overrides apply per value, not per section

Overriding one value in a section does not detach the rest of that section. Everything you don't set on the camera still comes from the global configuration.

<ConfigTabs>
<TabItem value="ui">

If you set a camera's **Motion threshold** but leave **Contour area** alone, only the threshold is overridden. The contour area continues to follow <NavPath path="Settings > Global configuration > Motion detection" />, and changing it there still affects that camera.

Open a section to see which values are overridden: the section header indicates how many fields differ from the global configuration.

</TabItem>
<TabItem value="yaml">

```yaml
motion:
  threshold: 30
  contour_area: 10

cameras:
  driveway:
    motion:
      threshold: 40
```

The `driveway` camera ends up with `threshold: 40` and `contour_area: 10`. Only the value you wrote was overridden.

</TabItem>
</ConfigTabs>

## Returning a camera to the global value

<ConfigTabs>
<TabItem value="ui">

A camera section that has its own values shows an **Overridden** badge. To remove the override and go back to inheriting, use the **Reset to Global** button at the bottom of the section.

</TabItem>
<TabItem value="yaml">

Frigate treats a camera value as an override because it is written in the config file, not because it differs from the global value. Repeating the global value under a camera still creates an override:

```yaml
snapshots:
  enabled: true

cameras:
  driveway:
    snapshots:
      enabled: true # this is an override, even though it matches
```

If you later change the global `snapshots.enabled` to `false`, `driveway` keeps saving snapshots, because it has its own value. To make a camera follow the global value again, delete the key from the camera rather than setting it to match.

</TabItem>
</ConfigTabs>

## Lists replace, maps merge

This is the distinction that surprises people most.

**Lists are replaced entirely.** A camera's list does not add to the global list, it takes its place.

<ConfigTabs>
<TabItem value="ui">

The camera page shows the objects the camera is currently tracking, starting from the global list. Changing that selection under <NavPath path="Settings > Camera configuration > Objects" /> replaces the list for that camera, so make sure every object you want tracked is selected, not just the ones you are adding.

</TabItem>
<TabItem value="yaml">

```yaml
objects:
  track:
    - person
    - car

cameras:
  backyard:
    objects:
      track:
        - dog # backyard tracks ONLY dog, not person or car
```

To track `dog` in addition to the global objects, list all of them on the camera.

</TabItem>
</ConfigTabs>

An empty list is a valid override, and is the normal way to opt a camera out of something:

```yaml
review:
  alerts:
    labels:
      - person

cameras:
  street:
    review:
      alerts:
        labels: [] # this camera never creates alerts
```

**Maps are merged key by key.** A camera can add an entry without redeclaring the others.

<ConfigTabs>
<TabItem value="ui">

Adding a filter for one object under <NavPath path="Settings > Camera configuration > Objects" /> does not remove the filters inherited from <NavPath path="Settings > Global configuration > Objects" />. The camera keeps both.

</TabItem>
<TabItem value="yaml">

```yaml
objects:
  filters:
    person:
      min_area: 5000

cameras:
  driveway:
    objects:
      filters:
        car:
          min_area: 10000
```

The `driveway` camera ends up with both the `car` filter it defined and the `person` filter from the global configuration.

</TabItem>
</ConfigTabs>

## Which settings can be overridden

Most, but not all. The [full reference config](./advanced/reference.md) is the authoritative source: sections that support camera-level overrides are marked with the comment `# NOTE: Can be overridden at the camera level`. In the UI, a setting can be overridden if it appears under both <NavPath path="Settings > Global configuration" /> and <NavPath path="Settings > Camera configuration" />.

A few things worth knowing beyond that:

- Some sections are **global only** and have no camera-level equivalent, including `go2rtc`, `genai` providers, `classification`, `telemetry`, `camera_groups`, and `ui`.
- Some sections exist **only at the camera level**, such as `zones` and `onvif`.
- Some sections are **partially overridable**, meaning a camera accepts only a few of the keys available globally. `face_recognition`, `lpr`, and `audio_transcription` work this way, and the reference config notes which keys apply.

## Enrichments that must be enabled globally first

License plate recognition and face recognition are special: the global setting is not just a default, it is a switch that must be on before any camera can use the feature. Enabling one on a camera while it is disabled globally is a configuration error, and Frigate will refuse to start:

```
Camera driveway has lpr enabled but lpr is disabled at the global level of the config. You must enable lpr at the global level.
```

Enable the feature globally, then turn it off on the cameras that don't need it.

<ConfigTabs>
<TabItem value="ui">

1. Navigate to <NavPath path="Settings > Global configuration > License plate recognition" /> and enable **LPR**.
2. Navigate to <NavPath path="Settings > Camera configuration > License plate recognition" />, select each camera that should not run LPR, and disable the **Enable LPR** toggle.

</TabItem>
<TabItem value="yaml">

```yaml
lpr:
  enabled: true

cameras:
  driveway:
    ffmpeg: ... # inherits lpr, enabled
  backyard:
    ffmpeg: ...
    lpr:
      enabled: false # opted out
```

</TabItem>
</ConfigTabs>

:::note

This applies only to `lpr` and `face_recognition`, because the global setting controls whether the supporting background process starts at all. Other features do not work this way. Audio transcription, for example, can be enabled on a single camera without being enabled globally.

:::

## Profiles

[Profiles](./profiles.md) add a further layer on top of everything described above. A profile is a named set of camera overrides that you can switch on and off while Frigate is running, for example to change detection and recording behavior when you leave the house.

Profiles are applied on top of a camera's already-resolved configuration, so a profile value wins over both the camera and the global value while that profile is active. Profiles cover a subset of the camera sections and do not modify your config file.

## Summary

- A camera inherits every value you don't set on it.
- Overriding one value does not detach the rest of the section.
- Writing a value on a camera overrides it, even if it matches the global value. Remove it to inherit again.
- Lists replace the global list. Maps merge into it.
- An empty list is an override, not an omission.
- `lpr` and `face_recognition` must be enabled globally before a camera can use them.
