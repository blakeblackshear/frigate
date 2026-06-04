---
id: go2rtc
title: Troubleshooting go2rtc
---

import ConfigTabs from "@site/src/components/ConfigTabs";
import TabItem from "@theme/TabItem";
import NavPath from "@site/src/components/NavPath";

This page covers common problems with the bundled [go2rtc](/configuration/advanced/go2rtc) and how to resolve them, whether your cameras were added with the setup wizard or configured by hand.

When a stream won't play or behaves oddly, the most important first step is to figure out **where** in the pipeline it breaks. Frigate's live view is a chain — _camera → go2rtc → your browser_ — and each stage fails for different reasons. Work through the checks below in order, then jump to the matching problem category.

## Start by isolating the problem

### 1. Read the go2rtc logs

Access the go2rtc logs in the Frigate UI under <NavPath path="System Logs" /> in the sidebar (select the **go2rtc** tab). If go2rtc cannot connect to your camera you will usually see a clear error here — `401 Unauthorized` (bad or incorrectly encoded credentials), `Connection refused` / `timeout` (wrong IP, port, or the camera is at its connection limit), or `404 Not Found` (wrong RTSP path, or the referenced stream name does not exist).

### 2. Test the stream in the go2rtc web interface

If the logs look clean, open go2rtc's own web interface on port `1984`. This is the single most useful diagnostic, because it takes Frigate's UI out of the equation entirely.

- If using Frigate through Home Assistant, enable the web interface at port `1984` (it is disabled by default — see [Home Assistant ports](#home-assistant-and-port-access)).
- If using Docker, forward port `1984` before accessing the web interface.

Open the stream page for your camera (`http://<frigate_host>:1984/stream.html?src=back`) and try each player link:

- **If nothing plays here**, the problem is between the camera and go2rtc (codec, credentials, or transport), _not_ your browser. Fix it at the source before touching anything in Frigate.
- **If a player works here but Frigate's live view does not**, the problem is browser/codec related — compare the **MSE** and **WebRTC** links. Frigate prefers MSE and only attempts WebRTC when MSE fails (or for two-way talk). If `mode=mse` plays but `mode=webrtc` does not, you have a [WebRTC codec problem](#webrtc-and-two-way-talk); if neither plays, your browser cannot decode the codec (commonly H.265 — see [H.265 / HEVC cameras](#h265--hevc-cameras)).

### 3. Inspect the negotiated codecs

You can view detailed stream info — including the exact video and audio codecs go2rtc negotiated with the camera — at `http://frigate_ip:5000/api/go2rtc/streams` (or `http://frigate_ip:5000/api/go2rtc/streams/back` for a single camera). This is the authoritative answer to "what is my camera actually sending?" and is far more reliable than guessing from the camera's web UI. It also shows whether the audio track is `sendonly`/`recvonly`, which matters for [two-way talk](#webrtc-and-two-way-talk).

### 4. Fix the codec with the FFmpeg module

If the camera plays in go2rtc but not in your browser, the video or audio codec is unsupported. Browsers can reliably play **H.264** video and **AAC** audio; many cannot play H.265/HEVC, and some camera audio (G.711/PCM, MJPEG containers, etc.) is not playable at all. The fix is to have go2rtc re-encode the stream on demand using its FFmpeg module.

In the Frigate UI this is the **Use compatibility mode (ffmpeg)** toggle on a stream source; in YAML it is the `ffmpeg:` prefix on the source URL.

<ConfigTabs>
<TabItem value="ui">

1. Navigate to <NavPath path="Settings > System > go2rtc Streams" /> and expand your camera's stream.
2. On the source you want to convert, click the **Use compatibility mode (ffmpeg)** button (the sliders icon next to the URL). This routes the source through go2rtc's FFmpeg module and reveals the transcoding options.
3. Set **Video** to **Transcode to H.264** if your browser can't play the camera's video codec (e.g. H.265). Leave it on **Copy** to pass the video through untouched — this is much cheaper and should be your default whenever only the audio needs converting.
4. Set **Audio** to **Transcode to AAC** (for MSE) or **Transcode to Opus** (for WebRTC) if the camera's audio codec is unsupported. Leave it on **Copy** to keep the original, or **Exclude** to drop audio entirely.
5. When transcoding **video**, set **Hardware acceleration** to **Automatic (recommended)** so the encode runs on your GPU instead of the CPU. See [hardware-accelerated transcoding](#hardware-accelerated-transcoding-with-ffmpeg-8) for an important FFmpeg 8 caveat.
6. **Save** the section, then reload the live view.

</TabItem>
<TabItem value="yaml">

```yaml
go2rtc:
  streams:
    back:
      - rtsp://user:password@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
      # transcode video to H.264 on the GPU; only needed if the browser can't play the source codec
      - "ffmpeg:back#video=h264#hardware"
```

To convert audio only (leaving video untouched), or to convert both:

```yaml
go2rtc:
  streams:
    back:
      - rtsp://user:password@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
      - "ffmpeg:back#audio=aac" # audio only — preferred when the video already plays
      # or, to convert both video and audio:
      # - "ffmpeg:back#video=h264#audio=aac#hardware"
```

</TabItem>
</ConfigTabs>

:::warning

The `#`-modifiers (`#video=`, `#audio=`, `#hardware`, `#backchannel=0`, …) **only take effect on a source that is prefixed with `ffmpeg:`**. Adding them to a bare `rtsp://…#audio=opus` source does nothing — go2rtc ignores them. Likewise, when a source references another stream by name (e.g. `ffmpeg:back#audio=aac`), the name must match the stream key **exactly** (it is case sensitive), or the transcode is silently never produced. This is the single most common configuration mistake. In the Frigate UI, the **Use compatibility mode (ffmpeg)** toggle adds the `ffmpeg:` prefix for you.

:::

Transcoding video is resource intensive. Always prefer `#video=copy` (the **Copy** option) and only convert the track that is actually unsupported. If you must transcode video and have no hardware encoder available, the built-in jsmpeg view may be the better option.

## Live view is black, buffering, or stuck in "low-bandwidth mode"

When the live view shows a black screen, spins forever, or repeatedly drops to the lower-quality jsmpeg player ("low-bandwidth mode"), the stream almost always contains something the browser cannot decode over MSE — usually H.265 video or a non-AAC audio track. Confirm this in the go2rtc web UI (port `1984`): if MSE won't play there, Frigate can't play it either, since it uses the same pipeline.

The fix is to produce an **H.264 + AAC** stream, either by changing your camera's firmware codecs or by transcoding in go2rtc (see [Fix the codec with the FFmpeg module](#4-fix-the-codec-with-the-ffmpeg-module)). A few other things worth checking:

- **Set the camera's I-frame (keyframe) interval to match its frame rate** (or "1x" on Reolink), and avoid "smart"/"+" codecs like _H.264+_ or _H.265+_. A long keyframe interval delays the first decodable frame past Frigate's startup timeout, which forces the fallback to jsmpeg. See [camera settings recommendations](/configuration/live#camera-settings-recommendations).
- **A spinner that never clears, even though video plays in VLC**, is often an unplayable _audio_ track stalling playback. Drop or transcode the audio (see below).
- **Remote/VPN viewing that buffers** while the LAN is fine is usually latency/jitter exceeding MSE's startup buffer — set up [WebRTC](/configuration/live#webrtc-extra-configuration), which drops late frames instead of buffering.

The general live-view behavior (smart streaming, the MSE → WebRTC → jsmpeg fallback chain, and how to read browser console errors) is documented in detail in the [Live view FAQ](/configuration/live#live-view-faq).

## H.265 / HEVC cameras

H.265/HEVC playback in the browser is unreliable and version-dependent. WebRTC does not support H.265 on some browsers, and MSE/HEVC support varies by browser, OS, and whether a hardware decoder is present. An H.265 stream that plays fine in VLC, the go2rtc web UI, and Frigate's recordings can still be blank in a live view.

For dependable live viewing, use **H.264** for the stream the live view consumes:

- Point the live view at the camera's H.264 **substream** and keep the H.265 main stream for recording only, or
- Transcode H.265 → H.264 in go2rtc with the FFmpeg module and `#hardware` (software HEVC transcoding is very CPU heavy).

Treat browser HEVC playback as best-effort. See also [H.265 cameras via Safari](/configuration/camera_specific#h265-cameras-via-safari).

## No audio in Live view

Live view audio has strict codec requirements that differ by player: **MSE requires AAC, PCMA, or PCMU**, and **WebRTC requires Opus, PCMA, or PCMU**. Many cameras default to a codec outside these sets (or to PCM/G.711), so the player loads video only and no audio control appears.

The most robust approach is to provide both an AAC track (for MSE) and an Opus track (for WebRTC) on the same stream by transcoding audio with the FFmpeg module while copying the video:

<ConfigTabs>
<TabItem value="ui">

1. Navigate to <NavPath path="Settings > System > go2rtc Streams" /> and expand the camera's stream.
2. Add a second **Source** that references the stream by name (e.g. the URL `ffmpeg:back`), enable **Use compatibility mode (ffmpeg)**, and set **Audio** to **Transcode to Opus** for WebRTC support.
3. Keep the original source as **Source 1** so MSE can use the camera's AAC (or transcode the first source's audio to AAC if the camera doesn't provide it).
4. **Save** the section.

</TabItem>
<TabItem value="yaml">

```yaml
go2rtc:
  streams:
    back:
      - rtsp://user:password@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2 # video + AAC for MSE
      - "ffmpeg:back#audio=opus" # adds an Opus track for WebRTC
```

If the camera's native audio isn't AAC either, transcode both:

```yaml
go2rtc:
  streams:
    back:
      - "ffmpeg:rtsp://user:password@10.0.10.10:554/live0#video=copy#audio=aac" # video copy + AAC for MSE
      - "ffmpeg:back#audio=opus" # Opus for WebRTC
```

</TabItem>
</ConfigTabs>

Setting the camera firmware to AAC (and H.264) avoids transcoding entirely and is always preferable when the camera supports it. For more detail and examples, see [Audio Support](/configuration/live#audio-support).

## WebRTC and two-way talk

WebRTC is only attempted when MSE fails or when using a camera's two-way talk feature; the "All Cameras" dashboard never uses it. When it doesn't work, the cause is almost always one of:

- **Codec mismatch** — WebRTC cannot carry H.265 or AAC. The stream backing the WebRTC view must provide Opus (or PCMA/PCMU) audio and H.264 video. Add an `ffmpeg:back#audio=opus` source as shown above.
- **Port `8555` not reachable, or no candidates set** — WebRTC needs port `8555` (both TCP and UDP) open and a reachable candidate advertised. On Docker installs running on a custom/overlay network, go2rtc may advertise unreachable container IPs as ICE candidates; setting `webrtc.filters.candidates: []` and supplying only your host's LAN IP resolves this. See [WebRTC extra configuration](/configuration/live#webrtc-extra-configuration).
- **Two-way talk** additionally requires a secure context (HTTPS or the authenticated port `8971`, because browsers block microphone access on plain HTTP). The camera's RTSP backchannel must also be handled correctly — go2rtc seizes the backchannel by default, which blocks two-way audio for other consumers and can inject static. Disable it on the primary stream with `#backchannel=0` and use a separate dedicated stream for talk, as documented in [preventing go2rtc from blocking two-way audio](/configuration/restream#two-way-talk-restream).

## High CPU usage

If go2rtc is using a lot of CPU, it is almost always transcoding in software. An FFmpeg source with a codec modifier like `#video=h264` or `#audio=aac` but **no** `#hardware` re-encodes on the CPU. (Frigate's `ffmpeg.hwaccel_args` only applies to Frigate's own detect/record processes — it does _not_ accelerate go2rtc's transcodes.)

To keep CPU usage down:

- Only transcode the track that is genuinely unsupported, and use `#video=copy` to pass video through untouched whenever possible.
- When you must transcode video, always add `#hardware` (the **Automatic** hardware option in the UI) so the encode runs on the GPU. Note the [FFmpeg 8 device requirement](#hardware-accelerated-transcoding-with-ffmpeg-8) below.
- Don't restream a high-resolution main stream just to feed the live view — even with `#video=copy`, muxing a 4K/8MP+ stream is inherently expensive. Use the camera's lower-resolution substream for live and detect, and let Frigate pull the main stream directly for recording.

## Connection, authentication, and complex passwords

If go2rtc logs `401 Unauthorized` for a URL that works in VLC, the password almost certainly contains reserved URL characters. **Frigate URL-encodes passwords for its own `cameras.ffmpeg.inputs`, but it does not touch what you write under `go2rtc.streams`** — go2rtc parses that URL itself. You must URL-encode special characters yourself in the `go2rtc.streams` section (`@` → `%40`, `#` → `%23`, `?` → `%3F`, `%` → `%25`, etc.).

Note the asymmetry: under `cameras.ffmpeg.inputs` you should use the **raw** password (Frigate encodes it for you) — pre-encoding it there causes a double-encode and fails. See [Handling Complex Passwords](/configuration/restream#handling-complex-passwords).

Repeated `401`/`Connection refused` errors can also mean the camera hit its **concurrent connection limit** or triggered a login lockout. Routing all roles through a single [RTSP restream](/configuration/restream#reduce-connections-to-camera) means the camera only ever sees one connection from go2rtc.

## Stream names must match everywhere

A surprising number of "the better live options aren't available" or `404 Not Found` problems come down to a name mismatch. The same string must be used consistently:

- the **go2rtc stream key** (`go2rtc.streams.<name>`),
- any `ffmpeg:<name>#…` source that references it,
- the camera's restream input path (`rtsp://127.0.0.1:8554/<name>`), and
- the camera name itself (so Frigate auto-maps it for MSE/WebRTC) — or an explicit `live -> streams` mapping pointing at the go2rtc stream **name** (never a path).

If you rename or remove a go2rtc stream while experimenting and the live stream selector then shows a blank entry, clear your browser's site data for the Frigate URL — the selected stream is cached per-device in local storage.

## Camera-specific behavior

Several camera brands have well-known quirks with go2rtc. Rather than repeat them here, see the [camera-specific configuration](/configuration/camera_specific) page, which covers them in detail. The highlights:

- **Reolink** — RTSP is unreliable on many models; the **http-flv** stream through the FFmpeg module is recommended, and you must enable HTTP/RTMP in the camera and **reboot** it. 6MP+ models stream H.265 over http-flv-enhanced, which requires FFmpeg 8.0. See [Reolink Cameras](/configuration/camera_specific#reolink-cameras).
- **TP-Link Tapo** — use go2rtc's native `tapo://` source for stability and two-way audio; a stale RTSP credential can often be revived by clicking play once in the go2rtc web UI.
- **Ubiquiti/UniFi Protect** — use the `rtspx://` scheme (not `rtsps://…?enableSrtp`).
- **Amcrest/Dahua** — use the `/cam/realmonitor?channel=1&subtype=N` scheme, where `subtype=0` is the main stream. See [Amcrest & Dahua](/configuration/camera_specific#amcrest--dahua).

## Non-RTSP sources and the FFmpeg module

go2rtc's native zero-copy handling only supports well-formed RTSP H.264/H.265. Anything else — MJPEG, HTTP/HTTP-FLV, RTMP, or unusual codecs — must be handed to the FFmpeg module by prefixing the source with `ffmpeg:`. This is also necessary for some camera streams to be parsed at all, at the cost of slightly slower startup. MJPEG and other non-H.264 sources additionally need `#video=h264` (with `#hardware`) before they can be used for the `record`, `detect`, or restream roles. See [MJPEG Cameras](/configuration/camera_specific#mjpeg-cameras) for a complete example.

## Hardware-accelerated transcoding with FFmpeg 8

Frigate 0.18 ships **FFmpeg 8.0** as the default, and FFmpeg 8 is stricter about hardware-accelerated filtering than earlier versions. Whenever go2rtc transcodes video with hardware acceleration (any source using `#hardware`, `#hardware=vaapi`, or the **Automatic** hardware option in the UI), it builds a filter chain that uploads frames to the GPU with the `hwupload` filter. FFmpeg 8 now refuses to do this unless it is told **which device** to use — earlier versions selected one automatically. The result is that an otherwise-working transcode fails to start, the live view never loads, and go2rtc logs:

```
[hwupload] A hardware device reference is required to upload frames to.
[AVFilterGraph] Error initializing filters
Error opening output files: Invalid argument
```

The fix is to tell go2rtc's bundled FFmpeg which hardware device to use via the `go2rtc -> ffmpeg -> global` option. For **VAAPI**-based acceleration — which covers most Intel and AMD GPUs, and is what go2rtc selects automatically on that hardware — point it at your render device:

```yaml
go2rtc:
  ffmpeg:
    global: "-vaapi_device /dev/dri/renderD128"
  streams:
    back:
      - "ffmpeg:rtsp://user:password@10.0.10.10:554/live0#video=h264#hardware"
```

`/dev/dri/renderD128` is the usual render node; on a system with more than one GPU you may need `renderD129` (or higher), and the device must be passed into the container (e.g. `devices: - /dev/dri:/dev/dri` in Docker Compose).

If you use a **different hardware acceleration backend**, you will likely need to specify its device in the same way, using the option that matches that backend instead of `-vaapi_device`. See the [go2rtc FFmpeg source documentation](https://github.com/AlexxIT/go2rtc/tree/v1.9.13#source-ffmpeg) and the upstream report ([go2rtc issue #1984](https://github.com/AlexxIT/go2rtc/issues/1984)) for background and other examples.

:::tip

If you don't transcode in go2rtc with hardware acceleration, this does not affect you. If you want to avoid the change entirely, you can pin Frigate (and the go2rtc it bundles) back to FFmpeg 7.0 by setting `ffmpeg -> path: "7.0"` in your config.

:::

## Home Assistant and port access

When running Frigate as a Home Assistant add-on, the go2rtc API (port `1984`), the RTSP restream (port `8554`), and WebRTC (port `8555`) are **disabled and hidden by default**. To use them — for example to reach the go2rtc web interface for troubleshooting, or to open a go2rtc stream externally in an app like VLC — go to <NavPath path="Settings > Add-ons > Frigate > Configuration > Network" />, click **Show disabled ports**, enable the port you need, and save. Use the host's IP address rather than an mDNS name like `homeassistant.local`.

If live view works in the Frigate UI but not in Home Assistant, the most common cause is the go2rtc stream name not matching the camera name — name the primary go2rtc stream exactly like the camera, or add a `live -> streams` mapping, so the integration can resolve the restream.
