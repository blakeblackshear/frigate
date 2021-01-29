---
id: troubleshooting
title: Troubleshooting and FAQ
---

### How can I get sound or audio in my clips and recordings?
By default, Frigate removes audio from clips and recordings to reduce the likelihood of failing for invalid data. If you would like to include audio, you need to override the output args to remove `-an` for where you want to include audio. The default ffmpeg args are shown [here](configuration/index#ffmpeg).

### My mjpeg stream or snapshots look green and crazy
This almost always means that the width/height defined for your camera are not correct. Double check the resolution with vlc or another player. Also make sure you don't have the width and height values backwards.

![mismatched-resolution](/img/mismatched-resolution.jpg)

## "[mov,mp4,m4a,3gp,3g2,mj2 @ 0x5639eeb6e140] moov atom not found"

These messages in the logs are expected in certain situations. Frigate checks the integrity of the video cache before assembling clips. Occasionally these cached files will be invalid and cleaned up automatically.

## "ffmpeg didnt return a frame. something is wrong"

Turn on logging for the ffmpeg process by overriding the global_args and setting the log level to `info` (the default is `fatal`). Note that all ffmpeg logs show up in the Frigate logs as `ERROR` level. This does not mean they are actually errors.

```yaml
ffmpeg:
  global_args: -hide_banner -loglevel info
```

## "On connect called"

If you see repeated "On connect called" messages in your config, check for another instance of frigate. This happens when multiple frigate containers are trying to connect to mqtt with the same client_id.
