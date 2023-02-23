---
id: faqs
title: Frequently Asked Questions
---

### Fatal Python error: Bus error

This error message is due to a shm-size that is too small. Try updating your shm-size according to [this guide](../frigate/installation.md#calculating-required-shm-size).

### How can I get sound or audio in my recordings? {#audio-in-recordings}

By default, Frigate removes audio from recordings to reduce the likelihood of failing for invalid data. If you would like to include audio, you need to set a [FFmpeg preset](/configuration/ffmpeg_presets) that supports audio:

```yaml title="frigate.yml"
ffmpeg:
  output_args:
    record: preset-record-generic-audio-aac
```

### I can't view events or recordings in the Web UI.

Ensure your cameras send h264 encoded video, or [transcode them](/configuration/restream.md).

You can open `chrome://media-internals/` in another tab and then try to playback, the media internals page will give information about why playback is failing.

### My mjpeg stream or snapshots look green and crazy

This almost always means that the width/height defined for your camera are not correct. Double check the resolution with VLC or another player. Also make sure you don't have the width and height values backwards.

![mismatched-resolution](/img/mismatched-resolution-min.jpg)

### "[mov,mp4,m4a,3gp,3g2,mj2 @ 0x5639eeb6e140] moov atom not found"

These messages in the logs are expected in certain situations. Frigate checks the integrity of the recordings before storing. Occasionally these cached files will be invalid and cleaned up automatically.

### "On connect called"

If you see repeated "On connect called" messages in your logs, check for another instance of Frigate. This happens when multiple Frigate containers are trying to connect to MQTT with the same `client_id`.

### Error: Database Is Locked

SQLite does not work well on a network share, if the `/media` folder is mapped to a network share then [this guide](../configuration/advanced.md#database) should be used to move the database to a location on the internal drive.
