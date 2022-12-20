---
id: camera_specific
title: Camera Specific Configurations
---

## MJPEG Cameras

The input and output parameters need to be adjusted for MJPEG cameras

```yaml
input_args: -avoid_negative_ts make_zero -fflags nobuffer -flags low_delay -strict experimental -fflags +genpts+discardcorrupt -use_wallclock_as_timestamps 1 -c:v mjpeg
```

Note that mjpeg cameras require encoding the video into h264 for recording, and rtmp roles. This will use significantly more CPU than if the cameras supported h264 feeds directly.

```yaml
output_args:
  record: -f segment -segment_time 10 -segment_format mp4 -reset_timestamps 1 -strftime 1 -c:v libx264 -an
  rtmp: -c:v libx264 -an -f flv
```

## JPEG Stream Cameras

Cameras using a live changing jpeg image will need input parameters as below

```yaml
input_args:
- -r
- 5 # << enter FPS here
- -stream_loop
- -1
- -f
- image2
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
- 1
```

Outputting the stream will have the same args and caveats as per [MJPEG Cameras](#mjpeg-cameras)

## RTMP Cameras

The input parameters need to be adjusted for RTMP cameras

```yaml
ffmpeg:
  input_args: -avoid_negative_ts make_zero -fflags nobuffer -flags low_delay -strict experimental -fflags +genpts+discardcorrupt -rw_timeout 5000000 -use_wallclock_as_timestamps 1 -f live_flv
```

## UDP Only Cameras

If your cameras do not support TCP connections for RTSP, you can use UDP.

```yaml
ffmpeg:
  input_args: -avoid_negative_ts make_zero -fflags +genpts+discardcorrupt -rtsp_transport udp -timeout 5000000 -use_wallclock_as_timestamps 1
```

## Model/vendor specific setup

### Annke C800
This camera is H.265 only. To be able to play clips on some devices (like MacOs or iPhone) the H.265 stream has to be repackaged and the audio stream has to be converted to aac. Unfortunately direct playback of in the browser is not working (yet), but the downloaded clip can be played locally.

```yaml
cameras:
  annkec800: # <------ Name the camera
    ffmpeg:
      output_args:
        record: -f segment -segment_time 10 -segment_format mp4 -reset_timestamps 1 -strftime 1 -c:v copy -tag:v hvc1 -bsf:v hevc_mp4toannexb -c:a aac
        rtmp: -c:v copy -c:a aac -f flv
        
      inputs:
        - path: rtsp://user:password@camera-ip:554/H264/ch1/main/av_stream # <----- Update for your camera
          roles:
            - detect
            - record
            - rtmp
    rtmp:
      enabled: False # <-- RTMP should be disabled if your stream is not H264
    detect:
      width:  # <---- update for your camera's resolution
      height:  # <---- update for your camera's resolution


```

### Blue Iris RTSP Cameras

You will need to remove `nobuffer` flag for Blue Iris RTSP cameras

```yaml
ffmpeg:
  input_args: -avoid_negative_ts make_zero -flags low_delay -strict experimental -fflags +genpts+discardcorrupt -rtsp_transport tcp -timeout 5000000 -use_wallclock_as_timestamps 1
```

### Reolink Cameras

Reolink has older cameras (ex: 410 & 520) as well as newer camera (ex: 520a & 511wa) which support different subsets of options. In both cases using the below configuration is recommended.

If available, recommended settings are:
- `On, fluency first` this sets the camera to CBR (constant bit rate)
- `Interframe Space 1x` this sets the iframe interval to the same as the frame rate

According to [this discussion](https://github.com/blakeblackshear/frigate/issues/3235#issuecomment-1135876973), the http video streams seem to be the most reliable for Reolink.

```yaml
cameras:
  reolink:
    ffmpeg:
      input_args:
        - -avoid_negative_ts
        - make_zero
        - -fflags
        - +genpts+discardcorrupt
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
      width: 896
      height: 672
      fps: 7
```

### Unifi Protect Cameras

In the Unifi 2.0 update Unifi Protect Cameras had a change in audio sample rate which causes issues for ffmpeg. The input rate needs to be set for record and rtmp.

```yaml
ffmpeg:
  output_args:
    record: -f segment -segment_time 10 -segment_format mp4 -reset_timestamps 1 -strftime 1 -c:v copy -ar 44100 -c:a aac
    rtmp: -c:v copy -f flv -ar 44100 -c:a aac
```
