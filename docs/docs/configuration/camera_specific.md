---
id: camera_specific
title: Camera Specific Configurations
---

### MJPEG Cameras

The input and output parameters need to be adjusted for MJPEG cameras

```yaml
input_args: -avoid_negative_ts make_zero -fflags nobuffer -flags low_delay -strict experimental -fflags +genpts+discardcorrupt -use_wallclock_as_timestamps 1
```

Note that mjpeg cameras require encoding the video into h264 for recording, and rtmp roles. This will use significantly more CPU than if the cameras supported h264 feeds directly.

```yaml
output_args:
  record: -f segment -segment_time 10 -segment_format mp4 -reset_timestamps 1 -strftime 1 -c:v libx264 -an
  rtmp: -c:v libx264 -an -f flv
```

### JPEG Stream Cameras

Cameras using a live changing jpeg image will need input parameters as below

```yaml
input_args:
- -r
- 5 # << enter FPS here
- -stream_loop
- -1
- -f
- image2
```

Outputting the stream will have the same args and caveats as per [MJPEG Cameras](#mjpeg-cameras)

### RTMP Cameras

The input parameters need to be adjusted for RTMP cameras

```yaml
ffmpeg:
  input_args: -avoid_negative_ts make_zero -fflags nobuffer -flags low_delay -strict experimental -fflags +genpts+discardcorrupt -rw_timeout 5000000 -use_wallclock_as_timestamps 1 -f live_flv
```

### Reolink 410/520 (possibly others)

According to [this discussion](https://github.com/blakeblackshear/frigate/issues/1713#issuecomment-932976305), the http video streams seem to be the most reliable for Reolink.

```yaml
cameras:
  reolink:
    ffmpeg:
      hwaccel_args:
      input_args:
        - -avoid_negative_ts
        - make_zero
        - -fflags
        - nobuffer+genpts+discardcorrupt
        - -flags
        - low_delay
        - -strict
        - experimental
        - -analyzeduration
        - 1000M
        - -probesize
        - 1000M
        - -rw_timeout
        - "5000000"
      inputs:
        - path: http://reolink_ip/flv?port=1935&app=bcs&stream=channel0_main.bcs&user=username&password=password
          roles:
            - record
            - rtmp
        - path: http://reolink_ip/flv?port=1935&app=bcs&stream=channel0_ext.bcs&user=username&password=password
          roles:
            - detect
    detect:
      width: 640
      height: 480
      fps: 7
```

![Resolutions](/img/reolink-settings.png)

### Blue Iris RTSP Cameras

You will need to remove `nobuffer` flag for Blue Iris RTSP cameras

```yaml
ffmpeg:
  input_args: -avoid_negative_ts make_zero -flags low_delay -strict experimental -fflags +genpts+discardcorrupt -rtsp_transport tcp -stimeout 5000000 -use_wallclock_as_timestamps 1
```

### UDP Only Cameras

If your cameras do not support TCP connections for RTSP, you can use UDP.

```yaml
ffmpeg:
  input_args: -avoid_negative_ts make_zero -fflags +genpts+discardcorrupt -rtsp_transport udp -stimeout 5000000 -use_wallclock_as_timestamps 1
```
