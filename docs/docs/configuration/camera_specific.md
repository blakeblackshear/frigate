---
id: camera_specific
title: Camera Specific Configurations
---

### MJPEG Cameras

The input and output parameters need to be adjusted for MJPEG cameras

```yaml
input_args:
  - -avoid_negative_ts
  - make_zero
  - -fflags
  - nobuffer
  - -flags
  - low_delay
  - -strict
  - experimental
  - -fflags
  - +genpts+discardcorrupt
  - -r
  - "3" # <---- adjust depending on your desired frame rate from the mjpeg image
  - -use_wallclock_as_timestamps
  - "1"
```

Note that mjpeg cameras require encoding the video into h264 for recording, and rtmp roles. This will use significantly more CPU than if the cameras supported h264 feeds directly.

```yaml
output_args:
  record: -f segment -segment_time 10 -segment_format mp4 -reset_timestamps 1 -strftime 1 -c:v libx264 -an
  rtmp: -c:v libx264 -an -f flv
```

### RTMP Cameras (Reolink 410/520 and possibly others)

The input parameters need to be adjusted for RTMP cameras

```yaml
ffmpeg:
  input_args:
    - -avoid_negative_ts
    - make_zero
    - -fflags
    - nobuffer
    - -flags
    - low_delay
    - -strict
    - experimental
    - -fflags
    - +genpts+discardcorrupt
    - -rw_timeout
    - "5000000"
    - -use_wallclock_as_timestamps
    - "1"
    - -f
    - live_flv
```

### Blue Iris RTSP Cameras

You will need to remove `nobuffer` flag for Blue Iris RTSP cameras

```yaml
ffmpeg:
  input_args:
    - -avoid_negative_ts
    - make_zero
    - -flags
    - low_delay
    - -strict
    - experimental
    - -fflags
    - +genpts+discardcorrupt
    - -rtsp_transport
    - tcp
    - -stimeout
    - "5000000"
    - -use_wallclock_as_timestamps
    - "1"
```
