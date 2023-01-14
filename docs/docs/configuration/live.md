---
id: live
title: Live View
---

Frigate has different live view options, some of which require [restream](restream.md) to be enabled.

## Live View Options

Live view options can be selected while viewing the live stream. The options are:

| Source | Latency | Frame Rate                             | Resolution     | Audio                        | Requires Restream | Other Limitations                            |
| ------ | ------- | -------------------------------------- | -------------- | ---------------------------- | ----------------- | -------------------------------------------- |
| jsmpeg | low     | same as `detect -> fps`, capped at 10  | same as detect | no                           | no                | none                                         |
| mse    | low     | native                                 | native         | yes (depends on audio codec) | yes               | not supported on iOS, Firefox is h.264 only  |
| webrtc | lowest  | native                                 | native         | yes (depends on audio codec) | yes               | requires extra config, doesn't support h.265 |

### WebRTC extra configuration:

WebRTC works by creating a WebSocket connection on port `8555`. However, it requires additional configuration:

* For external access, over internet, setup your router to forward port `8555` to port `8555` on the Frigate device.
* For internal/local access, you will need to let go2rtc know your own go2rtc config:
    1. Create your own go2rtc config, based on [Frigate's internal go2rtc config](https://github.com/blakeblackshear/frigate/blob/dev/docker/rootfs/usr/local/go2rtc/go2rtc.yaml).
    2. Add your internal IP to the list of `candidates`. Here is an example, assuming that `192.168.1.10` is the local IP of the device running Frigate:

        ```yaml
        log:
          format: text

        webrtc:
          listen: ":8555"
          candidates:
            - 192.168.1.10:8555
            - stun:8555
        ```

    3. Place this config file at `/config/frigate-go2rtc.yaml`. Here is an example, if you run Frigate through docker-compose:

        ```yaml
        volumes:
          - /path/to/your/go2rtc.yaml:/config/frigate-go2rtc.yaml:ro
        ```

See https://github.com/AlexxIT/go2rtc#module-webrtc for more information about this.
