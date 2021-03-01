---
id: hardware
title: Recommended hardware
---

## Cameras

Cameras that output H.264 video and AAC audio will offer the most compatibility with all features of Frigate and HomeAssistant. It is also helpful if your camera supports multiple substreams to allow different resolutions to be used for detection, streaming, clips, and recordings without re-encoding.

## Computer

| Name                    | Inference Speed | Notes                                                                                                                         |
| ----------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Atomic Pi               | 16ms            | Good option for a dedicated low power board with a small number of cameras. Can leverage Intel QuickSync for stream decoding. |
| Intel NUC NUC7i3BNK     | 8-10ms          | Great performance. Can handle many cameras at 5fps depending on typical amounts of motion.                                    |
| BMAX B2 Plus            | 10-12ms         | Good balance of performance and cost. Also capable of running many other services at the same time as frigate.                |
| Minisforum GK41         | 9-10ms          | Great alternative to a NUC with dual Gigabit NICs. Easily handles several 1080p cameras.                                      |
| Raspberry Pi 3B (32bit) | 60ms            | Can handle a small number of cameras, but the detection speeds are slow due to USB 2.0.                                       |
| Raspberry Pi 4 (32bit)  | 15-20ms         | Can handle a small number of cameras. The 2GB version runs fine.                                                              |
| Raspberry Pi 4 (64bit)  | 10-15ms         | Can handle a small number of cameras. The 2GB version runs fine.                                                              |

## Unraid

Many people have powerful enough NAS devices or home servers to also run docker. There is a Unraid Community App.
To install make sure you have the [community app plugin here](https://forums.unraid.net/topic/38582-plug-in-community-applications/). Then search for "Frigate" in the apps section within Unraid - you can see the online store [here](https://unraid.net/community/apps?q=frigate#r)

| Name                    | Inference Speed | Notes                                                                                                                         |
| ----------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [M2 Coral Edge TPU](http://coral.ai)       | 6.2ms            | Install the Coral plugin from Unraid Community App Center [info here](https://forums.unraid.net/topic/98064-support-blakeblackshear-frigate/?do=findComment&comment=949789)                         |
