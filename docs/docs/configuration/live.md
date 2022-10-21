---
id: live
title: Live View
---

Frigate has different live view options, some of which require [restream](restream.md) to be enabled.

## Live View Options

Live view options can be specified globally and per-camera using `live -> source`. The options are:

| Source | Latency | Frame Rate                             | Resolution     | Audio                       | Requires Restream | Other Limitations  |
| ------ | ------- | -------------------------------------- | -------------- | --------------------------- | ----------------- | ------------------ |
| jsmpeg | low     | same as `detect -> fps`, capped at 10  | same as detect | no                          | no                | none               |
| mp4    | high    | native                                 | native         | not yet                     | yes               | none               |
| webrtc | low     | native                                 | native         | yes (depends on browser)    | yes               | requires host mode |

### webRTC host mode

webRTC works by creating a websocket connection on 2 random UDP ports (1 for video, 1 for audio). This means that frigate must be run with `network_mode: host` to support the webRTC live view mode.
