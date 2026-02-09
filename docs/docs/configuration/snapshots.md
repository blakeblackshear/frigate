---
id: snapshots
title: Snapshots
---

Frigate can save a snapshot image to `/media/frigate/clips` for each object that is detected named as `<camera>-<id>.jpg`. They are also accessible [via the api](../integrations/api/event-snapshot-events-event-id-snapshot-jpg-get.api.mdx)

Snapshots are accessible in the UI in the Explore pane. This allows for quick submission to the Frigate+ service.

To only save snapshots for objects that enter a specific zone, [see the zone docs](./zones.md#restricting-snapshots-to-specific-zones)

Snapshots sent via MQTT are configured in the [config file](/configuration) under `cameras -> your_camera -> mqtt`

## Frame Selection

Frigate does not save every frame — it picks a single "best" frame for each tracked object and uses it for both the snapshot and clean copy. As the object is tracked across frames, Frigate continuously evaluates whether the current frame is better than the previous best. A frame is considered better if:

- It has a **face** attribute (for `person` objects) or **license_plate** attribute (for `car`/`motorcycle` objects) with a larger bounding box area than the current best. Once the current best frame has one of these attributes, it can only be replaced by a frame with an even larger one — score and area improvements alone won't override it.
- The object's detection **score** is more than 5% higher
- The object's detected **area** is more than 10% larger

All scores and areas above refer to the parent object (e.g. `person`, `car`), not the attribute. Frames where the object's bounding box touches the edge of the frame are deprioritized. Image quality (e.g. blurriness) is **not** considered during frame selection — the [`blur_confidence_filter`](/configuration/face_recognition) setting only affects face recognition confidence, not snapshot selection. The snapshot is written to disk once at the end of the event using whichever frame was determined to be the "best".

MQTT snapshots are published more frequently — each time a better thumbnail frame is found during tracking, or when the current best image is older than `best_image_timeout` (default: 60s). These use their own annotation settings configured under `cameras -> your_camera -> mqtt`.

## Clean Copy

Frigate can produce up to two snapshot files per event, each used in different places:

| Version | File | Annotations | Used by |
| --- | --- | --- | --- |
| **Regular snapshot** | `<camera>-<id>.jpg` | Respects your `timestamp`, `bounding_box`, `crop`, and `height` settings | API (`/api/events/<id>/snapshot.jpg`), MQTT (`<camera>/<label>/snapshot`), Explore pane in the UI |
| **Clean copy** | `<camera>-<id>-clean.webp` | Always unannotated — no bounding box, no timestamp, no crop, full resolution | API (`/api/events/<id>/snapshot-clean.webp`), [Frigate+](/plus/first_model) submissions, "Download Clean Snapshot" in the UI |

MQTT snapshots are configured separately under `cameras -> your_camera -> mqtt` and are unrelated to the clean copy.

:::note
Clean copies were previously saved as `.png`. Frigate now saves them as `.webp` for smaller file sizes, but the API will still load legacy `.png` clean copies for older events.
:::

The clean copy is required for submitting events to [Frigate+](/plus/first_model) — if you plan to use Frigate+, keep `clean_copy` enabled regardless of your other snapshot settings.

If you are not using Frigate+ and `timestamp`, `bounding_box`, and `crop` are all disabled, the regular snapshot is already effectively clean, so `clean_copy` provides no benefit and only uses additional disk space. You can safely set `clean_copy: False` in this case.
