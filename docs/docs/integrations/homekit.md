---
id: homekit
title: HomeKit
---

Frigate cameras can be exported to Apple HomeKit through go2rtc. Each exported camera appears as an accessory in the Apple Home app on your iOS, iPadOS, macOS, and tvOS devices.

## Overview

Exporting cameras is handled entirely through go2rtc, which is embedded in Frigate. go2rtc provides the necessary HomeKit Accessory Protocol (HAP) server, so your camera is published to HomeKit as an accessory in its own right.

:::note

This is the opposite of importing a HomeKit camera. go2rtc can also pair with an existing HomeKit camera (Aqara, Eve, Eufy, and similar) and use it as a stream source, which is what the `add` page of the go2rtc WebUI is for. That page discovers HomeKit accessories on your network and will not list your Frigate cameras. It is not used for exporting.

:::

## Requirements

- Frigate must be running with `network_mode: host` so that HomeKit can discover your cameras over mDNS
- Your Apple device must be on the same network as Frigate
- Port 1984 must be accessible so you can reach the go2rtc WebUI

HomeKit also places strict limits on the stream itself. go2rtc passes your stream through without resizing or re-encoding it, so the stream you export must already meet these requirements:

- **Video:** H.264 at 1920x1080, 1280x720, or 320x240
- **Audio:** Opus, mono, 16 kHz

A camera's full resolution stream usually does not qualify. See [Exporting a compatible stream](#exporting-a-compatible-stream) below.

## Configuration

HomeKit settings are stored in `/config/go2rtc_homekit.yml`. This is a separate file from your Frigate config, because go2rtc needs to write your pairings back to it when you pair a device.

Edit it using the go2rtc config editor, which writes to that file directly:

```
http://<frigate_host>:1984/editor.html
```

Replace `<frigate_host>` with the IP address or hostname of your Frigate server. The editor will be empty until you add a HomeKit section, since this file holds only your HomeKit settings and not the rest of your go2rtc config.

:::warning

Do not put the `homekit:` section in the `go2rtc:` section of your Frigate config.

Frigate regenerates that config on every startup, so go2rtc cannot save your pairings to it. Pairing will appear to succeed and then fail after the next restart with `PairVerify with unknown client_id`. If the section exists in both places, your saved pairings are erased on every restart.

:::

Add an entry for each camera you want to export. The key must match the name of a go2rtc stream, and the pin must be 8 digits. This is the number the Home app calls the setup code:

```yaml
homekit:
  front_door:
    name: Front Door
    pin: "12345678"
```

If the key does not match a go2rtc stream, go2rtc logs `[homekit] missing stream:` at startup and the camera will not appear in the Home app.

:::note

go2rtc derives each accessory's HomeKit identity from this key, so renaming it later means the camera appears as a new accessory and has to be paired again. Settle on the name before you pair.

:::

Frigate keeps only the `homekit:` section of this file when it starts, so do not store streams or other go2rtc settings in it.

### Exporting a compatible stream

If a camera's stream does not meet the requirements listed above, define a scaled restream in your Frigate config and point HomeKit at that stream instead of the original:

```yaml
go2rtc:
  streams:
    front_door:
      - rtsp://user:password@192.168.1.50:554/stream
    front_door_homekit:
      - "ffmpeg:front_door#video=h264#width=1280#height=720#audio=opus/16000"
```

```yaml
# /config/go2rtc_homekit.yml
homekit:
  front_door_homekit:
    name: Front Door
    pin: "12345678"
```

Add `#hardware=cuda`, `#hardware=vaapi`, or the appropriate value for your system to transcode using your GPU. Note that NVENC cannot encode H.264 wider than 4096 pixels, so very wide streams must be scaled down as shown above rather than only re-encoded.

## Pairing Cameras

1. Restart Frigate after adding the `homekit:` section
2. In the Apple Home app, choose **Add Accessory**, then **More options** to enter a code manually
3. Select your camera and enter the pin you configured as the setup code
4. Confirm that a `pairings:` list now appears under the camera in `/config/go2rtc_homekit.yml`

Pairings are saved back to that file automatically. If step 4 shows no `pairings:` list, check the Frigate log for `[homekit] can't save`, which means the `homekit:` section is missing from `/config/go2rtc_homekit.yml`.

For detailed go2rtc configuration options, refer to the [go2rtc documentation](https://github.com/AlexxIT/go2rtc).
