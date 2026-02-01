---
id: configuring_go2rtc
title: Configuring go2rtc
---

Use of the bundled go2rtc is optional. You can still configure FFmpeg to connect directly to your cameras. However, adding go2rtc to your configuration is required for the following features:

- WebRTC or MSE for live viewing with audio, higher resolutions and frame rates than the jsmpeg stream which is limited to the detect stream and does not support audio
- Live stream support for cameras in Home Assistant Integration
- RTSP relay for use with other consumers to reduce the number of connections to your camera streams

## Setup a go2rtc stream

First, you will want to configure go2rtc to connect to your camera stream by adding the stream you want to use for live view in your Frigate config file. Avoid changing any other parts of your config at this step. Note that go2rtc supports [many different stream types](https://github.com/AlexxIT/go2rtc/tree/v1.9.10#module-streams), not just rtsp.

:::tip

For the best experience, you should set the stream name under `go2rtc` to match the name of your camera so that Frigate will automatically map it and be able to use better live view options for the camera.

See [the live view docs](../configuration/live.md#setting-stream-for-live-ui) for more information.

:::

```yaml
go2rtc:
  streams:
    back:
      - rtsp://user:password@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
```

After adding this to the config, restart Frigate and try to watch the live stream for a single camera by clicking on it from the dashboard. It should look much clearer and more fluent than the original jsmpeg stream.

### What if my video doesn't play?

- Check Logs:

  - Access the go2rtc logs in the Frigate UI under Logs in the sidebar.
  - If go2rtc is having difficulty connecting to your camera, you should see some error messages in the log.

- Check go2rtc Web Interface: if you don't see any errors in the logs, try viewing the camera through go2rtc's web interface.

  - Navigate to port 1984 in your browser to access go2rtc's web interface.
    - If using Frigate through Home Assistant, enable the web interface at port 1984.
    - If using Docker, forward port 1984 before accessing the web interface.
  - Click `stream` for the specific camera to see if the camera's stream is being received.

- Check Video Codec:

  - If the camera stream works in go2rtc but not in your browser, the video codec might be unsupported.
  - If using H265, switch to H264. Refer to [video codec compatibility](https://github.com/AlexxIT/go2rtc/tree/v1.9.10#codecs-madness) in go2rtc documentation.
  - If unable to switch from H265 to H264, or if the stream format is different (e.g., MJPEG), re-encode the video using [FFmpeg parameters](https://github.com/AlexxIT/go2rtc/tree/v1.9.10#source-ffmpeg). It supports rotating and resizing video feeds and hardware acceleration. Keep in mind that transcoding video from one format to another is a resource intensive task and you may be better off using the built-in jsmpeg view.
    ```yaml
    go2rtc:
      streams:
        back:
          - rtsp://user:password@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
          - "ffmpeg:back#video=h264#hardware"
    ```

- Switch to FFmpeg if needed:

  - Some camera streams may need to use the ffmpeg module in go2rtc. This has the downside of slower startup times, but has compatibility with more stream types.

    ```yaml
    go2rtc:
      streams:
        back:
          - ffmpeg:rtsp://user:password@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
    ```

  - If you can see the video but do not have audio, this is most likely because your camera's audio stream codec is not AAC.
  - If possible, update your camera's audio settings to AAC in your camera's firmware.
  - If your cameras do not support AAC audio, you will need to tell go2rtc to re-encode the audio to AAC on demand if you want audio. This will use additional CPU and add some latency. To add AAC audio on demand, you can update your go2rtc config as follows:

    ```yaml
    go2rtc:
      streams:
        back:
          - rtsp://user:password@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
          - "ffmpeg:back#audio=aac"
    ```

    If you need to convert **both** the audio and video streams, you can use the following:

    ```yaml
    go2rtc:
      streams:
        back:
          - rtsp://user:password@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
          - "ffmpeg:back#video=h264#audio=aac#hardware"
    ```

    When using the ffmpeg module, you would add AAC audio like this:

    ```yaml
    go2rtc:
      streams:
        back:
          - "ffmpeg:rtsp://user:password@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2#video=copy#audio=copy#audio=aac#hardware"
    ```

:::warning

To access the go2rtc stream externally when utilizing the Frigate Add-On (for
instance through VLC), you must first enable the RTSP Restream port.
You can do this by visiting the Frigate Add-On configuration page within Home
Assistant and revealing the hidden options under the "Show disabled ports"
section.

:::

### Next steps

1. If the stream you added to go2rtc is also used by Frigate for the `record` or `detect` role, you can migrate your config to pull from the RTSP restream to reduce the number of connections to your camera as shown [here](/configuration/restream#reduce-connections-to-camera).
2. You can [set up WebRTC](/configuration/live#webrtc-extra-configuration) if your camera supports two-way talk. Note that WebRTC only supports specific audio formats and may require opening ports on your router.
3. If your camera supports two-way talk, you must configure your stream with `#backchannel=0` to prevent go2rtc from blocking other applications from accessing the camera's audio output. See [preventing go2rtc from blocking two-way audio](/configuration/restream#two-way-talk-restream) in the restream documentation.

## Homekit Configuration

To add camera streams to Homekit Frigate must be configured in docker to use `host` networking mode. Once that is done, you can use the go2rtc WebUI (accessed via port 1984, which is disabled by default) to share export a camera to Homekit. Any changes made will automatically be saved to `/config/go2rtc_homekit.yml`.
