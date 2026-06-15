---
id: snapshots
title: Snapshots
---

import ConfigTabs from "@site/src/components/ConfigTabs";
import TabItem from "@theme/TabItem";
import NavPath from "@site/src/components/NavPath";

A snapshot is a single still image that captures a tracked object at its best moment — the clearest frame Frigate saw while following that object across the scene. Unlike a [recording](./record.md), which is continuous video, a snapshot is one representative image saved per tracked object once tracking ends.

When snapshots are enabled, Frigate saves one image to `/media/frigate/clips` for each tracked object, named `<camera>-<id>-clean.webp`. A clean image is always stored without any annotations (no timestamp, bounding boxes, or cropping) so you have an unmodified copy of the original frame. Annotations like bounding boxes and timestamps are applied on demand when a snapshot is requested [via the HTTP API](../integrations/api/event-snapshot-events-event-id-snapshot-jpg-get.api.mdx) — see [Rendering](#rendering) below.

A few things to keep in mind:

- Snapshots are saved per tracked object, so a camera with no detected objects produces no snapshots even if recording is enabled.
- Snapshots and recordings are configured and retained independently — enabling one does not enable the other.
- Snapshots are accessible in the UI in the Explore pane, which allows for quick submission to the Frigate+ service.
- To only save snapshots for objects that enter a specific zone, [see the zone docs](./zones.md#restricting-snapshots-to-specific-zones).
- Snapshots sent via MQTT are configured separately under the camera MQTT settings, not here.

## Enabling Snapshots

Enable snapshot saving and configure the default settings that apply to all cameras.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Global configuration > Snapshots" />.

- Set **Enable snapshots** to on

</TabItem>
<TabItem value="yaml">

```yaml
snapshots:
  enabled: True
```

</TabItem>
</ConfigTabs>

To override snapshot settings for a specific camera:

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Camera configuration > Snapshots" /> and select your camera.

- Set **Enable snapshots** to on

</TabItem>
<TabItem value="yaml">

```yaml
cameras:
  front_door:
    snapshots:
      enabled: True
```

</TabItem>
</ConfigTabs>

## Snapshot Options

Configure how snapshots are rendered and stored. These settings control the defaults applied when snapshots are requested via the API.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Global configuration > Snapshots" />.

| Field                    | Description                                                                    |
| ------------------------ | ------------------------------------------------------------------------------ |
| **Enable snapshots**     | Enable or disable saving snapshots for tracked objects                         |
| **Timestamp overlay**    | Overlay a timestamp on snapshots from API                                      |
| **Bounding box overlay** | Draw bounding boxes for tracked objects on snapshots from API                  |
| **Crop snapshot**        | Crop snapshots from API to the detected object's bounding box                  |
| **Snapshot height**      | Height in pixels to resize snapshots to; leave empty to preserve original size |
| **Snapshot quality**     | Encode quality for saved snapshots (0-100)                                     |
| **Required zones**       | Zones an object must enter for a snapshot to be saved                          |

</TabItem>
<TabItem value="yaml">

```yaml
snapshots:
  enabled: True
  timestamp: False
  bounding_box: True
  crop: False
  height: 175
  required_zones: []
  quality: 60
```

</TabItem>
</ConfigTabs>

## Snapshot Retention

Configure how long snapshots are retained on disk. Per-object retention overrides allow different retention periods for specific object types.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Global configuration > Snapshots" />.

| Field                                              | Description                                                                         |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Snapshot retention > Default retention**         | Number of days to retain snapshots (default: 10)                                    |
| **Snapshot retention > Retention mode**            | Retention mode: `all`, `motion`, or `active_objects`                                |
| **Snapshot retention > Object retention > Person** | Per-object overrides for retention days (e.g., keep `person` snapshots for 15 days) |

</TabItem>
<TabItem value="yaml">

```yaml
snapshots:
  enabled: True
  retain:
    default: 10
    mode: motion
    objects:
      person: 15
```

</TabItem>
</ConfigTabs>

## Frame Selection

Frigate does not save every frame. It picks a single "best" frame for each tracked object based on detection confidence, object size, and the presence of key attributes like faces or license plates. Frames where the object touches the edge of the frame are deprioritized. That best frame is written to disk once tracking ends.

MQTT snapshots are published more frequently — each time a better thumbnail frame is found during tracking, or when the current best image is older than `best_image_timeout` (default: 60s). These use their own annotation settings configured under the camera MQTT settings.

## Rendering

Frigate stores a single clean snapshot on disk:

| API / Use                                | Result                                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Stored file                              | `<camera>-<id>-clean.webp`, always unannotated                                                        |
| `/api/events/<id>/snapshot.jpg`          | Starts from the camera's `snapshots` defaults, then applies any query param overrides at request time |
| `/api/events/<id>/snapshot-clean.webp`   | Returns the same stored snapshot without annotations                                                  |
| [Frigate+](/plus/first_model) submission | Uses the same stored clean snapshot                                                                   |

MQTT snapshots are configured separately under the camera MQTT settings and are unrelated to the stored event snapshot.
