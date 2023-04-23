---
id: live
title: Live View
---

Frigate has different live view options, some of which require the bundled `go2rtc` to be configured as shown in the [step by step guide](/guides/configuring_go2rtc).

## Live View Options

Live view options can be selected while viewing the live stream. The options are:

| Source | Latency | Frame Rate                            | Resolution     | Audio                        | Requires go2rtc | Other Limitations                            |
| ------ | ------- | ------------------------------------- | -------------- | ---------------------------- | --------------- | -------------------------------------------- |
| jsmpeg | low     | same as `detect -> fps`, capped at 10 | same as detect | no                           | no              | none                                         |
| mse    | low     | native                                | native         | yes (depends on audio codec) | yes             | not supported on iOS, Firefox is h.264 only  |
| webrtc | lowest  | native                                | native         | yes (depends on audio codec) | yes             | requires extra config, doesn't support h.265 |

### Audio Support

MSE Requires AAC audio, WebRTC requires PCMU/PCMA, or opus audio. If you want to support both MSE and WebRTC then your restream config needs to make sure both are enabled.

```yaml
go2rtc:
  streams:
    rtsp_cam: # <- for RTSP streams
      - rtsp://192.168.1.5:554/live0 # <- stream which supports video & aac audio
      - "ffmpeg:rtsp_cam#audio=opus" # <- copy of the stream which transcodes audio to the missing codec (usually will be opus)
    http_cam: # <- for http streams
      - http://192.168.50.155/flv?port=1935&app=bcs&stream=channel0_main.bcs&user=user&password=password # <- stream which supports video & aac audio
      - "ffmpeg:http_cam#audio=opus" # <- copy of the stream which transcodes audio to the missing codec (usually will be opus)
```

### Setting Stream For Live UI

There may be some cameras that you would prefer to use the sub stream for live view, but the main stream for recording. This can be done via `live -> stream_name`.

```yaml
go2rtc:
  streams:
    rtsp_cam:
      - rtsp://192.168.1.5:554/live0 # <- stream which supports video & aac audio.
      - "ffmpeg:rtsp_cam#audio=opus" # <- copy of the stream which transcodes audio to opus
    rtsp_cam_sub:
      - rtsp://192.168.1.5:554/substream # <- stream which supports video & aac audio.
      - "ffmpeg:rtsp_cam_sub#audio=opus" # <- copy of the stream which transcodes audio to opus

cameras:
  test_cam:
    ffmpeg:
      output_args:
        record: preset-record-generic-audio-copy
      inputs:
        - path: rtsp://127.0.0.1:8554/test_cam # <--- the name here must match the name of the camera in restream
          input_args: preset-rtsp-restream
          roles:
            - record
        - path: rtsp://127.0.0.1:8554/test_cam_sub # <--- the name here must match the name of the camera_sub in restream
          input_args: preset-rtsp-restream
          roles:
            - detect
    live:
      stream_name: rtsp_cam_sub
```

### WebRTC extra configuration:

WebRTC works by creating a TCP or UDP connection on port `8555`. However, it requires additional configuration:

- For external access, over the internet, setup your router to forward port `8555` to port `8555` on the Frigate device, for both TCP and UDP.
- For internal/local access, unless you are running through the add-on, you will also need to set the WebRTC candidates list in the go2rtc config. For example, if `192.168.1.10` is the local IP of the device running Frigate:

  ```yaml title="/config/frigate.yaml"
  go2rtc:
    streams:
      test_cam: ...
    webrtc:
      candidates:
        - 192.168.1.10:8555
        - stun:8555
  ```

:::tip

This extra configuration may not be required if Frigate has been installed as a Home Assistant add-on, as Frigate uses the Supervisor's API to generate a WebRTC candidate.

However, it is recommended if issues occur to define the candidates manually. You should do this if the Frigate add-on fails to generate a valid candidate. If an error occurs you will see some warnings like the below in the add-on logs page during the initialization:

```log
[WARN] Failed to get IP address from supervisor
[WARN] Failed to get WebRTC port from supervisor
```

:::

:::note

If you are having difficulties getting WebRTC to work and you are running Frigate with docker, you may want to try changing the container network mode:

- `network: host`, in this mode you don't need to forward any ports. The services inside of the Frigate container will have full access to the network interfaces of your host machine as if they were running natively and not in a container. Any port conflicts will need to be resolved. This network mode is recommended by go2rtc, but we recommend you only use it if necessary.
- `network: bridge` creates a virtual network interface for the container, and the container will have full access to it. You also don't need to forward any ports, however, the IP for accessing Frigate locally will differ from the IP of the host machine. Your router will see Frigate as if it was a new device connected in the network.

:::

See [go2rtc WebRTC docs](https://github.com/AlexxIT/go2rtc/tree/v1.2.0#module-webrtc) for more information about this.
