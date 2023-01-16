---
id: live
title: Live View
---

Frigate has different live view options, some of which require [restream](restream.md) to be enabled.

## Live View Options

Live view options can be selected while viewing the live stream. The options are:

| Source | Latency | Frame Rate                            | Resolution     | Audio                        | Requires Restream | Other Limitations                            |
| ------ | ------- | ------------------------------------- | -------------- | ---------------------------- | ----------------- | -------------------------------------------- |
| jsmpeg | low     | same as `detect -> fps`, capped at 10 | same as detect | no                           | no                | none                                         |
| mse    | low     | native                                | native         | yes (depends on audio codec) | yes               | not supported on iOS, Firefox is h.264 only  |
| webrtc | lowest  | native                                | native         | yes (depends on audio codec) | yes               | requires extra config, doesn't support h.265 |

### Audio Support

MSE Requires AAC audio, WebRTC requires PCMU/PCMA, or opus audio. If you want to support both MSE and WebRTC then your restream config needs to use ffmpeg to set both.

```yaml
go2rtc:
  streams:
    test_cam: ffmpeg:rtsp://192.168.1.5:554/live0#video=copy#audio=aac#audio=opus
```

However, chances are that your camera already provides at least one usable audio type, so you just need restream to add the missing one. For example, if your camera outputs audio in AAC format:

```yaml
go2rtc:
  streams:
    test_cam: ffmpeg:rtsp://192.168.1.5:554/live0#video=copy#audio=copy#audio=opus
```

Which will reuse your camera AAC audio, while also adding one track in OPUS format.

If your camera uses RTSP and supports the audio type for the live view you want to use, then you can pass the camera stream to go2rtc without ffmpeg.

```yaml
go2rtc:
  streams:
    test_cam: rtsp://192.168.1.5:554/live0
```

### Setting Stream For Live UI

There may be some cameras that you would prefer to use the sub stream for live view, but the main stream for recording. This can be done via `live -> stream_name`.

```yaml
go2rtc:
  streams:
    test_cam: ffmpeg:rtsp://192.168.1.5:554/live0#video=copy#audio=aac#audio=opus
    test_cam_sub: ffmpeg:rtsp://192.168.1.5:554/substream#video=copy#audio=aac#audio=opus

cameras:
  test_cam:
    ffmpeg:
      output_args:
        record: preset-record-generic-audio-copy
      inputs:
        - path: rtsp://127.0.0.1:8554/test_cam?video=copy&audio=aac # <--- the name here must match the name of the camera in restream
          input_args: preset-rtsp-restream
          roles:
            - record
        - path: rtsp://127.0.0.1:8554/test_cam_sub?video=copy # <--- the name here must match the name of the camera_sub in restream
          input_args: preset-rtsp-restream
          roles:
            - detect
    live:
      stream_name: test_cam_sub
```

### WebRTC extra configuration:

WebRTC works by creating a TCP or UDP connection on port `8555`. However, it requires additional configuration:

- For external access, over the internet, setup your router to forward port `8555` to port `8555` on the Frigate device, for both TCP and UDP.
- For internal/local access, you will need to use a custom go2rtc config:

  1. Add your internal IP to the list of `candidates`. Here is an example, assuming that `192.168.1.10` is the local IP of the device running Frigate:

     ```yaml
     go2rtc:
       streams:
         test_cam: ...
       webrtc:
         candidates:
           - 192.168.1.10:8555
           - stun:8555
     ```

:::note

If you are having difficulties getting WebRTC to work and you are running Frigate with docker, you may want to try changing the container network mode:

- `network: host`, in this mode you don't need to forward any ports. The services inside of the Frigate container will have full access to the network interfaces of your host machine as if they were running natively and not in a container. Any port conflicts will need to be resolved. This network mode is recommended by go2rtc, but we recommend you only use it if necessary.
- `network: bridge` creates a virtual network interface for the container, and the container will have full access to it. You also don't need to forward any ports, however, the IP for accessing Frigate locally will differ from the IP of the host machine. Your router will see Frigate as if it was a new device connected in the network.

:::

See https://github.com/AlexxIT/go2rtc#module-webrtc for more information about this.
