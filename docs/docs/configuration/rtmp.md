---
id: rtmp
title: RTMP
---

Frigate can re-stream your video feed as a RTMP feed for other applications such as Home Assistant to utilize it at `rtmp://<frigate_host>/live/<camera_name>`. Port 1935 must be open. This allows you to use a video feed for detection in frigate and Home Assistant live view at the same time without having to make two separate connections to the camera. The video feed is copied from the original video feed directly to avoid re-encoding. This feed does not include any annotation by Frigate.

Some video feeds are not compatible with RTMP. If you are experiencing issues, check to make sure your camera feed is h264 with AAC audio. If your camera doesn't support a compatible format for RTMP, you can use the ffmpeg args to re-encode it on the fly at the expense of increased CPU utilization.
