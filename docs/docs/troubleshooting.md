---
id: troubleshooting
title: Troubleshooting and FAQ
---

### I am seeing a solid green image for my camera.

A solid green image means that frigate has not received any frames from ffmpeg. Check the logs to see why ffmpeg is exiting and adjust your ffmpeg args accordingly.

### How can I get sound or audio in my clips and recordings?

By default, Frigate removes audio from clips and recordings to reduce the likelihood of failing for invalid data. If you would like to include audio, you need to override the output args to remove `-an` for where you want to include audio. The recommended audio codec is `aac`. Not all audio codecs are supported by RTMP, so you may need to re-encode your audio with `-c:a aac`. The default ffmpeg args are shown [here](/frigate/configuration/index#ffmpeg).

### My mjpeg stream or snapshots look green and crazy

This almost always means that the width/height defined for your camera are not correct. Double check the resolution with vlc or another player. Also make sure you don't have the width and height values backwards.

![mismatched-resolution](/img/mismatched-resolution.jpg)

### I have clips and snapshots in my clips folder, but I can't view them in the Web UI.

This is usually caused one of two things:

- The permissions on the parent folder don't have execute and nginx returns a 403 error you can see in the browser logs
  - In this case, try mounting a volume to `/media/frigate` inside the container instead of `/media/frigate/clips`.
- Your cameras do not send h264 encoded video and the mp4 files are not playable in the browser

### "[mov,mp4,m4a,3gp,3g2,mj2 @ 0x5639eeb6e140] moov atom not found"

These messages in the logs are expected in certain situations. Frigate checks the integrity of the video cache before assembling clips. Occasionally these cached files will be invalid and cleaned up automatically.

### "On connect called"

If you see repeated "On connect called" messages in your config, check for another instance of frigate. This happens when multiple frigate containers are trying to connect to mqtt with the same client_id.
