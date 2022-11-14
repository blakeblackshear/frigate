---
id: restream
title: Restream
---

### RTSP

Frigate can restream your video feed as an RTSP feed for other applications such as Home Assistant to utilize it at `rtsp://<frigate_host>:8554/<camera_name>`. Port 8554 must be open. This allows you to use a video feed for detection in frigate and Home Assistant live view at the same time without having to make two separate connections to the camera. The video feed is copied from the original video feed directly to avoid re-encoding. This feed does not include any annotation by Frigate.

### RTMP (Deprecated)

In previous Frigate versions RTMP was used for re-streaming. RTMP has disadvantages however including being incompatible with H.265, high bitrates, and certain audio codecs. RTMP is deprecated and it is recommended to move to the new restream role.
