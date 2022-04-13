---
id: record
title: Recording
---

Recordings can be enabled and are stored at `/media/frigate/recordings`. The folder structure for the recordings is `YYYY-MM/DD/HH/<camera_name>/MM.SS.mp4`. These recordings are written directly from your camera stream without re-encoding. Each camera supports a configurable retention policy in the config. Frigate chooses the largest matching retention value between the recording retention and the event retention when determining if a recording should be removed.

H265 recordings can be viewed in Edge and Safari only. All other browsers require recordings to be encoded with H264.

## What if I don't want 24/7 recordings?

If you only used clips in previous versions with recordings disabled, you can use the following config to get the same behavior. This is also the default behavior when recordings are enabled.

```yaml
record:
  enabled: True
  events:
    retain:
      default: 10
```

This configuration will retain recording segments that overlap with events and have active tracked objects for 10 days. Because multiple events can reference the same recording segments, this avoids storing duplicate footage for overlapping events and reduces overall storage needs.

When `retain_days` is set to `0`, segments will be deleted from the cache if no events are in progress.
