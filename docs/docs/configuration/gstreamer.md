---
id: gstreamer
title: GStreamer configuration
---

In addition to the FFmpeg, Frigate does support GStreamer. GStreamer is a framework for creating streaming media applications. The main advantages are that the pluggable components can be mixed and matched into arbitrary pipelines.
GStreamer has better support of hardware-accelerated video decoding on NVidia Jetson devices.

**Note:** There are no advantages of GStreamer versus FFmpeg on non-Jetson devices.

## Minimal GStreamer Configuration

```yaml
camera_name:
  gstreamer:
    inputs:
      - path: rtsp://10.0.0.1:554/stream0
        roles:
          - detect
  detect:
    width: 1920
    height: 1080
```

With the minimal configuration GStreamer integration will do the following:
- Run `gst-inspect-1.0` to get the available plugins
- Run `gst-discoverer-1.0` against the RTSP stream. The discovery process gets the audio and video stream codecs
- Build the GStreamer pipeline based on the available plugins.
- GStreamer automatically enable audio stream for recording if audio is available

The default configuration should be enough for most of the cases. However, if you have multiple cameras, running `gst-discoverer-1.0` for each one might be pretty time-consuming. To avoid running `gst-discoverer-1.0`, you have to specify the video codec as well as the audio codec for the `record` role.


## GStreamer configuration with video and audio codecs set

```yaml
camera_name:
  gstreamer:
    video_format: video/x-h265
    audio_format: audio/x-alaw
    inputs:
      - path: rtsp://10.0.0.1:554/stream0
        # video_format: video/x-h265
        # audio_format: audio/x-alaw
        roles:
          - record

      - path: rtsp://10.0.0.1:554/stream1
        # video_format: video/x-h265
        roles:
          - detect
  detect:
    width: 1920
    height: 1080
```

This setup is much more reliable, as it won't trigger the call to the `gst-discoverer-1.0` which might timeout occasionally. If you have different audio or video formats for different streams, you can override the defaults for each input.

### Supported Video Formats

GStreamer integration does not limit you which video format to use. It solely depends on the GStreamer plugins. GStreamer integration is building the `parse` plugin by doing the following steps:

- lowercase the video format
- strip the optional `video/x-` prefix
- add the remainder to the `parse` for the `recorder`
- create"rtp{video_format}depay" element for the `decoder`

That way, if you specified `video/x-h264` as a video format, GStreamer should support the `h264parse` and `rtph264depay` pipeline elements.

### Supported Audio Formats

As of now, only `audio/x-alaw` and `audio/mpeg` are supported. Audio formats require different pipelines.
To add a new audio format, one has to update `AUDIO_PIPELINES` in the `gstreamer.py`.

Alternatively, `audio_pipeline` element of either input or camera level can be added to specify a custom audio pipeline. 
`audio_pipeline` has a priority over `audio_format`, e.g. if you set both `audio_format` and `audio_pipeline`, the `audio_pipeline` will be used for decoding audio.

Audio settings make sense only for the `record` role of your camera.


```yaml
camera_name:
  gstreamer:
    video_format: video/x-h265
    inputs:
      - path: rtsp://10.0.0.1:554/stream0
        audio_pipeline:
          - rtppcmadepay
          - alawdec
          - audioconvert
          - queue
          - voaacenc
        roles:
          - record

      - path: rtsp://10.0.0.1:554/stream1
        roles:
          - detect
  detect:
    width: 1920
    height: 1080
```

In the example above, `audio_pipeline` has a setup that is equivalent to having the `audio_format: audio/x-alaw` option.

If you want to disable audio, please set `audio_format:  none`. If you specify no audio format for the `record` role, GStreamer integration will run a `gst-discoverer-1.0` for detecting audio format.


## Advanced configuration

If you have a very specific camera and you're handy with the gstreamer, you can use `raw_pipeline` to specify your pipeline.
This will give you full control over gstreamer behavior and allow tweaking and troubleshooting issues.

Make sure to keep the `roles` array in sync with the behavior of your `raw_pipeline`. For example, do not use `fdsink` for record-only inputs.


```yaml
camera_name:
  gstreamer:
    video_format: video/x-h265
    inputs:
      - path: whatever
        raw_pipeline:
          - rtspsrc location="rtsp://some/url" name=rtp_stream protocols=tcp latency=0 do-timestamp=true
          - rtpjitterbuffer do-lost=true drop-on-latency=true
          - rtph264depay
          - tee name=depayed_stream
          - queue
          - nvv4l2decoder enable-max-performance=true
          - "video/x-raw(memory:NVMM),format=NV12"
          - nvvidconv
          - "video/x-raw,width=(int)1920,height=(int)1080,format=(string)I420"
          - fdsink depayed_stream.
          - queue
          - h264parse
          - splitmuxsink async-finalize=true send-keyframe-requests=true max-size-bytes=0 name=mux muxer=mp4mux location=/tmp/cache/cam_name-gstsplitmuxchunk-%05d.mp4 max-size-time=10000000000 rtp_stream.
          - queue
          - rtpmp4gdepay
          - aacparse
          - mux.audio_0
        roles:
          - record
          - detect
  detect:
    width: 1920
    height: 1080
```

This pipeline uses NVidia `nvv4l2decoder` with both detect and recording capabilities, using `h264` video and `audio/mpeg` streams. 

This pipeline can be split into multiple blocks. The first block is an input pipeline. It consists of `rtspsrc` and `rtpjitterbuffer` plugins.

```yaml
  - rtspsrc location="rtsp://some/url" name=rtp_stream protocols=tcp latency=0 do-timestamp=true
  - rtpjitterbuffer do-lost=true drop-on-latency=true
```

This block sets up the `rtsp` source and adds the `rtpjitterbuffer`. `rtpjitterbuffer` dedupes the RTP packets and create a PTS on the outgoing buffer.

This block extracts H264 video from RTP packets (RFC 3984)

```yaml
  - rtph264depay
```

This block splits the H264 video for detection and recording pipelines.
```yaml
  - tee name=depayed_stream
  - queue
```

This block decodes the H264 video stream and outputs it in `I420`. Frigate does require the video to be in `I420` since Frigate uses a grayscale image for motion detection for better performance.
`fdsink` put the output to the /dev/stdout captured by the Frigate. Make sure to keep `fdsink depayed_stream.` The `depayed_stream.` uses the stream from the `tee name=depayed_stream` for the recording.

```yaml
- nvv4l2decoder enable-max-performance=true
- "video/x-raw(memory:NVMM),format=NV12"
- nvvidconv
- "video/x-raw,width=(int)1920,height=(int)1080,format=(string)I420"
- fdsink depayed_stream.
```

This block prepare the  H264 video stream for recording and create named `mp4mux` for muxing audio and video streams. The resulting stream will be put into `.mp4` files with a max of 10 seconds in length. The actual length might be between 6 and 8 seconds since the keyframe is used to detect the actual time.
The `rtp_stream.` emits the RTP stream from the `rtspsrc` element.

```yaml
- queue
- h264parse
- splitmuxsink async-finalize=true send-keyframe-requests=true max-size-bytes=0 name=mux muxer=mp4mux location=/tmp/cache/cam_name-gstsplitmuxchunk-%05d.mp4 max-size-time=10000000000 rtp_stream.
```

The last block does the extraction of the audio stream from RTP. Then prepare it for the `mp4mux` block. Since the audio stream, in this case, is `audio/mpeg`, the pipeline only does `aacparse` to extract the encoded audio from the RTP stream.

```yaml
- queue
- rtpmp4gdepay
- aacparse
- mux.audio_0
```

### Tweaking the standard configuration

In most cases, you probably do not need to come up with your own GStreamer pipeline. Instead, you may want to tweak some of the blocks to get a better result.
A good example might be an `audio_pipeline` we discussed above. It allows the addition of non-supported audio streams for the recording.
GStreamer integration has the following configuration parameters:

- raw_pipeline
- input_options
- video_format
- audio_format
- audio_pipeline
- record_pipeline

We have already discussed some of them. Let's look into `input_options` and `record_pipeline`.

### Input path and input_options

Input path provides the URI to the camera stream. `rtsp://` and `rtmp://` schemes are supported. 
For each scheme, a correspondent GStreamer pipeline element is used: `rtspsrc` for "rtsp://" and `rtmpsrc` for `rtmp://`

GStreamer adds `latency=0 do-timestamp=true` parameters for the `rtspsrc`.
However, you might need to add extra arguments. To do that, you can use `input_options` array.

For instance, standard parameters can be passed this way:

```yaml
camera_name:
  gstreamer:
    video_format: video/x-h265
    inputs:
      - path: rtsp://10.0.0.1:554/stream0
        input_options:
          - latency=0
          - do-timestamp=true
  ...
```

You can even add a pipeline element right after the `rtspsrc`

```yaml
camera_name:
  gstreamer:
    video_format: video/x-h265
    inputs:
      - path: rtsp://10.0.0.1:554/stream0
        input_options:
          - latency=0
          - do-timestamp=true
          - "! rtpjitterbuffer do-lost=true"
  ...
```

Note the ` ! ` before `rtpjitterbuffer`. It indicates the new pipeline element.

This setup equivalent to the following raw pipeline snippet:

```yaml
        raw_pipeline:
          - rtspsrc location="rtsp://10.0.0.1:554/stream0" latency=0 do-timestamp=true
          - rtpjitterbuffer do-lost=true
```

You can even completely replace the input pipeline. If integration does not see the `rtsp://` or `rtmp://` in the input patch,
it will consider it as a raw input pipeline, not a path.

```yaml
camera_name:
  gstreamer:
    video_format: video/x-h265
    inputs:
      - path: srtsrc uri="srt://127.0.0.1:7001" latency=0 name=rtp_stream
        roles:
          - detect
    ...
```

This setup allows using a non-supported SRT stream as a source.

**Note:** SRT stream would not work without tweaking depay and decode elements. The `srtsrc` is mentioned here as an example.


### record_pipeline element

record_pipeline allows replacing the record pipeline for the `record` role. By default `record_pipeline` consists of one gstreamer element - `h264parse` or `h265parse`, depending on the video codec you set up. This setup prevents video re-encoding and saves resources.

However, for some edge cases, you might find it useful to do some sort of video transformation. You may add some GStreamer video enhancement elements, or even add some ML-based elements, though you need to build a custom build for that.

## Experimenting with GSreamer

You might find yourself stuck with a non-working GStreamer pipeline. To troubleshoot it, you can copy the resulting GStreamer pipeline and put it into the bash file to run it separately from GStreamer.
You just need to do a couple of tweaks:

- Put your URI into the environment variable, such as `LOC="rtsp://user:pwd@0.0.0.0:554/stream0"` That way you won't confuse your shell
- Keep `'video/x-raw(memory:NVMM),format=NV12'` and `'video/x-raw,width=(int)704,height=(int)576,format=(string)I420'` elements inside single quotes.
- Replace `fdsink` with `autovideosink async=true` to get a video overlay
- Replace `location` parameter of the `splitmuxsink` to point to your local folder.

This is an example script to detect the camera stream:

```
LOC="rtsp://user:pass@1.2.3.4:554/stream0"
gst-discoverer-1.0 -v $LOC
```


This is an example script to run video stream with the recording:

```
gst-launch-1.0 rtspsrc location=$LOC name=rtp_stream latency=0 do-timestamp=true live=true ! \
    rtpjitterbuffer do-lost=true drop-on-latency=true ! \
    rtph265depay ! \
    tee name=depayed_stream ! \
    queue ! \
    nvv4l2decoder enable-max-performance=true  ! \
    'video/x-raw(memory:NVMM),format=NV12' ! \
    nvvidconv ! \
    'video/x-raw,width=(int)704,height=(int)576,format=(string)I420' ! \
    autovideosink async=true depayed_stream. ! \
    queue ! \
    h265parse config-interval=-1 ! \
    splitmuxsink name=mux muxer=mp4mux async-handling=true location=loc-gstsplitmuxchunk-%05d.mp4 max-size-time=10000000000 rtp_stream. ! \
    queue ! rtppcmadepay ! alawdec ! audioconvert ! queue ! voaacenc ! mux.audio_0
```

