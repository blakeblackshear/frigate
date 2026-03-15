---
id: restream
title: Restream
---

## RTSP

Frigate can restream your video feed as an RTSP feed for other applications such as Home Assistant to utilize it at `rtsp://<frigate_host>:8554/<camera_name>`. Port 8554 must be open. [This allows you to use a video feed for detection in Frigate and Home Assistant live view at the same time without having to make two separate connections to the camera](#reduce-connections-to-camera). The video feed is copied from the original video feed directly to avoid re-encoding. This feed does not include any annotation by Frigate.

Frigate uses [go2rtc](https://github.com/AlexxIT/go2rtc/tree/v1.9.13) to provide its restream and MSE/WebRTC capabilities. The go2rtc config is hosted at the `go2rtc` in the config, see [go2rtc docs](https://github.com/AlexxIT/go2rtc/tree/v1.9.13#configuration) for more advanced configurations and features.

:::note

You can access the go2rtc stream info at `/api/go2rtc/streams` which can be helpful to debug as well as provide useful information about your camera streams.

:::

### Birdseye Restream

Birdseye RTSP restream can be accessed at `rtsp://<frigate_host>:8554/birdseye`. Enabling the birdseye restream will cause birdseye to run 24/7 which may increase CPU usage somewhat.

```yaml
birdseye:
  restream: True
```

:::tip

To improve connection speed when using Birdseye via restream you can enable a small idle heartbeat by setting `birdseye.idle_heartbeat_fps` to a low value (e.g. `1–2`). This makes Frigate periodically push the last frame even when no motion is detected, reducing initial connection latency.

:::

### Securing Restream With Authentication

The go2rtc restream can be secured with RTSP based username / password authentication. Ex:

```yaml
go2rtc:
  rtsp:
    username: "admin"
    password: "pass"
  streams: ...
```

**NOTE:** This does not apply to localhost requests, there is no need to provide credentials when using the restream as a source for frigate cameras.

## Reduce Connections To Camera

Some cameras only support one active connection or you may just want to have a single connection open to the camera. The RTSP restream allows this to be possible.

### With Single Stream

One connection is made to the camera. One for the restream, `detect` and `record` connect to the restream.

```yaml
go2rtc:
  streams:
    name_your_rtsp_cam: # <- for RTSP streams
      - rtsp://192.168.1.5:554/live0 # <- stream which supports video & aac audio
      - "ffmpeg:name_your_rtsp_cam#audio=opus" # <- copy of the stream which transcodes audio to the missing codec (usually will be opus)
    name_your_http_cam: # <- for other streams
      - http://192.168.50.155/flv?port=1935&app=bcs&stream=channel0_main.bcs&user=user&password=password # <- stream which supports video & aac audio
      - "ffmpeg:name_your_http_cam#audio=opus" # <- copy of the stream which transcodes audio to the missing codec (usually will be opus)

cameras:
  name_your_rtsp_cam:
    ffmpeg:
      output_args:
        record: preset-record-generic-audio-copy
      inputs:
        - path: rtsp://127.0.0.1:8554/name_your_rtsp_cam # <--- the name here must match the name of the camera in restream
          input_args: preset-rtsp-restream
          roles:
            - record
            - detect
            - audio # <- only necessary if audio detection is enabled
  name_your_http_cam:
    ffmpeg:
      output_args:
        record: preset-record-generic-audio-copy
      inputs:
        - path: rtsp://127.0.0.1:8554/name_your_http_cam # <--- the name here must match the name of the camera in restream
          input_args: preset-rtsp-restream
          roles:
            - record
            - detect
            - audio # <- only necessary if audio detection is enabled
```

### With Sub Stream

Two connections are made to the camera. One for the sub stream, one for the restream, `record` connects to the restream.

```yaml
go2rtc:
  streams:
    name_your_rtsp_cam:
      - rtsp://192.168.1.5:554/live0 # <- stream which supports video & aac audio. This is only supported for rtsp streams, http must use ffmpeg
      - "ffmpeg:name_your_rtsp_cam#audio=opus" # <- copy of the stream which transcodes audio to opus
    name_your_rtsp_cam_sub:
      - rtsp://192.168.1.5:554/substream # <- stream which supports video & aac audio. This is only supported for rtsp streams, http must use ffmpeg
      - "ffmpeg:name_your_rtsp_cam_sub#audio=opus" # <- copy of the stream which transcodes audio to opus
    name_your_http_cam:
      - http://192.168.50.155/flv?port=1935&app=bcs&stream=channel0_main.bcs&user=user&password=password # <- stream which supports video & aac audio. This is only supported for rtsp streams, http must use ffmpeg
      - "ffmpeg:name_your_http_cam#audio=opus" # <- copy of the stream which transcodes audio to opus
    name_your_http_cam_sub:
      - http://192.168.50.155/flv?port=1935&app=bcs&stream=channel0_ext.bcs&user=user&password=password # <- stream which supports video & aac audio. This is only supported for rtsp streams, http must use ffmpeg
      - "ffmpeg:name_your_http_cam_sub#audio=opus" # <- copy of the stream which transcodes audio to opus

cameras:
  name_your_rtsp_cam:
    ffmpeg:
      output_args:
        record: preset-record-generic-audio-copy
      inputs:
        - path: rtsp://127.0.0.1:8554/name_your_rtsp_cam # <--- the name here must match the name of the camera in restream
          input_args: preset-rtsp-restream
          roles:
            - record
        - path: rtsp://127.0.0.1:8554/name_your_rtsp_cam_sub # <--- the name here must match the name of the camera_sub in restream
          input_args: preset-rtsp-restream
          roles:
            - audio # <- only necessary if audio detection is enabled
            - detect
  name_your_http_cam:
    ffmpeg:
      output_args:
        record: preset-record-generic-audio-copy
      inputs:
        - path: rtsp://127.0.0.1:8554/name_your_http_cam # <--- the name here must match the name of the camera in restream
          input_args: preset-rtsp-restream
          roles:
            - record
        - path: rtsp://127.0.0.1:8554/name_your_http_cam_sub # <--- the name here must match the name of the camera_sub in restream
          input_args: preset-rtsp-restream
          roles:
            - audio # <- only necessary if audio detection is enabled
            - detect
```

## Handling Complex Passwords

go2rtc expects URL-encoded passwords in the config, [urlencoder.org](https://urlencoder.org) can be used for this purpose.

For example:

```yaml
go2rtc:
  streams:
    my_camera: rtsp://username:$@foo%@192.168.1.100
```

becomes

```yaml
go2rtc:
  streams:
    my_camera: rtsp://username:$%40foo%25@192.168.1.100
```

See [this comment](https://github.com/AlexxIT/go2rtc/issues/1217#issuecomment-2242296489) for more information.

## Preventing go2rtc from blocking two-way audio {#two-way-talk-restream}

For cameras that support two-way talk, go2rtc will automatically establish an audio output backchannel when connecting to an RTSP stream. This backchannel blocks access to the camera's audio output for two-way talk functionality, preventing both Frigate and other applications from using it.

To prevent this, you must configure two separate stream instances:

1. One stream instance with `#backchannel=0` for Frigate's viewing, recording, and detection (prevents go2rtc from establishing the blocking backchannel)
2. A second stream instance without `#backchannel=0` for two-way talk functionality (can be used by Frigate's WebRTC viewer or other applications)

Configuration example:

```yaml
go2rtc:
  streams:
    front_door:
      - rtsp://user:password@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2#backchannel=0
    front_door_twoway:
      - rtsp://user:password@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
```

In this configuration:

- `front_door` stream is used by Frigate for viewing, recording, and detection. The `#backchannel=0` parameter prevents go2rtc from establishing the audio output backchannel, so it won't block two-way talk access.
- `front_door_twoway` stream is used for two-way talk functionality. This stream can be used by Frigate's WebRTC viewer when two-way talk is enabled, or by other applications (like Home Assistant Advanced Camera Card) that need access to the camera's audio output channel.

## Security: Restricted Stream Sources

For security reasons, the `echo:`, `expr:`, and `exec:` stream sources are disabled by default in go2rtc. These sources allow arbitrary command execution and can pose security risks if misconfigured.

If you attempt to use these sources in your configuration, the streams will be removed and an error message will be printed in the logs.

To enable these sources, you must set the environment variable `GO2RTC_ALLOW_ARBITRARY_EXEC=true`. This can be done in your Docker Compose file or container environment:

```yaml
environment:
  - GO2RTC_ALLOW_ARBITRARY_EXEC=true
```

:::warning

Enabling arbitrary exec sources allows execution of arbitrary commands through go2rtc stream configurations. Only enable this if you understand the security implications and trust all sources of your configuration.

:::

## Advanced Restream Configurations

The [exec](https://github.com/AlexxIT/go2rtc/tree/v1.9.13#source-exec) source in go2rtc can be used for custom ffmpeg commands. An example is below:

:::warning

The `exec:`, `echo:`, and `expr:` sources are disabled by default for security. You must set `GO2RTC_ALLOW_ARBITRARY_EXEC=true` to use them. See [Security: Restricted Stream Sources](#security-restricted-stream-sources) for more information.

:::

:::warning

The `exec:`, `echo:`, and `expr:` sources are disabled by default for security. You must set `GO2RTC_ALLOW_ARBITRARY_EXEC=true` to use them. See [Security: Restricted Stream Sources](#security-restricted-stream-sources) for more information.

:::

NOTE: The output will need to be passed with two curly braces `{{output}}`

```yaml
go2rtc:
  streams:
    stream1: exec:ffmpeg -hide_banner -re -stream_loop -1 -i /media/BigBuckBunny.mp4 -c copy -rtsp_transport tcp -f rtsp {{output}}
```
## Two-Way Talk with UniFi Protect Cameras {#two-way-talk-unifi-protect}

UniFi Protect cameras use a proprietary talkback protocol instead of standard RTSP backchannel. The camera speaker will not play any audio until a **talkback session** is explicitly activated through the [Protect Integration API](https://developer.ui.com). Without this activation step, audio from go2rtc reaches the camera but the speaker stays silent.

This section walks through the full setup: identifying compatible cameras, obtaining the required IDs and credentials, configuring go2rtc, and enabling remote access.

### Prerequisites

Before starting, ensure your Frigate docker-compose includes:

```yaml
services:
  frigate:
    ports:
      - "8555:8555/tcp"   # WebRTC over TCP
      - "8555:8555/udp"   # WebRTC over UDP
    environment:
      - GO2RTC_ALLOW_ARBITRARY_EXEC=true   # Required for exec: backchannel
```

:::warning

`GO2RTC_ALLOW_ARBITRARY_EXEC=true` enables arbitrary command execution through go2rtc stream configurations. Only enable this if you trust all sources of your configuration. See [Security: Restricted Stream Sources](#security-restricted-stream-sources) for more information.

:::

### Step 1: Generate a Protect API Key

1. Open the UniFi Protect web UI on your UNVR or UDM console
2. Go to **Settings → Integrations → API Integration**
3. Click **Create API Key**
4. Copy the key — you will need it for the talkback script

:::note

On a standalone UNVR, the API endpoint is `https://UNVR_IP`. On a UDM (SE, Pro, Pro Max) with built-in Protect, the endpoint is `https://UDM_IP`. Both use the same API path structure — only the host differs.

:::

### Step 2: Identify Cameras with Speaker Hardware

Not all UniFi cameras have speakers. Only cameras with speaker hardware support talkback (e.g., G4 Instant, G4 Doorbell, G5 Turret Ultra). Cameras without speakers will reject the talkback session API call with a `DOWNSTREAM_ERROR`.

Query the Protect Integration API to list cameras and check for speaker support:

```bash
curl -sk "https://YOUR_PROTECT_HOST/proxy/protect/integration/v1/cameras" \
  -H "X-API-KEY: YOUR_API_KEY" | python3 -c "
import json, sys
for cam in json.load(sys.stdin):
    flags = cam.get('featureFlags', {})
    print(f\"{cam['name']:30s}  id={cam['id']}  speaker={flags.get('hasSpeaker', False)}  mic={flags.get('hasMic', False)}\")
"
```

Look for cameras where `speaker=True`. Save the `id` value — this is the camera ID needed for the talkback script. Camera IDs are hex strings like `65d8aa4001945203e70003ea`.

### Step 3: Find the Camera IP Address

The talkback script sends audio via RTP directly to the camera's IP on port 7004. You can find camera IPs by:

- Checking your UniFi Network controller (Devices → Client list, or the camera's properties page)
- Checking your DHCP server / router client list
- Looking at the talkback session API response, which returns the target RTP endpoint:

```bash
curl -sk -X POST \
  -H "X-API-KEY: YOUR_API_KEY" \
  "https://YOUR_PROTECT_HOST/proxy/protect/integration/v1/cameras/CAMERA_ID/talkback-session"
```

Response:
```json
{"url": "rtp://CAMERA_IP:7004", "codec": "opus", "samplingRate": 24000, "bitsPerSample": 16}
```

The `url` field contains the camera's direct IP. Cameras must be reachable from the Frigate host on UDP port 7004.

### Step 4: Find RTSP Stream Keys

UniFi Protect cameras are accessed via RTSP through the UNVR/UDM (not directly from the camera). The RTSP URL format is:

```
rtspx://PROTECT_HOST:7441/STREAM_KEY
```

To find stream keys for your cameras:

1. Open the Protect web UI
2. Go to a camera's settings → **Advanced**
3. The RTSP stream URL is shown under **RTSP Stream** (if enabled)

Or query the API — the RTSP channel info is included in the camera details response.

### Step 5: Configure go2rtc Streams

Each camera with talkback needs three stream lines in the go2rtc config: the RTSP source (with backchannel disabled), an audio transcode, and the exec backchannel.

```yaml
go2rtc:
  streams:
    front_door:
      - "rtspx://PROTECT_HOST:7441/STREAM_KEY#backchannel=0"  # <- disable RTSP backchannel
      - "ffmpeg:front_door#audio=opus"                          # <- transcode audio to opus
      - "exec:bash /config/talkback.sh CAMERA_ID CAMERA_IP#backchannel=1#audio=pcma/8000"
```

**Key details:**
- `#backchannel=0` on the RTSP source prevents go2rtc from attempting a standard RTSP backchannel, which Protect ignores. Without this, go2rtc may block the audio output channel (see [Preventing go2rtc from blocking two-way audio](#two-way-talk-restream))
- `#backchannel=1#audio=pcma/8000` on the exec line tells go2rtc this is a backchannel accepting PCMA audio at 8000 Hz
- Only define **one** exec backchannel per camera. Multiple exec backchannels on the same stream cause `Stdin already set` errors in go2rtc
- The exec backchannel is lazy-initialized — the script only starts when a WebRTC client sends audio

### Step 6: Create the Talkback Wrapper Script

Create `/config/talkback.sh` inside the Frigate config directory (bind-mounted into the container). This script activates the Protect talkback session, runs a keepalive loop, and starts ffmpeg to transcode and forward audio.

```bash
#!/bin/bash
# talkback.sh — Activate UniFi Protect talkback session then forward audio
CAMERA_ID="$1"
CAMERA_IP="$2"
API_KEY="YOUR_PROTECT_API_KEY"
PROTECT_HOST="https://YOUR_PROTECT_HOST"
URL="$PROTECT_HOST/proxy/protect/integration/v1/cameras/$CAMERA_ID/talkback-session"

# Activate talkback session (required before speaker will play audio)
curl -sk -X POST -H "X-API-KEY: $API_KEY" "$URL" >/dev/null 2>&1

# Keepalive: refresh talkback session every 25 seconds while ffmpeg runs
(while kill -0 $$ 2>/dev/null; do
  sleep 25
  curl -sk -X POST -H "X-API-KEY: $API_KEY" "$URL" >/dev/null 2>&1
done) &

# Transcode PCMA from go2rtc stdin to Opus and send RTP to camera talkback port
exec ffmpeg -re -fflags nobuffer -f alaw -ar 8000 -i pipe:0 \
  -vn -acodec libopus -ar 24000 -ac 1 -b:a 32k -f rtp "rtp://$CAMERA_IP:7004"
```

Replace `YOUR_PROTECT_API_KEY` and `YOUR_PROTECT_HOST` with values from Step 1.

Make the script executable:

```bash
chmod +x /config/talkback.sh
```

:::note

The ffmpeg output parameters (`-ar 24000 -ac 1 -b:a 32k -f rtp`) match the codec parameters returned by the talkback session API (`opus`, 24000 Hz sample rate, 16-bit). Use `pipe:0` (not `-i -`) as the ffmpeg input — some YAML serializers break `-i -` across multiple lines.

:::

### Step 7: Configure Remote Access (WebRTC)

WebRTC media (audio and video) uses direct UDP/TCP peer connections. **It does not traverse HTTP proxies or reverse proxies, including Cloudflare tunnels.** Cloudflare tunnels only proxy the HTTP/WebSocket signaling used to set up the connection — the actual media stream requires direct connectivity.

For two-way talk to work from outside your LAN (e.g., phone on cellular):

1. **Port forward** port 8555 (both UDP and TCP) on your router to the Frigate host
2. **Configure STUN** in go2rtc so it auto-discovers your public IP for ICE candidates:

```yaml
go2rtc:
  webrtc:
    candidates:
      - 192.168.1.100:8555   # LAN IP of Frigate host
      - stun:8555             # Auto-discover public IP via STUN for remote clients
```

The `stun:8555` candidate queries a public STUN server to learn your WAN IP, then advertises it to remote WebRTC clients. Both the LAN candidate (for local access) and the STUN candidate (for remote access) should be included.

:::warning

Without the STUN candidate, WebRTC connections from outside your network will fail because the remote client has no way to reach the Frigate host. The LAN IP candidate only works for clients on the same network.

:::

:::note

**If you cannot port forward** (CGNAT, double-NAT, mobile hotspot/tether as WAN uplink), alternatives include:

- **Tailscale / WireGuard** — mesh VPN gives both sides routable IPs, no port forward needed
- **TURN relay** — cloud-hosted (e.g., metered.ca, Twilio) or self-hosted (coturn). go2rtc supports TURN servers via its `ice_servers` configuration. TURN relays media through a server when direct connectivity is impossible
- **Self-hosted WireGuard VPS** — forward port 8555 on a VPS, tunnel traffic back to your Frigate host

Two-way talk on LAN still works without any of these — port forwarding and STUN are only needed for remote (off-network) access.

:::

### Echo Suppression {#echo-suppression}

Two-way talk creates a feedback loop: the camera's speaker plays the audio you send, the camera's microphone picks it up, and it is sent back to you through the WebRTC stream. Without suppression, you hear your own voice echoed back with a delay.

The standard approach is **half-duplex audio** — mute the incoming audio stream while the microphone is active (push-to-talk), then unmute when the microphone is released. This is the same approach used by the UniFi Protect app, Ring, Nest, and other camera talkback implementations.

In Frigate's WebRTCPlayer, echo suppression is handled automatically. When two-way talk is active, the receive audio is muted to prevent the camera's microphone from feeding speaker output back to the caller. No additional configuration is needed.

If you are building a custom WebRTC client (for example, using go2rtc's API directly), implement half-duplex by muting the `<video>` element when the microphone is transmitting:

```javascript
// When starting talk
videoElement.muted = true;

// When stopping talk
videoElement.muted = false;
```

This is sufficient because the echo path is purely acoustic (speaker to microphone on the camera), not electrical. Muting the receive side on the client breaks the loop.

### Complete Example

Putting it all together for a UniFi G4 Instant camera on a standalone UNVR:

```yaml
go2rtc:
  webrtc:
    candidates:
      - 192.168.1.100:8555       # Frigate host LAN IP
      - stun:8555                 # Public IP auto-discovery for remote access
  streams:
    front_door:
      - "rtspx://192.168.1.50:7441/abc123streamkey#backchannel=0"
      - "ffmpeg:front_door#audio=opus"
      - "exec:bash /config/talkback.sh 65d8aa4001945203e70003ea 192.168.1.60#backchannel=1#audio=pcma/8000"
```

Where:
- `192.168.1.50` — UNVR IP address
- `abc123streamkey` — RTSP stream key from Protect camera settings
- `65d8aa4001945203e70003ea` — camera ID from the Protect API (Step 2)
- `192.168.1.60` — camera's direct IP address (Step 3)

Docker-compose environment:
```yaml
environment:
  - GO2RTC_ALLOW_ARBITRARY_EXEC=true
ports:
  - "8555:8555/tcp"
  - "8555:8555/udp"
```
