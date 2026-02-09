---
id: snapshots
title: Snapshots
---

Frigate can save a snapshot image to `/media/frigate/clips` for each object that is detected named as `<camera>-<id>.jpg`. They are also accessible [via the api](../integrations/api/event-snapshot-events-event-id-snapshot-jpg-get.api.mdx)

Snapshots are accessible in the UI in the Explore pane. This allows for quick submission to the Frigate+ service.

To only save snapshots for objects that enter a specific zone, [see the zone docs](./zones.md#restricting-snapshots-to-specific-zones)

Snapshots sent via MQTT are configured in the [config file](/configuration) under `cameras -> your_camera -> mqtt`

## Frame Selection

Frigate does not save every frame — it picks a single "best" frame for each tracked object and uses it for both the snapshot and clean copy. As the object is tracked across frames, Frigate continuously evaluates whether the current frame is better than the previous best based on detection confidence, object size, and the presence of key attributes like faces or license plates. Frames where the object touches the edge of the frame are deprioritized. The snapshot is written to disk once tracking ends using whichever frame was determined to be the best.

MQTT snapshots are published more frequently — each time a better thumbnail frame is found during tracking, or when the current best image is older than `best_image_timeout` (default: 60s). These use their own annotation settings configured under `cameras -> your_camera -> mqtt`.

## Clean Copy

Frigate can produce up to two snapshot files per event, each used in different places:

| Version | File | Annotations | Used by |
| --- | --- | --- | --- |
| **Regular snapshot** | `<camera>-<id>.jpg` | Respects your `timestamp`, `bounding_box`, `crop`, and `height` settings | API (`/api/events/<id>/snapshot.jpg`), MQTT (`<camera>/<label>/snapshot`), Explore pane in the UI |
| **Clean copy** | `<camera>-<id>-clean.webp` | Always unannotated — no bounding box, no timestamp, no crop, full resolution | API (`/api/events/<id>/snapshot-clean.webp`), [Frigate+](/plus/first_model) submissions, "Download Clean Snapshot" in the UI |

MQTT snapshots are configured separately under `cameras -> your_camera -> mqtt` and are unrelated to the clean copy.

The clean copy is required for submitting events to [Frigate+](/plus/first_model) — if you plan to use Frigate+, keep `clean_copy` enabled regardless of your other snapshot settings.

If you are not using Frigate+ and `timestamp`, `bounding_box`, and `crop` are all disabled, the regular snapshot is already effectively clean, so `clean_copy` provides no benefit and only uses additional disk space. You can safely set `clean_copy: False` in this case.
