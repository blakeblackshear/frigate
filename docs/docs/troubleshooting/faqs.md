---
id: faqs
title: Frequently Asked Questions
---

### Fatal Python error: Bus error

This error message is due to a shm-size that is too small. Try updating your shm-size according to [this guide](../frigate/installation.md#calculating-required-shm-size).

### How can I get sound or audio in my recordings? {#audio-in-recordings}

By default, Frigate removes audio from recordings to reduce the likelihood of failing for invalid data. If you would like to include audio, you need to set a [FFmpeg preset](/configuration/ffmpeg_presets) that supports audio:

```yaml
ffmpeg:
  output_args:
    record: preset-record-generic-audio-aac
```

### How can I get sound in live view?

Audio is only supported for live view when go2rtc is configured, see [the live docs](../configuration/live.md) for more information.

### I can't view recordings in the Web UI.

Ensure your cameras send h264 encoded video, or [transcode them](/configuration/restream.md).

You can open `chrome://media-internals/` in another tab and then try to playback, the media internals page will give information about why playback is failing.

### What do I do if my cameras sub stream is not good enough?

Frigate generally [recommends cameras with configurable sub streams](/frigate/hardware.md). However, if your camera does not have a sub stream that a suitable resolution, the main stream can be resized.

To do this efficiently the following setup is required:

1. A GPU or iGPU must be available to do the scaling.
2. [ffmpeg presets for hwaccel](/configuration/hardware_acceleration_video.md) must be used
3. Set the desired detection resolution for `detect -> width` and `detect -> height`.

When this is done correctly, the GPU will do the decoding and scaling which will result in a small increase in CPU usage but with better results.

### My mjpeg stream or snapshots look green and crazy

This almost always means that the width/height defined for your camera are not correct. Double check the resolution with VLC or another player. Also make sure you don't have the width and height values backwards.

![mismatched-resolution](/img/mismatched-resolution-min.jpg)

### "[mov,mp4,m4a,3gp,3g2,mj2 @ 0x5639eeb6e140] moov atom not found"

These messages in the logs are expected in certain situations. Frigate checks the integrity of the recordings before storing. Occasionally these cached files will be invalid and cleaned up automatically.

### "MQTT connected" repeats in the logs

If you see repeated "MQTT connected" messages in your logs, check for another instance of Frigate. This happens when multiple Frigate containers are trying to connect to MQTT with the same `client_id`.

### Error: Database Is Locked

SQLite does not work well on a network share, if the `/media` folder is mapped to a network share then [this guide](../configuration/advanced/system.md#database) should be used to move the database to a location on the internal drive.

### Unable to publish to MQTT: client is not connected

If MQTT isn't working in docker try using the IP of the device hosting the MQTT server instead of `localhost`, `127.0.0.1`, or `mosquitto.ix-mosquitto.svc.cluster.local`.

This is because Frigate does not run in host mode so localhost points to the Frigate container and not the host device's network.

### How do I know if my camera is offline

A camera being offline can be detected via MQTT or /api/stats, the camera_fps for any offline camera will be 0.

Also, Home Assistant will mark any offline camera as being unavailable when the camera is offline.

### How can I view the Frigate log files without using the Web UI?

Frigate manages logs internally as well as outputs directly to Docker via standard output. To view these logs using the CLI, follow these steps:

- Open a terminal or command prompt on the host running your Frigate container.
- Type the following command and press Enter:
  ```
  docker logs -f frigate
  ```
  This command tells Docker to show you the logs from the Frigate container.
  Note: If you've given your Frigate container a different name, replace "frigate" in the command with your container's actual name. The "-f" option means the logs will continue to update in real-time as new entries are added. To stop viewing the logs, press `Ctrl+C`. If you'd like to learn more about using Docker logs, including additional options and features, you can explore Docker's [official documentation](https://docs.docker.com/engine/reference/commandline/logs/).

Alternatively, when you create the Frigate Docker container, you can bind a directory on the host to the mountpoint `/dev/shm/logs` to not only be able to persist the logs to disk, but also to be able to query them directly from the host using your favorite log parsing/query utility.

```
docker run -d \
  --name frigate \
  --restart=unless-stopped \
  --mount type=tmpfs,target=/tmp/cache,tmpfs-size=1000000000 \
  --device /dev/bus/usb:/dev/bus/usb \
  --device /dev/dri/renderD128 \
  --shm-size=64m \
  -v /path/to/your/storage:/media/frigate \
  -v /path/to/your/config:/config \
  -v /etc/localtime:/etc/localtime:ro \
  -v /path/to/local/log/dir:/dev/shm/logs \
  -e FRIGATE_RTSP_PASSWORD='password' \
  -p 5000:5000 \
  -p 8554:8554 \
  -p 8555:8555/tcp \
  -p 8555:8555/udp \
  ghcr.io/blakeblackshear/frigate:stable
```

### My RTSP stream works fine in VLC, but it does not work when I put the same URL in my Frigate config. Is this a bug?

No. Frigate uses the TCP protocol to connect to your camera's RTSP URL. VLC automatically switches between UDP and TCP depending on network conditions and stream availability. So a stream that works in VLC but not in Frigate is likely due to VLC selecting UDP as the transfer protocol.

TCP ensures that all data packets arrive in the correct order. This is crucial for video recording, decoding, and stream processing, which is why Frigate enforces a TCP connection. UDP is faster but less reliable, as it does not guarantee packet delivery or order, and VLC does not have the same requirements as Frigate.

You can still configure Frigate to use UDP by using ffmpeg input args or the preset `preset-rtsp-udp`. See the [ffmpeg presets](/configuration/ffmpeg_presets) documentation.

### Frigate is slow to start up with a "probing detect stream" message in the logs

When `detect.width` and `detect.height` are not set, Frigate probes each camera's detect stream on startup (and when saving the config) to auto-detect its resolution. For RTSP streams Frigate probes with ffprobe and automatically retries over TCP if UDP doesn't respond, with a 5 second timeout per attempt. A camera that cannot be reached over either transport will add up to ~10 seconds to startup before Frigate falls through with default dimensions, which may show up as width `0` and height `0` in Camera Probe Info under System Metrics.

To skip the probe entirely and make startup instant, set `detect.width` and `detect.height` explicitly in your camera config:

```yaml
cameras:
  my_camera:
    detect:
      width: 1280
      height: 720
```

### Why does Frigate keep creating new tracked objects for my parked car?

Stationary tracking is designed to _prevent_ this: a parked car should remain a single tracked object rather than generating new ones. If you're repeatedly getting new tracked objects for the same car, it's likely that Frigate is losing the object and re-detecting it as a new one.

Open one of the tracked objects in Explore → **Tracking Details**. If the detection scores are low (< 70% or so), the model isn't confident the parked car is a car. This is common with the free [COCO-trained](https://cocodataset.org/#explore) object detection models on steep/top-down angles, partially occluded cars, foliage, or low-light footage. When detections fall below `min_score` for too many frames the tracker loses the object, and the next confident frame creates a brand new one.

What helps:

- **Improve the view**: even a small angle change that gets more of the car visible could lift scores enough to stabilize tracking.
- **Use a more accurate model**: switching from `mobiledet` to `yolov9`, or stepping up to a larger variant like `yolov9-s` over `yolov9-t`, can help (at the cost of inference time, and still on the COCO dataset). The biggest gains usually come from fine-tuning a model on images from your own cameras so it learns your specific scene. [Frigate+](https://frigate.video/plus) is a paid option that does this - models are trained on security-camera footage and can be fine-tuned on images you submit from your own setup.
- **Don't set `detect -> stationary -> max_frames` for `car`**: it artificially ends tracking and forces re-detection as a new object. See [Stationary Objects](../configuration/stationary_objects.md).
- **Restrict alerts to the areas you care about** with `required_zones`. See [Zones](../configuration/zones.md#restricting-alerts-and-detections-to-specific-zones). Make sure those zones use the default `loitering_time: 0` unless you specifically want the review item to stay open until the car leaves.
- **Filter impossible locations** with [object filter masks](../configuration/masks.md#object-filter-masks) if cars are being detected on rooftops, treetops, etc.

See [Object Filters](../configuration/object_filters.md) for more on tuning `min_score` and `threshold`. Note that raising them too high will make this exact problem worse.

### How do I correct Frigate when it detects something as the wrong object?

Frigate's object detection relies on a machine learning [model](../frigate/glossary.md#model), and the free [COCO-trained](https://cocodataset.org/#explore) models that ship with Frigate can misidentify objects in scenes they weren't trained on. There are two ways to handle this, depending on whether you want to _teach_ the model or just _suppress_ the bad result.

**Train or fine-tune a model with your own images.** The most durable fix is to improve the model itself. The biggest gains usually come from fine-tuning a model on images from your own cameras so it learns your specific scene. Some tools are freely available, and [Frigate+](https://frigate.video/plus) is a paid option that does this - models are trained on security-camera footage and can be fine-tuned on images you submit from your own setup. When Frigate mislabels something, open the tracked object in Explore, select the **Snapshot** tab, and use **Submit to Frigate+** to send the example with the correct label (or mark it as a [false positive](../frigate/glossary.md#false-positive)). Once you've submitted examples and [requested a model](../plus/first_model.md), the retrained model will be more accurate for your cameras. See [Submitting examples to Frigate+](../integrations/plus.md#submit-examples) for the full workflow.

**Suppress the misidentification with filters.** You can use filters to stop a specific false positive from being tracked:

- Tune `min_score` / `threshold`, or add `min_area` / `max_area` / `min_ratio` / `max_ratio` filters. See [Object Filters](../configuration/object_filters.md).
- If the false positive is always in the same fixed spot (like a statue or mailbox that reads as a person), add an [object filter mask](../configuration/masks.md#object-filter-masks) over that location.

Filters and masks only hide the incorrect result - they don't teach Frigate what the object actually is. For that, fine-tune your own model or use Frigate+.
