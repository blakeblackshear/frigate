---
id: faqs
title: Frequently Asked Questions
---

### Fatal Python error: Bus error

This error message is due to a shm-size that is too small. Try updating your shm-size according to [this guide](/installation#calculating-required-shm-size).

### I am seeing a solid green image for my camera.

A solid green image means that frigate has not received any frames from ffmpeg. Check the logs to see why ffmpeg is exiting and adjust your ffmpeg args accordingly.

### How can I get sound or audio in my recordings?

By default, Frigate removes audio from recordings to reduce the likelihood of failing for invalid data. If you would like to include audio, you need to override the output args to remove `-an` for where you want to include audio. The recommended audio codec is `aac`. Not all audio codecs are supported by RTMP, so you may need to re-encode your audio with `-c:a aac`. The default ffmpeg args are shown [here](configuration/index#full-configuration-reference).

### My mjpeg stream or snapshots look green and crazy

This almost always means that the width/height defined for your camera are not correct. Double check the resolution with vlc or another player. Also make sure you don't have the width and height values backwards.

![mismatched-resolution](/img/mismatched-resolution-min.jpg)

### I can't view events or recordings in the Web UI.

Ensure your cameras send h264 encoded video

### "[mov,mp4,m4a,3gp,3g2,mj2 @ 0x5639eeb6e140] moov atom not found"

These messages in the logs are expected in certain situations. Frigate checks the integrity of the recordings before storing. Occasionally these cached files will be invalid and cleaned up automatically.

### "On connect called"

If you see repeated "On connect called" messages in your config, check for another instance of frigate. This happens when multiple frigate containers are trying to connect to mqtt with the same client_id.
