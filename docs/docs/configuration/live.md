---
id: live
title: Live View
---

Frigate has different live view options, some of which require [restream](restream.md) to be enabled.

## Live View Options

Live view options can be specified globally and per-camera using `live -> source`. The options are:

| Source | Latency | Frame Rate                             | Resolution     | Audio                       | Requires Restream |
| ------ | ------- | -------------------------------------- | -------------- | --------------------------- | ----------------- |
| jsmpeg | low     | same as `detect -> fps`, capped at 10  | same as detect | no                          | no                |
| mp4    | high    | native                                 | native         | not yet                     | yes               |
| webrtc | low     | native                                 | native         | yes (depends on browser)    | yes               |
