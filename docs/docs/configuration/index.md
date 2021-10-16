---
id: index
title: Configuration File
---

For Home Assistant Addon installations, the config file needs to be in the root of your Home Assistant config directory (same location as `configuration.yaml`) and named `frigate.yml`.

For all other installation types, the config file should be mapped to `/config/config.yml` inside the container.

It is recommended to start with a minimal configuration and add to it as described in [this guide](/guides/getting_started):

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
```

### Full configuration reference:

:::caution

It is not recommended to copy this full configuration file. Only specify values that are different from the defaults. Configuration options and default values may change in future versions.

:::

```yaml
mqtt:
  # Required: host name
  host: mqtt.server.com
  # Optional: port (default: shown below)
  port: 1883
  # Optional: topic prefix (default: shown below)
  # NOTE: must be unique if you are running multiple instances
  topic_prefix: frigate
  # Optional: client id (default: shown below)
  # NOTE: must be unique if you are running multiple instances
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

# Optional: Detectors configuration. Defaults to a single CPU detector
detectors:
  # Required: name of the detector
  coral:
    # Required: type of the detector
    # Valid values are 'edgetpu' (requires device property below) and 'cpu'.
    type: edgetpu
    # Optional: device name as defined here: https://coral.ai/docs/edgetpu/multiple-edgetpu/#using-the-tensorflow-lite-python-api
    device: usb
    # Optional: num_threads value passed to the tflite.Interpreter (default: shown below)
    # This value is only used for CPU types
    num_threads: 3

# Optional: Database configuration
database:
  # The path to store the SQLite DB (default: shown below)
  path: /media/frigate/frigate.db

# Optional: model modifications
model:
  # Optional: path to the model (default: automatic based on detector)
  path: /edgetpu_model.tflite
  # Optional: path to the labelmap (default: shown below)
  labelmap_path: /labelmap.txt
  # Required: Object detection model input width (default: shown below)
  width: 320
  # Required: Object detection model input height (default: shown below)
  height: 320
  # Optional: Label name modifications. These are merged into the standard labelmap.
  labelmap:
    2: vehicle

# Optional: logger verbosity settings
logger:
  # Optional: Default log verbosity (default: shown below)
  default: info
  # Optional: Component specific logger overrides
  logs:
    frigate.event: debug

# Optional: set environment variables
environment_vars:
  EXAMPLE_VAR: value

# Optional: birdseye configuration
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

# Optional: ffmpeg configuration
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
    record: -f segment -segment_time 10 -segment_format ts -reset_timestamps 1 -strftime 1 -c copy
    # Optional: output args for rtmp streams (default: shown below)
    rtmp: -c copy -f flv

# Optional: Detect configuration
# NOTE: Can be overridden at the camera level
detect:
  # Optional: width of the frame for the input with the detect role (default: shown below)
  width: 1280
  # Optional: height of the frame for the input with the detect role (default: shown below)
  height: 720
  # Optional: desired fps for your camera for the input with the detect role (default: shown below)
  # NOTE: Recommended value of 5. Ideally, try and reduce your FPS on the camera.
  fps: 5
  # Optional: enables detection for the camera (default: True)
  # This value can be set via MQTT and will be updated in startup based on retained value
  enabled: True
  # Optional: Number of frames without a detection before frigate considers an object to be gone. (default: 5x the frame rate)
  max_disappeared: 25

# Optional: Object configuration
# NOTE: Can be overridden at the camera level
objects:
  # Optional: list of objects to track from labelmap.txt (default: shown below)
  track:
    - person
  # Optional: mask to prevent all object types from being detected in certain areas (default: no mask)
  # Checks based on the bottom center of the bounding box of the object.
  # NOTE: This mask is COMBINED with the object type specific mask below
  mask: 0,0,1000,0,1000,200,0,200
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
      # Optional: mask to prevent this object type from being detected in certain areas (default: no mask)
      # Checks based on the bottom center of the bounding box of the object
      mask: 0,0,1000,0,1000,200,0,200

# Optional: Motion configuration
# NOTE: Can be overridden at the camera level
motion:
  # Optional: The threshold passed to cv2.threshold to determine if a pixel is different enough to be counted as motion. (default: shown below)
  # Increasing this value will make motion detection less sensitive and decreasing it will make motion detection more sensitive.
  # The value should be between 1 and 255.
  threshold: 25
  # Optional: Minimum size in pixels in the resized motion image that counts as motion (default: ~0.17% of the motion frame area)
  # Increasing this value will prevent smaller areas of motion from being detected. Decreasing will make motion detection more sensitive to smaller
  # moving objects.
  contour_area: 100
  # Optional: Alpha value passed to cv2.accumulateWeighted when averaging the motion delta across multiple frames (default: shown below)
  # Higher values mean the current frame impacts the delta a lot, and a single raindrop may register as motion.
  # Too low and a fast moving person wont be detected as motion.
  delta_alpha: 0.2
  # Optional: Alpha value passed to cv2.accumulateWeighted when averaging frames to determine the background (default: shown below)
  # Higher values mean the current frame impacts the average a lot, and a new object will be averaged into the background faster.
  # Low values will cause things like moving shadows to be detected as motion for longer.
  # https://www.geeksforgeeks.org/background-subtraction-in-an-image-using-concept-of-running-average/
  frame_alpha: 0.2
  # Optional: Height of the resized motion frame  (default: 1/6th of the original frame height, but no less than 180)
  # This operates as an efficient blur alternative. Higher values will result in more granular motion detection at the expense of higher CPU usage.
  # Lower values result in less CPU, but small changes may not register as motion.
  frame_height: 180
  # Optional: motion mask
  # NOTE: see docs for more detailed info on creating masks
  mask: 0,900,1080,900,1080,1920,0,1920

# Optional: Record configuration
# NOTE: Can be overridden at the camera level
record:
  # Optional: Enable recording (default: shown below)
  enabled: False
  # Optional: Number of days to retain recordings regardless of events (default: shown below)
  # NOTE: This should be set to 0 and retention should be defined in events section below
  #       if you only want to retain recordings of events.
  retain_days: 0
  # Optional: Event recording settings
  events:
    # Optional: Maximum length of time to retain video during long events. (default: shown below)
    # NOTE: If an object is being tracked for longer than this amount of time, the retained recordings
    #       will be the last x seconds of the event unless retain_days under record is > 0.
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
    # Optional: Retention settings for recordings of events
    retain:
      # Required: Default retention days (default: shown below)
      default: 10
      # Optional: Per object retention days
      objects:
        person: 15

# Optional: Configuration for the jpg snapshots written to the clips directory for each event
# NOTE: Can be overridden at the camera level
snapshots:
  # Optional: Enable writing jpg snapshot to /media/frigate/clips (default: shown below)
  # This value can be set via MQTT and will be updated in startup based on retained value
  enabled: False
  # Optional: print a timestamp on the snapshots (default: shown below)
  timestamp: False
  # Optional: draw bounding box on the snapshots (default: shown below)
  bounding_box: False
  # Optional: crop the snapshot (default: shown below)
  crop: False
  # Optional: height to resize the snapshot to (default: original size)
  height: 175
  # Optional: Restrict snapshots to objects that entered any of the listed zones (default: no required zones)
  required_zones: []
  # Optional: Camera override for retention settings (default: global values)
  retain:
    # Required: Default retention days (default: shown below)
    default: 10
    # Optional: Per object retention days
    objects:
      person: 15

# Optional: RTMP configuration
# NOTE: Can be overridden at the camera level
rtmp:
  # Optional: Enable the RTMP stream (default: True)
  enabled: True

# Optional: Live stream configuration for WebUI
# NOTE: Can be overridden at the camera level
live:
  # Optional: Set the height of the live stream. (default: 720)
  # This must be less than or equal to the height of the detect stream. Lower resolutions
  # reduce bandwidth required for viewing the live stream. Width is computed to match known aspect ratio.
  height: 720
  # Optional: Set the encode quality of the live stream (default: shown below)
  # 1 is the highest quality, and 31 is the lowest. Lower quality feeds utilize less CPU resources.
  quality: 8

# Optional: in-feed timestamp style configuration
# NOTE: Can be overridden at the camera level
timestamp_style:
  # Optional: Position of the timestamp (default: shown below)
  #           "tl" (top left), "tr" (top right), "bl" (bottom left), "br" (bottom right)
  position: "tl"
  # Optional: Format specifier conform to the Python package "datetime" (default: shown below)
  #           Additional Examples:
  #             german: "%d.%m.%Y %H:%M:%S"
  format: "%m/%d/%Y %H:%M:%S"
  # Optional: Color of font
  color:
    # All Required when color is specified (default: shown below)
    red: 255
    green: 255
    blue: 255
  # Optional: Line thickness of font (default: shown below)
  thickness: 2
  # Optional: Effect of lettering (default: shown below)
  #           None (No effect),
  #           "solid" (solid background in inverse color of font)
  #           "shadow" (shadow for font)
  effect: None

# Required
cameras:
  # Required: name of the camera
  back:
    # Required: ffmpeg settings for the camera
    ffmpeg:
      # Required: A list of input streams for the camera. See documentation for more information.
      inputs:
        # Required: the path to the stream
        # NOTE: Environment variables that begin with 'FRIGATE_' may be referenced in {}
        - path: rtsp://viewer:{FRIGATE_RTSP_PASSWORD}@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
          # Required: list of roles for this stream. valid values are: detect,record,rtmp
          # NOTICE: In addition to assigning the record, and rtmp roles,
          # they must also be enabled in the camera config.
          roles:
            - detect
            - rtmp
          # Optional: stream specific global args (default: inherit)
          # global_args:
          # Optional: stream specific hwaccel args (default: inherit)
          # hwaccel_args:
          # Optional: stream specific input args (default: inherit)
          # input_args:
      # Optional: camera specific global args (default: inherit)
      # global_args:
      # Optional: camera specific hwaccel args (default: inherit)
      # hwaccel_args:
      # Optional: camera specific input args (default: inherit)
      # input_args:
      # Optional: camera specific output args (default: inherit)
      # output_args:

    # Optional: timeout for highest scoring image before allowing it
    # to be replaced by a newer image. (default: shown below)
    best_image_timeout: 60

    # Optional: zones for this camera
    zones:
      # Required: name of the zone
      # NOTE: This must be different than any camera names, but can match with another zone on another
      #       camera.
      front_steps:
        # Required: List of x,y coordinates to define the polygon of the zone.
        # NOTE: Coordinates can be generated at https://www.image-map.net/
        coordinates: 545,1077,747,939,788,805
        # Optional: List of objects that can trigger this zone (default: all tracked objects)
        objects:
          - person
        # Optional: Zone level object filters.
        # NOTE: The global and camera filters are applied upstream.
        filters:
          person:
            min_area: 5000
            max_area: 100000
            threshold: 0.7

    # Optional: Configuration for the jpg snapshots published via MQTT
    mqtt:
      # Optional: Enable publishing snapshot via mqtt for camera (default: shown below)
      # NOTE: Only applies to publishing image data to MQTT via 'frigate/<camera_name>/<object_name>/snapshot'.
      # All other messages will still be published.
      enabled: True
      # Optional: print a timestamp on the snapshots (default: shown below)
      timestamp: True
      # Optional: draw bounding box on the snapshots (default: shown below)
      bounding_box: True
      # Optional: crop the snapshot (default: shown below)
      crop: True
      # Optional: height to resize the snapshot to (default: shown below)
      height: 270
      # Optional: jpeg encode quality (default: shown below)
      quality: 70
      # Optional: Restrict mqtt messages to objects that entered any of the listed zones (default: no required zones)
      required_zones: []
```
