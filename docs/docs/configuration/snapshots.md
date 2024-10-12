---
id: snapshots
title: Snapshots
---

Frigate can save a snapshot image to `/media/frigate/clips` for each object that is detected named as `<camera>-<id>.jpg`. They are also accessible [via the api](../integrations/api/event-snapshot-events-event-id-snapshot-jpg-get.api.mdx)

For users with Frigate+ enabled, snapshots are accessible in the UI in the Frigate+ pane to allow for quick submission to the Frigate+ service.

To only save snapshots for objects that enter a specific zone, [see the zone docs](./zones.md#restricting-snapshots-to-specific-zones)

Snapshots sent via MQTT are configured in the [config file](https://docs.frigate.video/configuration/) under `cameras -> your_camera -> mqtt`
