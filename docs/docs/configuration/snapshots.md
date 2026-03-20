---
id: snapshots
title: Snapshots
---

Frigate can save a snapshot image to `/media/frigate/clips` for each object that is detected named as `<camera>-<id>-clean.webp`. They are also accessible [via the api](../integrations/api/event-snapshot-events-event-id-snapshot-jpg-get.api.mdx)

Snapshots are accessible in the UI in the Explore pane. This allows for quick submission to the Frigate+ service.

To only save snapshots for objects that enter a specific zone, [see the zone docs](./zones.md#restricting-snapshots-to-specific-zones)

Snapshots sent via MQTT are configured in the [config file](/configuration) under `cameras -> your_camera -> mqtt`

## Frame Selection

Frigate does not save every frame. It picks a single "best" frame for each tracked object based on detection confidence, object size, and the presence of key attributes like faces or license plates. Frames where the object touches the edge of the frame are deprioritized. That best frame is written to disk once tracking ends.

MQTT snapshots are published more frequently — each time a better thumbnail frame is found during tracking, or when the current best image is older than `best_image_timeout` (default: 60s). These use their own annotation settings configured under `cameras -> your_camera -> mqtt`.

## Rendering

Frigate stores a single clean snapshot on disk:

| API / Use                                | Result                                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Stored file                              | `<camera>-<id>-clean.webp`, always unannotated                                                        |
| `/api/events/<id>/snapshot.jpg`          | Starts from the camera's `snapshots` defaults, then applies any query param overrides at request time |
| `/api/events/<id>/snapshot-clean.webp`   | Returns the same stored snapshot without annotations                                                  |
| [Frigate+](/plus/first_model) submission | Uses the same stored clean snapshot                                                                   |

MQTT snapshots are configured separately under `cameras -> your_camera -> mqtt` and are unrelated to the stored event snapshot.
