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

WebRTC works by creating a TCP or UDP connection on port `8555`. However, it requires additional configuration:

* For external access, over the internet, setup your router to forward port `8555` to port `8555` on the Frigate device, for both TCP and UDP.
* For internal/local access, you will need to use a custom go2rtc config:
    1. Create your own go2rtc config, based on [Frigate's internal go2rtc config](https://github.com/blakeblackshear/frigate/blob/dev/docker/rootfs/usr/local/go2rtc/go2rtc.yaml).
    2. Add your internal IP to the list of `candidates`. Here is an example, assuming that `192.168.1.10` is the local IP of the device running Frigate:

        ```yaml title="/config/frigate-go2rtc.yaml"
        log:
          format: text

        webrtc:
          candidates:
            - 192.168.1.10:8555
            - stun:8555
        ```

    3. Mount this config file at `/config/frigate-go2rtc.yaml`. Here is an example, if you run Frigate through docker-compose:

        ```yaml title="docker-compose.yaml"
        volumes:
          - /path/to/your/go2rtc.yaml:/config/frigate-go2rtc.yaml
        ```

:::note

If you are having difficulties getting WebRTC to work and you are running Frigate with docker, you may want to try changing the container network mode:

* `network: host`, in this mode you don't need to forward any ports. The services inside of the Frigate container will have full access to the network interfaces of your host machine as if they were running natively and not in a container. Any port conflicts will need to be resolved. This network mode is recommended by go2rtc, but we recommend you only use it if necessary.
* `network: bridge` creates a virtual network interface for the container, and the container will have full access to it. You also don't need to forward any ports, however, the IP for accessing Frigate locally will differ from the IP of the host machine. Your router will see Frigate as if it was a new device connected in the network.

:::

See https://github.com/AlexxIT/go2rtc#module-webrtc for more information about this.
