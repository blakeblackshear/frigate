---
id: go2rtc
title: go2rtc
---

import ConfigTabs from "@site/src/components/ConfigTabs";
import TabItem from "@theme/TabItem";
import NavPath from "@site/src/components/NavPath";

Frigate uses the bundled go2rtc to power a number of key features:

- WebRTC or MSE for live viewing with audio, higher resolutions and frame rates than the jsmpeg stream which is limited to the detect stream and does not support audio
- Live stream support for cameras in Home Assistant Integration
- RTSP relay for use with other consumers to reduce the number of connections to your camera streams

:::tip[Most users no longer need to configure go2rtc by hand]

The **camera setup wizard** is the recommended way to add cameras. Click **Add Camera** in <NavPath path="Settings > Global configuration > Camera management" />, and the wizard probes your camera and writes its configuration for you, including the go2rtc restream and the live stream mapping, so go2rtc is set up automatically.

This guide is mainly useful if you are **upgrading from an older version and have existing cameras that don't yet use go2rtc**, or if you want to fine-tune a stream by hand (for example, to transcode a codec your browser can't play). The [go2rtc troubleshooting guide](/troubleshooting/go2rtc) applies regardless of how your cameras were added.

:::

## Adding a go2rtc stream manually

If you added your cameras with the wizard, go2rtc is already configured. You can skip straight to [troubleshooting](/troubleshooting/go2rtc). The steps below are for upgrading users with existing cameras that aren't using go2rtc yet, or for anyone who prefers to configure a stream by hand.

Configure go2rtc to connect to your camera by adding the stream you want to use for live view. Avoid changing any other parts of your config at this step. Note that go2rtc supports [many different stream types](https://github.com/AlexxIT/go2rtc/tree/v1.9.13#module-streams), not just rtsp.

:::tip

For the best experience, set the stream name under `go2rtc` to match the name of your camera so that Frigate will automatically map it and be able to use better live view options for the camera.

See [the live view docs](/configuration/live#setting-streams-for-live-ui) for more information.

:::

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > System > go2rtc Streams" /> and click **Add stream**. Give the stream a name (use the camera's name so Frigate can auto-map it - for example, if your camera's name is `back`, use `back` as the go2rtc stream name), then paste the camera's stream URL into the **Source** field. Save the section.

</TabItem>
<TabItem value="yaml">

```yaml
go2rtc:
  streams:
    back:
      - rtsp://user:password@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
```

</TabItem>
</ConfigTabs>

After adding this to the config, restart Frigate and try to watch the live stream for a single camera by clicking on it from the dashboard. It should look much clearer and more fluent than the original jsmpeg stream.

### Next steps

1. If the stream you added to go2rtc is also used by Frigate for the `record` or `detect` role, you can migrate your config to pull from the RTSP restream to reduce the number of connections to your camera as shown [here](/configuration/restream#reduce-connections-to-camera).
2. You can [set up WebRTC](/configuration/live#webrtc-extra-configuration) if your camera supports two-way talk. Note that WebRTC only supports specific audio formats and may require opening ports on your router.
3. If your camera supports two-way talk, you must configure your stream with `#backchannel=0` to prevent go2rtc from blocking other applications from accessing the camera's audio output. See [preventing go2rtc from blocking two-way audio](/configuration/restream#two-way-talk-restream) in the restream documentation.

## Troubleshooting

If your stream won't play, has no audio, uses excessive CPU, or otherwise misbehaves, see the dedicated [go2rtc troubleshooting guide](/troubleshooting/go2rtc). It walks through how to isolate where the problem is and covers the most common issues: unsupported codecs, H.265/HEVC, audio, WebRTC and two-way talk, hardware-accelerated transcoding with FFmpeg 8, and camera-specific quirks.

## Homekit Configuration

To add camera streams to Homekit Frigate must be configured in docker to use `host` networking mode. Once that is done, you can use the go2rtc WebUI (accessed via port 1984, which is disabled by default) to share export a camera to Homekit. Any changes made will automatically be saved to `/config/go2rtc_homekit.yml`.
