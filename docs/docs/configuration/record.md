---
id: record
title: Recording
---

Recordings can be enabled and are stored at `/media/frigate/recordings`. The folder structure for the recordings is `YYYY-MM/DD/HH/<camera_name>/MM.SS.mp4`. These recordings are written directly from your camera stream without re-encoding. Each camera supports a configurable retention policy in the config.

Exported clips are also created off of these recordings. Frigate chooses the largest matching retention value between the recording retention and the event retention when determining if a recording should be removed.

H265 recordings can be viewed in Edge and Safari only. All other browsers require recordings to be encoded with H264.
