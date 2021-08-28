---
id: index
title: Configuration
---

For HassOS installations, the default location for the config file is `/config/frigate.yml`.

For all other installations, the default location for the config file is '/config/config.yml'. This can be overridden with the `CONFIG_FILE` environment variable. Camera specific ffmpeg parameters are documented [here](cameras.md).

It is recommended to start with a minimal configuration and add to it:

```yaml
mqtt:
  host: mqtt.server.com
cameras:
  back:
    ffmpeg:
      inputs:
        - path: rtsp://viewer:{FRIGATE_RTSP_PASSWORD}@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
          roles:
            - detect
            - rtmp
    detect:
      width: 1280
      height: 720
      fps: 5
```

## Required

## `mqtt`

```yaml
mqtt:
  # Required: host name
  host: mqtt.server.com
  # Optional: port (default: shown below)
  port: 1883
  # Optional: topic prefix (default: shown below)
  # WARNING: must be unique if you are running multiple instances
  topic_prefix: frigate
  # Optional: client id (default: shown below)
  # WARNING: must be unique if you are running multiple instances
  client_id: frigate
  # Optional: user
  user: mqtt_user
  # Optional: password
  # NOTE: Environment variables that begin with 'FRIGATE_' may be referenced in {}.
  #       eg. password: '{FRIGATE_MQTT_PASSWORD}'
  password: password
  # Optional: tls_ca_certs for enabling TLS using self-signed certs (default: None)
  tls_ca_certs: /path/to/ca.crt
  # Optional: tls_client_cert and tls_client key in order to use self-signed client
  # certificates (default: None)
  # NOTE: certificate must not be password-protected
  #       do not set user and password when using a client certificate
  tls_client_cert: /path/to/client.crt
  tls_client_key: /path/to/client.key
  # Optional: tls_insecure (true/false) for enabling TLS verification of
  # the server hostname in the server certificate (default: None)
  tls_insecure: false
  # Optional: interval in seconds for publishing stats (default: shown below)
  stats_interval: 60
```

## `cameras`

Each of your cameras must be configured. The following is the minimum required to register a camera in Frigate. Check the [camera configuration page](cameras.md) for a complete list of options.

```yaml
cameras:
  # Name of your camera
  front_door:
    ffmpeg:
      inputs:
        - path: rtsp://viewer:{FRIGATE_RTSP_PASSWORD}@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
          roles:
            - detect
            - rtmp
    detect:
      width: 1280
      height: 720
      fps: 5
```

## Optional

### `database`

```yaml
database:
  # The path to store the SQLite DB (default: shown below)
  path: /media/frigate/frigate.db
```

### `model`

```yaml
# Optional: model modifications
model:
  # Required: Object detection model input width (default: shown below)
  width: 320
  # Required: Object detection model input height (default: shown below)
  height: 320
  # Optional: Label name modifications
  labelmap:
    2: vehicle # previously "car"
```

### `detectors`

Check the [detectors configuration page](detectors.md) for a complete list of options.

### `logger`

```yaml
# Optional: logger verbosity settings
logger:
  # Optional: Default log verbosity (default: shown below)
  default: info
  # Optional: Component specific logger overrides
  logs:
    frigate.event: debug
```

### `record`

Can be overridden at the camera level. 24/7 recordings can be enabled and are stored at `/media/frigate/recordings`. The folder structure for the recordings is `YYYY-MM/DD/HH/<camera_name>/MM.SS.mp4`. These recordings are written directly from your camera stream without re-encoding and are available in Home Assistant's media browser. Each camera supports a configurable retention policy in the config.

Exported clips are also created off of these recordings. Frigate chooses the largest matching retention value between the recording retention and the event retention when determining if a recording should be removed.

These recordings will not be playable in the web UI or in Home Assistant's media browser unless your camera sends video as h264.

:::caution
Previous versions of frigate included `-vsync drop` in input parameters. This is not compatible with FFmpeg's segment feature and must be removed from your input parameters if you have overrides set.
:::

```yaml
record:
  # Optional: Enable recording (default: shown below)
  enabled: False
  # Optional: Number of days to retain (default: shown below)
  retain_days: 0
  # Optional: Event recording settings
  events:
    # Optional: Enable event recording retention settings (default: shown below)
    enabled: False
    # Optional: Maximum length of time to retain video during long events. (default: shown below)
    # NOTE: If an object is being tracked for longer than this amount of time, the cache
    #       will begin to expire and the resulting clip will be the last x seconds of the event unless retain_days under record is > 0.
    max_seconds: 300
    # Optional: Number of seconds before the event to include (default: shown below)
    pre_capture: 5
    # Optional: Number of seconds after the event to include (default: shown below)
    post_capture: 5
    # Optional: Objects to save recordings for. (default: all tracked objects)
    objects:
      - person
    # Optional: Restrict recordings to objects that entered any of the listed zones (default: no required zones)
    required_zones: []
    # Optional: Retention settings for events
    retain:
      # Required: Default retention days (default: shown below)
      default: 10
      # Optional: Per object retention days
      objects:
        person: 15
```

### `ffmpeg`

Can be overridden at the camera level.

```yaml
ffmpeg:
  # Optional: global ffmpeg args (default: shown below)
  global_args: -hide_banner -loglevel warning
  # Optional: global hwaccel args (default: shown below)
  # NOTE: See hardware acceleration docs for your specific device
  hwaccel_args: []
  # Optional: global input args (default: shown below)
  input_args: -avoid_negative_ts make_zero -fflags +genpts+discardcorrupt -rtsp_transport tcp -stimeout 5000000 -use_wallclock_as_timestamps 1
  # Optional: global output args
  output_args:
    # Optional: output args for detect streams (default: shown below)
    detect: -f rawvideo -pix_fmt yuv420p
    # Optional: output args for record streams (default: shown below)
    record: -f segment -segment_time 60 -segment_format mp4 -reset_timestamps 1 -strftime 1 -c copy -an
    # Optional: output args for rtmp streams (default: shown below)
    rtmp: -c copy -f flv
```

### `objects`

Can be overridden at the camera level. For a list of available objects, see the [objects documentation](./objects.mdx).

```yaml
objects:
  # Optional: list of objects to track from labelmap.txt (default: shown below)
  track:
    - person
  # Optional: filters to reduce false positives for specific object types
  filters:
    person:
      # Optional: minimum width*height of the bounding box for the detected object (default: 0)
      min_area: 5000
      # Optional: maximum width*height of the bounding box for the detected object (default: 24000000)
      max_area: 100000
      # Optional: minimum score for the object to initiate tracking (default: shown below)
      min_score: 0.5
      # Optional: minimum decimal percentage for tracked object's computed score to be considered a true positive (default: shown below)
      threshold: 0.7
```

### `birdseye`

A dynamic combined camera view of all tracked cameras. This is optimized for minimal bandwidth and server resource utilization. Encoding is only performed when actively viewing the video feed, and only active (defined by the mode) cameras are included in the view.

```yaml
birdseye:
  # Optional: Enable birdseye view (default: shown below)
  enabled: True
  # Optional: Width of the output resolution (default: shown below)
  width: 1280
  # Optional: Height of the output resolution (default: shown below)
  height: 720
  # Optional: Encoding quality of the mpeg1 feed (default: shown below)
  # 1 is the highest quality, and 31 is the lowest. Lower quality feeds utilize less CPU resources.
  quality: 8
  # Optional: Mode of the view. Available options are: objects, motion, and continuous
  #   objects - cameras are included if they have had a tracked object within the last 30 seconds
  #   motion - cameras are included if motion was detected in the last 30 seconds
  #   continuous - all cameras are included always
  mode: objects
```
