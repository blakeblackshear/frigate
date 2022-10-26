---
id: live
title: Live View
---

Frigate has different live view options, some of which require [restream](restream.md) to be enabled.

## Live View Options

Live view options can be selected while viewing the live stream. The options are:

| Source | Latency | Frame Rate                             | Resolution     | Audio                       | Requires Restream | Other Limitations     |
| ------ | ------- | -------------------------------------- | -------------- | --------------------------- | ----------------- | --------------------- |
| jsmpeg | low     | same as `detect -> fps`, capped at 10  | same as detect | no                          | no                | none                  |
| mp4    | high    | native                                 | native         | not yet                     | yes               | none                  |
| webrtc | low     | native                                 | native         | yes (depends on browser)    | yes               | requires extra config |

### webRTC extra configuration

webRTC works by creating a websocket connection on extra ports. Requirements for webRTC to work:
* A viable port must be accessible, so one of the following must be true:
    * Frigate is run with `network_mode: host` to support automatic UDP port pass through.
    * Port `8555` is port forwarded to port `8555` on the frigate device.
* For local webRTC, you will need to create your own go2rtc config:

```yaml
webrtc:
  listen: ":8555"
  candidates:
    - ip.ad.dr.ess:8555
    - stun:8555
```

and pass that config to frigate via docker or `frigate-go2rtc.yaml` for addon users:

```yaml
volumes:
  - /path/to/your/go2rtc.yml:/config/frigate-go2rtc.yml:ro
```