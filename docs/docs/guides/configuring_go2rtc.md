---
id: configuring_go2rtc
title: Configuring go2rtc
---

Use of the bundled go2rtc is optional. You can still configure FFmpeg to connect directly to your cameras. However, adding go2rtc to your configuration is required for the following features:

- WebRTC or MSE for live viewing with higher resolutions and frame rates than the jsmpeg stream which is limited to the detect stream
- RTSP (instead of RTMP) relay for use with Home Assistant or other consumers to reduce the number of connections to your camera streams

# Setup a go2rtc stream

First, you will want to configure go2rtc to connect to your camera stream by adding the stream you want to use for live view in your Frigate config file. If you set the stream name under go2rtc to match the name of your camera, it will automatically be mapped and you will get additional live view options for the camera. Avoid changing any other parts of your config at this step. Note that go2rtc supports [many different stream types](https://github.com/AlexxIT/go2rtc/tree/v1.2.0#module-streams), not just rtsp.

```yaml
go2rtc:
  streams:
    back:
      - rtsp://user:password@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
```

The easiest live view to get working is MSE. After adding this to the config, restart Frigate and try to watch the live stream by selecting MSE in the dropdown after clicking on the camera.

### What if my video doesn't play?

If you are unable to see your video feed, first check the go2rtc logs in the Frigate UI under Logs in the sidebar. If go2rtc is having difficulty connecting to your camera, you should see some error messages in the log. If you do not see any errors, then the video codec of the stream may not be supported in your browser. If your camera stream is set to H265, try switching to H264. You can see more information about [video codec compatibility](https://github.com/AlexxIT/go2rtc/tree/v1.2.0#codecs-madness) in the go2rtc documentation. If you are not able to switch your camera settings from H265 to H264 or your stream is a different format such as MJPEG, you can use go2rtc to re-encode the video using the [FFmpeg parameters](https://github.com/AlexxIT/go2rtc/tree/v1.2.0#source-ffmpeg). It supports rotating and resizing video feeds and hardware acceleration. Keep in mind that transcoding video from one format to another is a resource intensive task and you may be better off using the built-in jsmpeg view. Here is an example of a config that will re-encode the stream to H264 without hardware acceleration:

```yaml
go2rtc:
  streams:
    back:
      - rtsp://user:password@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
      - "ffmpeg:back#video=h264"
```

Some camera streams may need to use the ffmpeg module in go2rtc. This has the downside of slower startup times, but has compatibility with more stream types.

```yaml
go2rtc:
  streams:
    back:
      - ffmpeg:rtsp://user:password@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
```

If you can see the video but do not have audio, this is most likely because your camera's audio stream is not AAC. If possible, update your camera's audio settings to AAC. If your cameras do not support AAC audio, you will need to tell go2rtc to re-encode the audio to AAC on demand if you want audio. This will use additional CPU and add some latency. To add AAC audio on demand, you can update your go2rtc config as follows:

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
      - "ffmpeg:back#video=h264#audio=aac"
```

When using the ffmpeg module, you would add AAC audio like this:

```yaml
go2rtc:
  streams:
    back:
      - "ffmpeg:rtsp://user:password@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2#video=copy#audio=copy#audio=aac"
```

## Next steps

1. If the stream you added to go2rtc is also used by Frigate for the `record` or `detect` role, you can migrate your config to pull from the RTSP restream to reduce the number of connections to your camera as shown [here](/configuration/restream#reduce-connections-to-camera).
1. You may also prefer to [setup WebRTC](/configuration/live#webrtc-extra-configuration) for slightly lower latency than MSE. Note that WebRTC only supports h264 and specific audio formats.
