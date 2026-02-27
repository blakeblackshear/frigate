---
id: camera_specific
title: Camera Specific Configurations
---

:::note

This page makes use of presets of FFmpeg args. For more information on presets, see the [FFmpeg Presets](/configuration/ffmpeg_presets) page.

:::

:::note

Many cameras support encoding options which greatly affect the live view experience, see the [Live view](/configuration/live) page for more info.

:::

## H.265 Cameras via Safari

Some cameras support h265 with different formats, but Safari only supports the annexb format. When using h265 camera streams for recording with devices that use the Safari browser, the `apple_compatibility` option should be used.

```yaml
cameras:
  h265_cam: # <------ Doesn't matter what the camera is called
    ffmpeg:
      apple_compatibility: true # <- Adds compatibility with MacOS and iPhone
```

## MJPEG Cameras

Note that mjpeg cameras require encoding the video into h264 for recording, and restream roles. This will use significantly more CPU than if the cameras supported h264 feeds directly. It is recommended to use the restream role to create an h264 restream and then use that as the source for ffmpeg.

```yaml
go2rtc:
  streams:
    mjpeg_cam: "ffmpeg:http://your_mjpeg_stream_url#video=h264#hardware" # <- use hardware acceleration to create an h264 stream usable for other components.

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

### Amcrest & Dahua

Amcrest & Dahua cameras should be connected to via RTSP using the following format:

```
rtsp://USERNAME:PASSWORD@CAMERA-IP/cam/realmonitor?channel=1&subtype=0 # this is the main stream
rtsp://USERNAME:PASSWORD@CAMERA-IP/cam/realmonitor?channel=1&subtype=1 # this is the sub stream, typically supporting low resolutions only
rtsp://USERNAME:PASSWORD@CAMERA-IP/cam/realmonitor?channel=1&subtype=2 # higher end cameras support a third stream with a mid resolution (1280x720, 1920x1080)
rtsp://USERNAME:PASSWORD@CAMERA-IP/cam/realmonitor?channel=1&subtype=3 # new higher end cameras support a fourth stream with another mid resolution (1280x720, 1920x1080)

```

### Annke C800

This camera is H.265 only. To be able to play clips on some devices (like MacOs or iPhone) the H.265 stream has to be adjusted using the `apple_compatibility` config.

```yaml
cameras:
  annkec800: # <------ Name the camera
    ffmpeg:
      apple_compatibility: true # <- Adds compatibility with MacOS and iPhone
      output_args:
        record: preset-record-generic-audio-aac

      inputs:
        - path: rtsp://USERNAME:PASSWORD@CAMERA-IP/H264/ch1/main/av_stream # <----- Update for your camera
          roles:
            - detect
            - record
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

### Hikvision Cameras

Hikvision cameras should be connected to via RTSP using the following format:

```
rtsp://USERNAME:PASSWORD@CAMERA-IP/streaming/channels/101 # this is the main stream
rtsp://USERNAME:PASSWORD@CAMERA-IP/streaming/channels/102 # this is the sub stream, typically supporting low resolutions only
rtsp://USERNAME:PASSWORD@CAMERA-IP/streaming/channels/103 # higher end cameras support a third stream with a mid resolution (1280x720, 1920x1080)
```

:::note

[Some users have reported](https://www.reddit.com/r/frigate_nvr/comments/1hg4ze7/hikvision_security_settings) that newer Hikvision cameras require adjustments to the security settings:

```
RTSP Authentication - digest/basic
RTSP Digest Algorithm - MD5
WEB Authentication - digest/basic
WEB Digest Algorithm  - MD5
```

:::

### Reolink Cameras

Reolink has many different camera models with inconsistently supported features and behavior. The below table shows a summary of various features and recommendations.

| Camera Resolution | Camera Generation         | Recommended Stream Type           | Additional Notes                                                        |
| ----------------- | ------------------------- | --------------------------------- | ----------------------------------------------------------------------- |
| 5MP or lower      | All                       | http-flv                          | Stream is h264                                                          |
| 6MP or higher     | Latest (ex: Duo3, CX-8##) | http-flv with ffmpeg 8.0, or rtsp | This uses the new http-flv-enhanced over H265 which requires ffmpeg 8.0 |
| 6MP or higher     | Older (ex: RLC-8##)       | rtsp                              |                                                                         |

Frigate works much better with newer reolink cameras that are setup with the below options:

If available, recommended settings are:

- `On, fluency first` this sets the camera to CBR (constant bit rate)
- `Interframe Space 1x` this sets the iframe interval to the same as the frame rate

According to [this discussion](https://github.com/blakeblackshear/frigate/issues/3235#issuecomment-1135876973), the http video streams seem to be the most reliable for Reolink.

Cameras connected via a Reolink NVR can be connected with the http stream, use `channel[0..15]` in the stream url for the additional channels.
The setup of main stream can be also done via RTSP, but isn't always reliable on all hardware versions. The example configuration is working with the oldest HW version RLN16-410 device with multiple types of cameras.

<details>
  <summary>Example Config</summary>

:::tip

Reolink's latest cameras support two way audio via go2rtc and other applications. It is important that the http-flv stream is still used for stability, a secondary rtsp stream can be added that will be using for the two way audio only.

NOTE: The RTSP stream can not be prefixed with `ffmpeg:`, as go2rtc needs to handle the stream to support two way audio.

Ensure HTTP is enabled in the camera's advanced network settings. To use two way talk with Frigate, see the [Live view documentation](/configuration/live#two-way-talk).

:::

```yaml
go2rtc:
  streams:
    # example for connecting to a standard Reolink camera
    your_reolink_camera:
      - "ffmpeg:http://reolink_ip/flv?port=1935&app=bcs&stream=channel0_main.bcs&user=username&password=password#video=copy#audio=copy#audio=opus"
    your_reolink_camera_sub:
      - "ffmpeg:http://reolink_ip/flv?port=1935&app=bcs&stream=channel0_ext.bcs&user=username&password=password"
    # example for connectin to a Reolink camera that supports two way talk
    your_reolink_camera_twt:
      - "ffmpeg:http://reolink_ip/flv?port=1935&app=bcs&stream=channel0_main.bcs&user=username&password=password#video=copy#audio=copy#audio=opus"
      - "rtsp://username:password@reolink_ip/Preview_01_sub"
    your_reolink_camera_twt_sub:
      - "ffmpeg:http://reolink_ip/flv?port=1935&app=bcs&stream=channel0_ext.bcs&user=username&password=password"
      - "rtsp://username:password@reolink_ip/Preview_01_sub"
    # example for connecting to a Reolink NVR
    your_reolink_camera_via_nvr:
      - "ffmpeg:http://reolink_nvr_ip/flv?port=1935&app=bcs&stream=channel3_main.bcs&user=username&password=password" # channel numbers are 0-15
      - "ffmpeg:your_reolink_camera_via_nvr#audio=aac"
    your_reolink_camera_via_nvr_sub:
      - "ffmpeg:http://reolink_nvr_ip/flv?port=1935&app=bcs&stream=channel3_ext.bcs&user=username&password=password"

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
  reolink_via_nvr:
    ffmpeg:
      inputs:
        - path: rtsp://127.0.0.1:8554/your_reolink_camera_via_nvr?video=copy&audio=aac
          input_args: preset-rtsp-restream
          roles:
            - record
        - path: rtsp://127.0.0.1:8554/your_reolink_camera_via_nvr_sub?video=copy
          input_args: preset-rtsp-restream
          roles:
            - detect
```
</details>

### Unifi Protect Cameras

:::note 

Unifi G5s cameras and newer need a Unifi Protect server to enable rtsps stream, it's not posible to enable it in standalone mode.

:::

Unifi protect cameras require the rtspx stream to be used with go2rtc.
To utilize a Unifi protect camera, modify the rtsps link to begin with rtspx.
Additionally, remove the "?enableSrtp" from the end of the Unifi link.

```yaml
go2rtc:
  streams:
    front:
      - rtspx://192.168.1.1:7441/abcdefghijk
```

[See the go2rtc docs for more information](https://github.com/AlexxIT/go2rtc/tree/v1.9.10#source-rtsp)

In the Unifi 2.0 update Unifi Protect Cameras had a change in audio sample rate which causes issues for ffmpeg. The input rate needs to be set for record if used directly with unifi protect.

```yaml
ffmpeg:
  output_args:
    record: preset-record-ubiquiti
```

### TP-Link VIGI Cameras

TP-Link VIGI cameras need some adjustments to the main stream settings on the camera itself to avoid issues. The stream needs to be configured as `H264` with `Smart Coding` set to `off`. Without these settings you may have problems when trying to watch recorded footage. For example Firefox will stop playback after a few seconds and show the following error message: `The media playback was aborted due to a corruption problem or because the media used features your browser did not support.`.

### Wyze Wireless Cameras

Some community members have found better performance on Wyze cameras by using an alternative firmware known as [Thingino](https://thingino.com/).

## USB Cameras (aka Webcams)

To use a USB camera (webcam) with Frigate, the recommendation is to use go2rtc's [FFmpeg Device](https://github.com/AlexxIT/go2rtc?tab=readme-ov-file#source-ffmpeg-device) support:

- Preparation outside of Frigate:

  - Get USB camera path. Run `v4l2-ctl --list-devices` to get a listing of locally-connected cameras available. (You may need to install `v4l-utils` in a way appropriate for your Linux distribution). In the sample configuration below, we use `video=0` to correlate with a detected device path of `/dev/video0`
  - Get USB camera formats & resolutions. Run `ffmpeg -f v4l2 -list_formats all -i /dev/video0` to get an idea of what formats and resolutions the USB Camera supports. In the sample configuration below, we use a width of 1024 and height of 576 in the stream and detection settings based on what was reported back.
  - If using Frigate in a container (e.g. Docker on TrueNAS), ensure you have USB Passthrough support enabled, along with a specific Host Device (`/dev/video0`) + Container Device (`/dev/video0`) listed.

- In your Frigate Configuration File, add the go2rtc stream and roles as appropriate:

```
go2rtc:
  streams:
    usb_camera:
      - "ffmpeg:device?video=0&video_size=1024x576#video=h264"

cameras:
  usb_camera:
    enabled: true
    ffmpeg:
      inputs:
        - path: rtsp://127.0.0.1:8554/usb_camera
          input_args: preset-rtsp-restream
          roles:
            - detect
            - record
    detect:
      enabled: false # <---- disable detection until you have a working camera feed
      width: 1024
      height: 576
```
