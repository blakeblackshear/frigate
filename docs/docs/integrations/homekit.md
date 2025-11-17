---
id: homekit
title: HomeKit
---

Frigate cameras can be integrated with Apple HomeKit through go2rtc. This allows you to view your camera streams directly in the Apple Home app on your iOS, iPadOS, macOS, and tvOS devices.

## Overview

HomeKit integration is handled entirely through go2rtc, which is embedded in Frigate. go2rtc provides the necessary HomeKit Accessory Protocol (HAP) server to expose your cameras to HomeKit.

## Setup

All HomeKit configuration and pairing should be done through the **go2rtc WebUI**.

### Accessing the go2rtc WebUI

The go2rtc WebUI is available at:

```
http://<frigate_host>:1984
```

Replace `<frigate_host>` with the IP address or hostname of your Frigate server.

### Pairing Cameras

1. Navigate to the go2rtc WebUI at `http://<frigate_host>:1984`
2. Use the `add` section to add a new camera to HomeKit
3. Follow the on-screen instructions to generate pairing codes for your cameras

## Requirements

- Frigate must be accessible on your local network using host network_mode
- Your iOS device must be on the same network as Frigate
- Port 1984 must be accessible for the go2rtc WebUI
- For detailed go2rtc configuration options, refer to the [go2rtc documentation](https://github.com/AlexxIT/go2rtc)
