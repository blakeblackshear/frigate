---
id: objects
title: Available Objects
---

import ConfigTabs from "@site/src/components/ConfigTabs";
import TabItem from "@theme/TabItem";
import NavPath from "@site/src/components/NavPath";
import labels from "../../../labelmap.txt";

Frigate includes the object labels listed below from the Google Coral test data.

Please note:

- `car` is listed twice because `truck` has been renamed to `car` by default. These object types are frequently confused.
- `person` is the only tracked object by default. To track additional objects, configure them in the objects settings.

<ul>
  {labels.split("\n").map((label) => (
    <li>{label.replace(/^\d+\s+/, "")}</li>
  ))}
</ul>

## Configuring Tracked Objects

By default, Frigate only tracks `person`. To track additional object types, add them to the tracked objects list.

<ConfigTabs>
<TabItem value="ui">

1. Navigate to <NavPath path="Settings > Global configuration > Objects" />.
   - Add the desired object types to the **Objects to track** list (e.g., `person`, `car`, `dog`)

To override the tracked objects list for a specific camera:

1. Navigate to <NavPath path="Settings > Camera configuration > Objects" />.
   - Add the desired object types to the **Objects to track** list

</TabItem>
<TabItem value="yaml">

```yaml
objects:
  track:
    - person
    - car
    - dog
```

To override at the camera level:

```yaml
cameras:
  front_door:
    objects:
      track:
        - person
        - car
```

</TabItem>
</ConfigTabs>

## Filtering Objects

Object filters help reduce false positives by constraining the size, shape, and confidence thresholds for each object type. Filters can be configured globally or per camera.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Global configuration > Objects" />.

| Field | Description |
|-------|-------------|
| **Object filters > Person > Min Area** | Minimum bounding box area in pixels (or decimal for percentage of frame) |
| **Object filters > Person > Max Area** | Maximum bounding box area in pixels (or decimal for percentage of frame) |
| **Object filters > Person > Min Ratio** | Minimum width/height ratio of the bounding box |
| **Object filters > Person > Max Ratio** | Maximum width/height ratio of the bounding box |
| **Object filters > Person > Min Score** | Minimum score for the object to initiate tracking |
| **Object filters > Person > Threshold** | Minimum computed score to be considered a true positive |

To override filters for a specific camera, navigate to <NavPath path="Settings > Camera configuration > Objects" />.

</TabItem>
<TabItem value="yaml">

```yaml
objects:
  filters:
    person:
      min_area: 5000
      max_area: 100000
      min_ratio: 0.5
      max_ratio: 2.0
      min_score: 0.5
      threshold: 0.7
```

To override at the camera level:

```yaml
cameras:
  front_door:
    objects:
      filters:
        person:
          min_area: 5000
          threshold: 0.7
```

</TabItem>
</ConfigTabs>

## Object Filter Masks

Object filter masks prevent specific object types from being detected in certain areas of the camera frame. These masks check the bottom center of the bounding box. A global mask applies to all object types, while per-object masks apply only to the specified type.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Global configuration > Objects" />.

| Field | Description |
|-------|-------------|
| **Object mask > Mask1 > Friendly Name / Enabled / Coordinates** | Global object filter mask that applies to all object types |
| **Object filters > Person > Mask > Mask1 > Friendly Name / Enabled / Coordinates** | Per-object mask that applies only to the specified object type |

To configure masks for a specific camera, navigate to <NavPath path="Settings > Camera configuration > Objects" />.

</TabItem>
<TabItem value="yaml">

```yaml
objects:
  # Global mask applied to all object types
  mask:
    mask1:
      friendly_name: "Object filter mask area"
      enabled: true
      coordinates: "0.000,0.000,0.781,0.000,0.781,0.278,0.000,0.278"
  # Per-object mask
  filters:
    person:
      mask:
        mask1:
          friendly_name: "Person filter mask"
          enabled: true
          coordinates: "0.000,0.000,0.781,0.000,0.781,0.278,0.000,0.278"
```

</TabItem>
</ConfigTabs>

:::note

The global mask is combined with any object-specific mask. Both are checked based on the bottom center of the bounding box.

:::

## Custom Models

Models for both CPU and EdgeTPU (Coral) are bundled in the image. You can use your own models with volume mounts:

- CPU Model: `/cpu_model.tflite`
- EdgeTPU Model: `/edgetpu_model.tflite`
- Labels: `/labelmap.txt`

You also need to update the [model config](advanced.md#model) if they differ from the defaults.
