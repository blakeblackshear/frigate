---
id: camera_specific
title: Camera Specific Configurations
---

:::note

This page makes use of presets of FFmpeg args. For more information on presets, see the [FFmpeg Presets](/configuration/ffmpeg_presets) page.

:::

## MJPEG Cameras

Note that mjpeg cameras require encoding the video into h264 for recording, and restream roles. This will use significantly more CPU than if the cameras supported h264 feeds directly. It is recommended to use the restream role to create an h264 restream and then use that as the source for ffmpeg.

```yaml
go2rtc:
  streams:
    mjpeg_cam: "ffmpeg:{your_mjpeg_stream_url}#video=h264#hardware" # <- use hardware acceleration to create an h264 stream usable for other components.

cameras:
  ...
  mjpeg_cam:
    ffmpeg:
      inputs:
        - path: rtsp://127.0.0.1:8554/mjpeg_cam
          roles:
            - detect
            - record
```

## JPEG Stream Cameras

Cameras using a live changing jpeg image will need input parameters as below

```yaml
input_args: preset-http-jpeg-generic
```

Outputting the stream will have the same args and caveats as per [MJPEG Cameras](#mjpeg-cameras)

## RTMP Cameras

The input parameters need to be adjusted for RTMP cameras

```yaml
ffmpeg:
  input_args: preset-rtmp-generic
```

## UDP Only Cameras

If your cameras do not support TCP connections for RTSP, you can use UDP.

```yaml
ffmpeg:
  input_args: preset-rtsp-udp
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
      width: # <- optional, by default Frigate tries to automatically detect resolution
      height: # <- optional, by default Frigate tries to automatically detect resolution
```

### Blue Iris RTSP Cameras

You will need to remove `nobuffer` flag for Blue Iris RTSP cameras

```yaml
ffmpeg:
  input_args: preset-rtsp-blue-iris
```

### Reolink Cameras

Reolink has older cameras (ex: 410 & 520) as well as newer camera (ex: 520a & 511wa) which support different subsets of options. In both cases using the http stream is recommended.
Frigate works much better with newer reolink cameras that are setup with the below options:

If available, recommended settings are:

- `On, fluency first` this sets the camera to CBR (constant bit rate)
- `Interframe Space 1x` this sets the iframe interval to the same as the frame rate

According to [this discussion](https://github.com/blakeblackshear/frigate/issues/3235#issuecomment-1135876973), the http video streams seem to be the most reliable for Reolink.

```yaml
go2rtc:
  streams:
    your_reolink_camera:
      - "ffmpeg:http://reolink_ip/flv?port=1935&app=bcs&stream=channel0_main.bcs&user=username&password=password#video=copy#audio=copy#audio=opus"
    your_reolink_camera_sub:
      - "ffmpeg:http://reolink_ip/flv?port=1935&app=bcs&stream=channel0_ext.bcs&user=username&password=password"

cameras:
  your_reolink_camera:
    ffmpeg:
      inputs:
        - path: rtsp://127.0.0.1:8554/your_reolink_camera
          input_args: preset-rtsp-restream
          roles:
            - record
        - path: rtsp://127.0.0.1:8554/your_reolink_camera_sub
          input_args: preset-rtsp-restream
          roles:
            - detect
```

### Unifi Protect Cameras

Unifi protect cameras require the rtspx stream to be used with go2rtc.
To utilize a Unifi protect camera, modify the rtsps link to begin with rtspx.
Additionally, remove the "?enableSrtp" from the end of the Unifi link.

```yaml
go2rtc:
  streams:
    front:
      - rtspx://192.168.1.1:7441/abcdefghijk
```

[See the go2rtc docs for more information](https://github.com/AlexxIT/go2rtc/tree/v1.8.4#source-rtsp)

In the Unifi 2.0 update Unifi Protect Cameras had a change in audio sample rate which causes issues for ffmpeg. The input rate needs to be set for record and rtmp if used directly with unifi protect.

```yaml
ffmpeg:
  output_args:
    record: preset-record-ubiquiti
    rtmp: preset-rtmp-ubiquiti # recommend using go2rtc instead
```

### TP-Link VIGI Cameras

TP-Link VIGI cameras need some adjustments to the main stream settings on the camera itself to avoid issues. The stream needs to be configured as `H264` with `Smart Coding` set to `off`. Without these settings you may have problems when trying to watch recorded events. For example Firefox will stop playback after a few seconds and show the following error message: `The media playback was aborted due to a corruption problem or because the media used features your browser did not support.`.
