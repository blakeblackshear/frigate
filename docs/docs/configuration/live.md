---
id: live
title: Live View
---

Frigate intelligently displays your camera streams on the Live view dashboard. Your camera images update once per minute when no detectable activity is occurring to conserve bandwidth and resources. As soon as any motion is detected, cameras seamlessly switch to a live stream.

## Live View technologies

Frigate intelligently uses three different streaming technologies to display your camera streams on the dashboard and the single camera view, switching between available modes based on network bandwidth, player errors, or required features like two-way talk. The highest quality and fluency of the Live view requires the bundled `go2rtc` to be configured as shown in the [step by step guide](/guides/configuring_go2rtc).

The jsmpeg live view will use more browser and client GPU resources. Using go2rtc is highly recommended and will provide a superior experience.

| Source | Frame Rate                            | Resolution | Audio                        | Requires go2rtc | Notes                                                                                                                                                               |
| ------ | ------------------------------------- | ---------- | ---------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| jsmpeg | same as `detect -> fps`, capped at 10 | 720p       | no                           | no              | Resolution is configurable, but go2rtc is recommended if you want higher resolutions and better frame rates. jsmpeg is Frigate's default without go2rtc configured. |
| mse    | native                                | native     | yes (depends on audio codec) | yes             | iPhone requires iOS 17.1+, Firefox is h.264 only. This is Frigate's default when go2rtc is configured.                                                              |
| webrtc | native                                | native     | yes (depends on audio codec) | yes             | Requires extra configuration, doesn't support h.265. Frigate attempts to use WebRTC when MSE fails or when using a camera's two-way talk feature.                   |

### Camera Settings Recommendations

If you are using go2rtc, you should adjust the following settings in your camera's firmware for the best experience with Live view:

- Video codec: **H.264** - provides the most compatible video codec with all Live view technologies and browsers. Avoid any kind of "smart codec" or "+" codec like _H.264+_ or _H.265+_. as these non-standard codecs remove keyframes (see below).
- Audio codec: **AAC** - provides the most compatible audio codec with all Live view technologies and browsers that support audio.
- I-frame interval (sometimes called the keyframe interval, the interframe space, or the GOP length): match your camera's frame rate, or choose "1x" (for interframe space on Reolink cameras). For example, if your stream outputs 20fps, your i-frame interval should be 20 (or 1x on Reolink). Values higher than the frame rate will cause the stream to take longer to begin playback. See [this page](https://gardinal.net/understanding-the-keyframe-interval/) for more on keyframes.

The default video and audio codec on your camera may not always be compatible with your browser, which is why setting them to H.264 and AAC is recommended. See the [go2rtc docs](https://github.com/AlexxIT/go2rtc?tab=readme-ov-file#codecs-madness) for codec support information.

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

If your camera does not have audio and you are having problems with Live view, you should have go2rtc send video only:

```yaml
go2rtc:
  streams:
    no_audio_camera:
      - ffmpeg:rtsp://192.168.1.5:554/live0#video=copy
```

### Setting Stream For Live UI

There may be some cameras that you would prefer to use the sub stream for live view, but the main stream for recording. This can be done via `live -> stream_name`.

```yaml
go2rtc:
  streams:
    test_cam:
      - rtsp://192.168.1.5:554/live0 # <- stream which supports video & aac audio.
      - "ffmpeg:test_cam#audio=opus" # <- copy of the stream which transcodes audio to opus for webrtc
    test_cam_sub:
      - rtsp://192.168.1.5:554/substream # <- stream which supports video & aac audio.
      - "ffmpeg:test_cam_sub#audio=opus" # <- copy of the stream which transcodes audio to opus for webrtc

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
      stream_name: test_cam_sub
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

- For access through Tailscale, the Frigate system's Tailscale IP must be added as a WebRTC candidate. Tailscale IPs all start with `100.`, and are reserved within the `100.64.0.0/10` CIDR block.

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
- `network: bridge` is the default network driver, a bridge network is a Link Layer device which forwards traffic between network segments. You need to forward any ports that you want to be accessible from the host IP.

If not running in host mode, port 8555 will need to be mapped for the container:

docker-compose.yml

```yaml
services:
  frigate:
    ...
    ports:
      - "8555:8555/tcp" # WebRTC over tcp
      - "8555:8555/udp" # WebRTC over udp
```

:::

See [go2rtc WebRTC docs](https://github.com/AlexxIT/go2rtc/tree/v1.8.3#module-webrtc) for more information about this.
