---
id: troubleshooting
title: Troubleshooting
---

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
