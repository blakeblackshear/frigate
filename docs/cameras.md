# Camera Specific Configuration
Frigate should work with most RTSP cameras and h264 feeds such as Dahua.

## RTMP Cameras
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
    - -use_wallclock_as_timestamps
    - '1'
```