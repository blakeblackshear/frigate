---
id: live
title: Live View
---

Frigate intelligently displays your camera streams on the Live view dashboard. By default, Frigate employs "smart streaming" where camera images update once per minute when no detectable activity is occurring to conserve bandwidth and resources. As soon as any motion or active objects are detected, cameras seamlessly switch to a live stream.

### Live View technologies

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
- I-frame interval (sometimes called the keyframe interval, the interframe space, or the GOP length): match your camera's frame rate, or choose "1x" (for interframe space on Reolink cameras). For example, if your stream outputs 20fps, your i-frame interval should be 20 (or 1x on Reolink). Values higher than the frame rate will cause the stream to take longer to begin playback. See [this page](https://gardinal.net/understanding-the-keyframe-interval/) for more on keyframes. For many users this may not be an issue, but it should be noted that that a 1x i-frame interval will cause more storage utilization if you are using the stream for the `record` role as well.

The default video and audio codec on your camera may not always be compatible with your browser, which is why setting them to H.264 and AAC is recommended. See the [go2rtc docs](https://github.com/AlexxIT/go2rtc?tab=readme-ov-file#codecs-madness) for codec support information.

### Audio Support

MSE Requires PCMA/PCMU or AAC audio, WebRTC requires PCMA/PCMU or opus audio. If you want to support both MSE and WebRTC then your restream config needs to make sure both are enabled.

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

### Setting Streams For Live UI

You can configure Frigate to allow manual selection of the stream you want to view in the Live UI. For example, you may want to view your camera's substream on mobile devices, but the full resolution stream on desktop devices. Setting the `live -> streams` list will populate a dropdown in the UI's Live view that allows you to choose between the streams. This stream setting is _per device_ and is saved in your browser's local storage.

Additionally, when creating and editing camera groups in the UI, you can choose the stream you want to use for your camera group's Live dashboard.

:::note

Frigate's default dashboard ("All Cameras") will always use the first entry you've defined in `streams:` when playing live streams from your cameras.

:::

Configure the `streams` option with a "friendly name" for your stream followed by the go2rtc stream name.

Using Frigate's internal version of go2rtc is required to use this feature. You cannot specify paths in the `streams` configuration, only go2rtc stream names.

```yaml
go2rtc:
  streams:
    test_cam:
      - rtsp://192.168.1.5:554/live_main # <- stream which supports video & aac audio.
      - "ffmpeg:test_cam#audio=opus" # <- copy of the stream which transcodes audio to opus for webrtc
    test_cam_sub:
      - rtsp://192.168.1.5:554/live_sub # <- stream which supports video & aac audio.
    test_cam_another_sub:
      - rtsp://192.168.1.5:554/live_alt # <- stream which supports video & aac audio.

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
      streams: # <--- Multiple streams for Frigate 0.16 and later
        Main Stream: test_cam # <--- Specify a "friendly name" followed by the go2rtc stream name
        Sub Stream: test_cam_sub
        Special Stream: test_cam_another_sub
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
- Note that WebRTC does not support H.265.

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

### Two way talk

For devices that support two way talk, Frigate can be configured to use the feature from the camera's Live view in the Web UI. You should:

- Set up go2rtc with [WebRTC](#webrtc-extra-configuration).
- Ensure you access Frigate via https (may require [opening port 8971](/frigate/installation/#ports)).
- For the Home Assistant Frigate card, [follow the docs](https://github.com/dermotduffy/frigate-hass-card?tab=readme-ov-file#using-2-way-audio) for the correct source.

To use the Reolink Doorbell with two way talk, you should use the [recommended Reolink configuration](/configuration/camera_specific#reolink-doorbell)

### Streaming options on camera group dashboards

Frigate provides a dialog in the Camera Group Edit pane with several options for streaming on a camera group's dashboard. These settings are _per device_ and are saved in your device's local storage.

- Stream selection using the `live -> streams` configuration option (see _Setting Streams For Live UI_ above)
- Streaming type:
  - _No streaming_: Camera images will only update once per minute and no live streaming will occur.
  - _Smart Streaming_ (default, recommended setting): Smart streaming will update your camera image once per minute when no detectable activity is occurring to conserve bandwidth and resources, since a static picture is the same as a streaming image with no motion or objects. When motion or objects are detected, the image seamlessly switches to a live stream.
  - _Continuous Streaming_: Camera image will always be a live stream when visible on the dashboard, even if no activity is being detected. Continuous streaming may cause high bandwidth usage and performance issues. **Use with caution.**
- _Compatibility mode_: Enable this option only if your camera's live stream is displaying color artifacts and has a diagonal line on the right side of the image. Before enabling this, try setting your camera's `detect` width and height to a standard aspect ratio (for example: 640x352 becomes 640x360, and 800x443 becomes 800x450, 2688x1520 becomes 2688x1512, etc). Depending on your browser and device, more than a few cameras in compatibility mode may not be supported, so only use this option if changing your config fails to resolve the color artifacts and diagonal line.

:::note

The default dashboard ("All Cameras") will always use Smart Streaming and the first entry set in your `streams` configuration, if defined. Use a camera group if you want to change any of these settings from the defaults.

:::

## Live view FAQ

1. Why don't I have audio in my Live view?
   You must use go2rtc to hear audio in your live streams. If you have go2rtc already configured, you need to ensure your camera is sending PCMA/PCMU or AAC audio. If you can't change your camera's audio codec, you need to [transcode the audio](https://github.com/AlexxIT/go2rtc?tab=readme-ov-file#source-ffmpeg) using go2rtc.

   Note that the low bandwidth mode player is a video-only stream. You should not expect to hear audio when in low bandwidth mode, even if you've set up go2rtc.

2. Frigate shows that my live stream is in "low bandwidth mode". What does this mean?
   Frigate intelligently selects the live streaming technology based on a number of factors (user-selected modes like two-way talk, camera settings, browser capabilities, available bandwidth) and prioritizes showing an actual up-to-date live view of your camera's stream as quickly as possible.

   When you have go2rtc configured, Live view initially attempts to load and play back your stream with a clearer, fluent stream technology (MSE). An initial timeout, a low bandwidth condition that would cause buffering of the stream, or decoding errors in the stream will cause Frigate to switch to the stream defined by the `detect` role, using the jsmpeg format. This is what the UI labels as "low bandwidth mode". On Live dashboards, the mode will automatically reset when smart streaming is configured and activity stops. You can also try using the _Reset_ button to force a reload of your stream.

   If you are still experiencing Frigate falling back to low bandwidth mode, you may need to adjust your camera's settings per the recommendations above or ensure you have enough bandwidth available.

3. It doesn't seem like my cameras are streaming on the Live dashboard. Why?
   On the default Live dashboard ("All Cameras"), your camera images will update once per minute when no detectable activity is occurring to conserve bandwidth and resources. As soon as any activity is detected, cameras seamlessly switch to a full-resolution live stream. If you want to customize this behavior, use a camera group.

4. I see a strange diagonal line on my live view, but my recordings look fine. How can I fix it?
   This is caused by incorrect dimensions set in your detect width or height (or incorrectly auto-detected), causing the jsmpeg player's rendering engine to display a slightly distorted image. You should enlarge the width and height of your `detect` resolution up to a standard aspect ratio (example: 640x352 becomes 640x360, and 800x443 becomes 800x450, 2688x1520 becomes 2688x1512, etc). If changing the resolution to match a standard (4:3, 16:9, or 32:9, etc) aspect ratio does not solve the issue, you can enable "compatibility mode" in your camera group dashboard's stream settings. Depending on your browser and device, more than a few cameras in compatibility mode may not be supported, so only use this option if changing your `detect` width and height fails to resolve the color artifacts and diagonal line.

5. How does "smart streaming" work?
   Because a static image of a scene looks exactly the same as a live stream with no motion or activity, smart streaming updates your camera images once per minute when no detectable activity is occurring to conserve bandwidth and resources. As soon as any activity (motion or object/audio detection) occurs, cameras seamlessly switch to a live stream.

   This static image is pulled from the stream defined in your config with the `detect` role. When activity is detected, images from the `detect` stream immediately begin updating at ~5 frames per second so you can see the activity until the live player is loaded and begins playing. This usually only takes a second or two. If the live player times out, buffers, or has streaming errors, the jsmpeg player is loaded and plays a video-only stream from the `detect` role. When activity ends, the players are destroyed and a static image is displayed until activity is detected again, and the process repeats.

   This is Frigate's default and recommended setting because it results in a significant bandwidth savings, especially for high resolution cameras.

6. I have unmuted some cameras on my dashboard, but I do not hear sound. Why?
   If your camera is streaming (as indicated by a red dot in the upper right, or if it has been set to continuous streaming mode), your browser may be blocking audio until you interact with the page. This is an intentional browser limitation. See [this article](https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide#autoplay_availability). Many browsers have a whitelist feature to change this behavior.
