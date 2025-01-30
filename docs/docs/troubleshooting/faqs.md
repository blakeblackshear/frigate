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
2. [ffmpeg presets for hwaccel](/configuration/hardware_acceleration.md) must be used
3. Set the desired detection resolution for `detect -> width` and `detect -> height`.

When this is done correctly, the GPU will do the decoding and scaling which will result in a small increase in CPU usage but with better results.

### My mjpeg stream or snapshots look green and crazy

This almost always means that the width/height defined for your camera are not correct. Double check the resolution with VLC or another player. Also make sure you don't have the width and height values backwards.

![mismatched-resolution](/img/mismatched-resolution-min.jpg)

### "[mov,mp4,m4a,3gp,3g2,mj2 @ 0x5639eeb6e140] moov atom not found"

These messages in the logs are expected in certain situations. Frigate checks the integrity of the recordings before storing. Occasionally these cached files will be invalid and cleaned up automatically.

### "On connect called"

If you see repeated "On connect called" messages in your logs, check for another instance of Frigate. This happens when multiple Frigate containers are trying to connect to MQTT with the same `client_id`.

### Error: Database Is Locked

SQLite does not work well on a network share, if the `/media` folder is mapped to a network share then [this guide](../configuration/advanced.md#database) should be used to move the database to a location on the internal drive.

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
