# Configuration Examples

### Default (most RTSP cameras)
This is the default ffmpeg command and should work with most RTSP cameras that send h264 video
```yaml
ffmpeg:
  global_args:
    - -hide_banner
    - -loglevel
    - panic
  hwaccel_args: []
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
    - -vsync
    - drop
    - -rtsp_transport
    - tcp
    - -stimeout
    - '5000000' 
    - -use_wallclock_as_timestamps
    - '1'
  output_args:
    - -vf
    - mpdecimate
    - -f
    - rawvideo
    - -pix_fmt
    - rgb24
```

### RTMP Cameras
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
    - -vsync
    - drop
    - -use_wallclock_as_timestamps
    - '1'
```


### Hardware Acceleration

Intel Quicksync
```yaml
ffmpeg:
  hwaccel_args:
    - -hwaccel
    - vaapi
    - -hwaccel_device
    - /dev/dri/renderD128
    - -hwaccel_output_format
    - yuv420p
```