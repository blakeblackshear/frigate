---
id: reference
title: Full Reference Config
---

### Full configuration reference:

:::warning

It is not recommended to copy this full configuration file. Only specify values that are different from the defaults. Configuration options and default values may change in future versions.

:::

```yaml
mqtt:
  # Optional: Enable mqtt server (default: shown below)
  enabled: True
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
  # NOTE: MQTT user can be specified with an environment variable or docker secrets that must begin with 'FRIGATE_'.
  #       e.g. user: '{FRIGATE_MQTT_USER}'
  user: mqtt_user
  # Optional: password
  # NOTE: MQTT password can be specified with an environment variable or docker secrets that must begin with 'FRIGATE_'.
  #       e.g. password: '{FRIGATE_MQTT_PASSWORD}'
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
  detector_name:
    # Required: type of the detector
    # Frigate provided types include 'cpu', 'edgetpu', 'openvino' and 'tensorrt' (default: shown below)
    # Additional detector types can also be plugged in.
    # Detectors may require additional configuration.
    # Refer to the Detectors configuration page for more information.
    type: cpu

# Optional: Database configuration
database:
  # The path to store the SQLite DB (default: shown below)
  path: /config/frigate.db

# Optional: TLS configuration
tls:
  # Optional: Enable TLS for port 8971 (default: shown below)
  enabled: True

# Optional: Proxy configuration
proxy:
  # Optional: Mapping for headers from upstream proxies. Only used if Frigate's auth
  # is disabled.
  # NOTE: Many authentication proxies pass a header downstream with the authenticated
  #       user name. Not all values are supported. It must be a whitelisted header.
  #       See the docs for more info.
  header_map:
    user: x-forwarded-user
  # Optional: Url for logging out a user. This sets the location of the logout url in
  # the UI.
  logout_url: /api/logout
  # Optional: Auth secret that is checked against the X-Proxy-Secret header sent from
  # the proxy. If not set, all requests are trusted regardless of origin.
  auth_secret: None

# Optional: Authentication configuration
auth:
  # Optional: Enable authentication
  enabled: True
  # Optional: Reset the admin user password on startup (default: shown below)
  # New password is printed in the logs
  reset_admin_password: False
  # Optional: Cookie to store the JWT token for native auth (default: shown below)
  cookie_name: frigate_token
  # Optional: Set secure flag on cookie. (default: shown below)
  # NOTE: This should be set to True if you are using TLS
  cookie_secure: False
  # Optional: Session length in seconds (default: shown below)
  session_length: 86400 # 24 hours
  # Optional: Refresh time in seconds (default: shown below)
  # When the session is going to expire in less time than this setting,
  # it will be refreshed back to the session_length.
  refresh_time: 43200 # 12 hours
  # Optional: Rate limiting for login failures to help prevent brute force
  # login attacks (default: shown below)
  # See the docs for more information on valid values
  failed_login_rate_limit: None
  # Optional: Trusted proxies for determining IP address to rate limit
  # NOTE: This is only used for rate limiting login attempts and does not bypass
  # authentication. See the authentication docs for more details.
  trusted_proxies: []
  # Optional: Number of hashing iterations for user passwords
  # As of Feb 2023, OWASP recommends 600000 iterations for PBKDF2-SHA256
  # NOTE: changing this value will not automatically update password hashes, you
  #       will need to change each user password for it to apply
  hash_iterations: 600000

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
  # Optional: Object detection model input colorspace
  # Valid values are rgb, bgr, or yuv. (default: shown below)
  input_pixel_format: rgb
  # Optional: Object detection model input tensor format
  # Valid values are nhwc or nchw (default: shown below)
  input_tensor: nhwc
  # Optional: Object detection model type, currently only used with the OpenVINO detector
  # Valid values are ssd, yolox, yolonas (default: shown below)
  model_type: ssd
  # Optional: Label name modifications. These are merged into the standard labelmap.
  labelmap:
    2: vehicle
  # Optional: Map of object labels to their attribute labels (default: depends on model)
  attributes_map:
    person:
      - amazon
      - face
    car:
      - amazon
      - fedex
      - license_plate
      - ups

# Optional: Audio Events Configuration
# NOTE: Can be overridden at the camera level
audio:
  # Optional: Enable audio events (default: shown below)
  enabled: False
  # Optional: Configure the amount of seconds without detected audio to end the event (default: shown below)
  max_not_heard: 30
  # Optional: Configure the min rms volume required to run audio detection (default: shown below)
  # As a rule of thumb:
  #  - 200 - high sensitivity
  #  - 500 - medium sensitivity
  #  - 1000 - low sensitivity
  min_volume: 500
  # Optional: Types of audio to listen for (default: shown below)
  listen:
    - bark
    - fire_alarm
    - scream
    - speech
    - yell
  # Optional: Filters to configure detection.
  filters:
    # Label that matches label in listen config.
    speech:
      # Minimum score that triggers an audio event (default: shown below)
      threshold: 0.8

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
# NOTE: Can (enabled, mode) be overridden at the camera level
birdseye:
  # Optional: Enable birdseye view (default: shown below)
  enabled: True
  # Optional: Restream birdseye via RTSP (default: shown below)
  # NOTE: Enabling this will set birdseye to run 24/7 which may increase CPU usage somewhat.
  restream: False
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
  # Optional: Threshold for camera activity to stop showing camera (default: shown below)
  inactivity_threshold: 30
  # Optional: Configure the birdseye layout
  layout:
    # Optional: Scaling factor for the layout calculator, range 1.0-5.0 (default: shown below)
    scaling_factor: 2.0
    # Optional: Maximum number of cameras to show at one time, showing the most recent (default: show all cameras)
    max_cameras: 1

# Optional: ffmpeg configuration
# More information about presets at https://docs.frigate.video/configuration/ffmpeg_presets
ffmpeg:
  # Optional: ffmpeg binry path (default: shown below)
  # can also be set to `7.0` or `5.0` to specify one of the included versions
  # or can be set to any path that holds `bin/ffmpeg` & `bin/ffprobe`
  path: "default"
  # Optional: global ffmpeg args (default: shown below)
  global_args: -hide_banner -loglevel warning -threads 2
  # Optional: global hwaccel args (default: auto detect)
  # NOTE: See hardware acceleration docs for your specific device
  hwaccel_args: "auto"
  # Optional: global input args (default: shown below)
  input_args: preset-rtsp-generic
  # Optional: global output args
  output_args:
    # Optional: output args for detect streams (default: shown below)
    detect: -threads 2 -f rawvideo -pix_fmt yuv420p
    # Optional: output args for record streams (default: shown below)
    record: preset-record-generic
  # Optional: Time in seconds to wait before ffmpeg retries connecting to the camera. (default: shown below)
  # If set too low, frigate will retry a connection to the camera's stream too frequently, using up the limited streams some cameras can allow at once
  # If set too high, then if a ffmpeg crash or camera stream timeout occurs, you could potentially lose up to a maximum of retry_interval second(s) of footage
  # NOTE: this can be a useful setting for Wireless / Battery cameras to reduce how much footage is potentially lost during a connection timeout.
  retry_interval: 10

# Optional: Detect configuration
# NOTE: Can be overridden at the camera level
detect:
  # Optional: width of the frame for the input with the detect role (default: use native stream resolution)
  width: 1280
  # Optional: height of the frame for the input with the detect role (default: use native stream resolution)
  height: 720
  # Optional: desired fps for your camera for the input with the detect role (default: shown below)
  # NOTE: Recommended value of 5. Ideally, try and reduce your FPS on the camera.
  fps: 5
  # Optional: enables detection for the camera (default: True)
  enabled: True
  # Optional: Number of consecutive detection hits required for an object to be initialized in the tracker. (default: 1/2 the frame rate)
  min_initialized: 2
  # Optional: Number of frames without a detection before Frigate considers an object to be gone. (default: 5x the frame rate)
  max_disappeared: 25
  # Optional: Configuration for stationary object tracking
  stationary:
    # Optional: Frequency for confirming stationary objects (default: same as threshold)
    # When set to 1, object detection will run to confirm the object still exists on every frame.
    # If set to 10, object detection will run to confirm the object still exists on every 10th frame.
    interval: 50
    # Optional: Number of frames without a position change for an object to be considered stationary (default: 10x the frame rate or 10s)
    threshold: 50
    # Optional: Define a maximum number of frames for tracking a stationary object (default: not set, track forever)
    # This can help with false positives for objects that should only be stationary for a limited amount of time.
    # It can also be used to disable stationary object tracking. For example, you may want to set a value for person, but leave
    # car at the default.
    # WARNING: Setting these values overrides default behavior and disables stationary object tracking.
    #          There are very few situations where you would want it disabled. It is NOT recommended to
    #          copy these values from the example config into your config unless you know they are needed.
    max_frames:
      # Optional: Default for all object types (default: not set, track forever)
      default: 3000
      # Optional: Object specific values
      objects:
        person: 1000
  # Optional: Milliseconds to offset detect annotations by (default: shown below).
  # There can often be latency between a recording and the detect process,
  # especially when using separate streams for detect and record.
  # Use this setting to make the timeline bounding boxes more closely align
  # with the recording. The value can be positive or negative.
  # TIP: Imagine there is an tracked object clip with a person walking from left to right.
  #      If the tracked object lifecycle bounding box is consistently to the left of the person
  #      then the value should be decreased. Similarly, if a person is walking from
  #      left to right and the bounding box is consistently ahead of the person
  #      then the value should be increased.
  # TIP: This offset is dynamic so you can change the value and it will update existing
  #      tracked objects, this makes it easy to tune.
  # WARNING: Fast moving objects will likely not have the bounding box align.
  annotation_offset: 0

# Optional: Object configuration
# NOTE: Can be overridden at the camera level
objects:
  # Optional: list of objects to track from labelmap.txt (default: shown below)
  track:
    - person
  # Optional: mask to prevent all object types from being detected in certain areas (default: no mask)
  # Checks based on the bottom center of the bounding box of the object.
  # NOTE: This mask is COMBINED with the object type specific mask below
  mask: 0.000,0.000,0.781,0.000,0.781,0.278,0.000,0.278
  # Optional: filters to reduce false positives for specific object types
  filters:
    person:
      # Optional: minimum width*height of the bounding box for the detected object (default: 0)
      min_area: 5000
      # Optional: maximum width*height of the bounding box for the detected object (default: 24000000)
      max_area: 100000
      # Optional: minimum width/height of the bounding box for the detected object (default: 0)
      min_ratio: 0.5
      # Optional: maximum width/height of the bounding box for the detected object (default: 24000000)
      max_ratio: 2.0
      # Optional: minimum score for the object to initiate tracking (default: shown below)
      min_score: 0.5
      # Optional: minimum decimal percentage for tracked object's computed score to be considered a true positive (default: shown below)
      threshold: 0.7
      # Optional: mask to prevent this object type from being detected in certain areas (default: no mask)
      # Checks based on the bottom center of the bounding box of the object
      mask: 0.000,0.000,0.781,0.000,0.781,0.278,0.000,0.278

# Optional: Review configuration
# NOTE: Can be overridden at the camera level
review:
  # Optional: alerts configuration
  alerts:
    # Optional: labels that qualify as an alert (default: shown below)
    labels:
      - car
      - person
    # Optional: required zones for an object to be marked as an alert (default: none)
    # NOTE: when settings required zones globally, this zone must exist on all cameras
    #       or the config will be considered invalid. In that case the required_zones
    #       should be configured at the camera level.
    required_zones:
      - driveway
  # Optional: detections configuration
  detections:
    # Optional: labels that qualify as a detection (default: all labels that are tracked / listened to)
    labels:
      - car
      - person
    # Optional: required zones for an object to be marked as a detection (default: none)
    # NOTE: when settings required zones globally, this zone must exist on all cameras
    #       or the config will be considered invalid. In that case the required_zones
    #       should be configured at the camera level.
    required_zones:
      - driveway

# Optional: Motion configuration
# NOTE: Can be overridden at the camera level
motion:
  # Optional: enables detection for the camera (default: True)
  # NOTE: Motion detection is required for object detection,
  #       setting this to False and leaving detect enabled
  #       will result in an error on startup.
  enabled: False
  # Optional: The threshold passed to cv2.threshold to determine if a pixel is different enough to be counted as motion. (default: shown below)
  # Increasing this value will make motion detection less sensitive and decreasing it will make motion detection more sensitive.
  # The value should be between 1 and 255.
  threshold: 30
  # Optional: The percentage of the image used to detect lightning or other substantial changes where motion detection
  #           needs to recalibrate. (default: shown below)
  # Increasing this value will make motion detection more likely to consider lightning or ir mode changes as valid motion.
  # Decreasing this value will make motion detection more likely to ignore large amounts of motion such as a person approaching
  # a doorbell camera.
  lightning_threshold: 0.8
  # Optional: Minimum size in pixels in the resized motion image that counts as motion (default: shown below)
  # Increasing this value will prevent smaller areas of motion from being detected. Decreasing will
  # make motion detection more sensitive to smaller moving objects.
  # As a rule of thumb:
  #  - 10 - high sensitivity
  #  - 30 - medium sensitivity
  #  - 50 - low sensitivity
  contour_area: 10
  # Optional: Alpha value passed to cv2.accumulateWeighted when averaging frames to determine the background (default: shown below)
  # Higher values mean the current frame impacts the average a lot, and a new object will be averaged into the background faster.
  # Low values will cause things like moving shadows to be detected as motion for longer.
  # https://www.geeksforgeeks.org/background-subtraction-in-an-image-using-concept-of-running-average/
  frame_alpha: 0.01
  # Optional: Height of the resized motion frame  (default: 100)
  # Higher values will result in more granular motion detection at the expense of higher CPU usage.
  # Lower values result in less CPU, but small changes may not register as motion.
  frame_height: 100
  # Optional: motion mask
  # NOTE: see docs for more detailed info on creating masks
  mask: 0.000,0.469,1.000,0.469,1.000,1.000,0.000,1.000
  # Optional: improve contrast (default: shown below)
  # Enables dynamic contrast improvement. This should help improve night detections at the cost of making motion detection more sensitive
  # for daytime.
  improve_contrast: True
  # Optional: Delay when updating camera motion through MQTT from ON -> OFF (default: shown below).
  mqtt_off_delay: 30

# Optional: Notification Configuration
notifications:
  # Optional: Enable notification service (default: shown below)
  enabled: False
  # Optional: Email for push service to reach out to
  # NOTE: This is required to use notifications
  email: "admin@example.com"

# Optional: Record configuration
# NOTE: Can be overridden at the camera level
record:
  # Optional: Enable recording (default: shown below)
  # WARNING: If recording is disabled in the config, turning it on via
  #          the UI or MQTT later will have no effect.
  enabled: False
  # Optional: Number of minutes to wait between cleanup runs (default: shown below)
  # This can be used to reduce the frequency of deleting recording segments from disk if you want to minimize i/o
  expire_interval: 60
  # Optional: Sync recordings with disk on startup and once a day (default: shown below).
  sync_recordings: False
  # Optional: Retention settings for recording
  retain:
    # Optional: Number of days to retain recordings regardless of tracked objects (default: shown below)
    # NOTE: This should be set to 0 and retention should be defined in alerts and detections section below
    #       if you only want to retain recordings of alerts and detections.
    days: 0
    # Optional: Mode for retention. Available options are: all, motion, and active_objects
    #   all - save all recording segments regardless of activity
    #   motion - save all recordings segments with any detected motion
    #   active_objects - save all recording segments with active/moving objects
    # NOTE: this mode only applies when the days setting above is greater than 0
    mode: all
  # Optional: Recording Export Settings
  export:
    # Optional: Timelapse Output Args (default: shown below).
    # NOTE: The default args are set to fit 24 hours of recording into 1 hour playback.
    # See https://stackoverflow.com/a/58268695 for more info on how these args work.
    # As an example: if you wanted to go from 24 hours to 30 minutes that would be going
    # from 86400 seconds to 1800 seconds which would be 1800 / 86400 = 0.02.
    # The -r (framerate) dictates how smooth the output video is.
    # So the args would be -vf setpts=0.02*PTS -r 30 in that case.
    timelapse_args: "-vf setpts=0.04*PTS -r 30"
  # Optional: Recording Preview Settings
  preview:
    # Optional: Quality of recording preview (default: shown below).
    # Options are: very_low, low, medium, high, very_high
    quality: medium
  # Optional: alert recording settings
  alerts:
    # Optional: Number of seconds before the alert to include (default: shown below)
    pre_capture: 5
    # Optional: Number of seconds after the alert to include (default: shown below)
    post_capture: 5
    # Optional: Retention settings for recordings of alerts
    retain:
      # Required: Retention days (default: shown below)
      days: 14
      # Optional: Mode for retention. (default: shown below)
      #   all - save all recording segments for alerts regardless of activity
      #   motion - save all recordings segments for alerts with any detected motion
      #   active_objects - save all recording segments for alerts with active/moving objects
      #
      # NOTE: If the retain mode for the camera is more restrictive than the mode configured
      #       here, the segments will already be gone by the time this mode is applied.
      #       For example, if the camera retain mode is "motion", the segments without motion are
      #       never stored, so setting the mode to "all" here won't bring them back.
      mode: motion
  # Optional: detection recording settings
  detections:
    # Optional: Number of seconds before the detection to include (default: shown below)
    pre_capture: 5
    # Optional: Number of seconds after the detection to include (default: shown below)
    post_capture: 5
    # Optional: Retention settings for recordings of detections
    retain:
      # Required: Retention days (default: shown below)
      days: 14
      # Optional: Mode for retention. (default: shown below)
      #   all - save all recording segments for detections regardless of activity
      #   motion - save all recordings segments for detections with any detected motion
      #   active_objects - save all recording segments for detections with active/moving objects
      #
      # NOTE: If the retain mode for the camera is more restrictive than the mode configured
      #       here, the segments will already be gone by the time this mode is applied.
      #       For example, if the camera retain mode is "motion", the segments without motion are
      #       never stored, so setting the mode to "all" here won't bring them back.
      mode: motion

# Optional: Configuration for the jpg snapshots written to the clips directory for each tracked object
# NOTE: Can be overridden at the camera level
snapshots:
  # Optional: Enable writing jpg snapshot to /media/frigate/clips (default: shown below)
  enabled: False
  # Optional: save a clean PNG copy of the snapshot image (default: shown below)
  clean_copy: True
  # Optional: print a timestamp on the snapshots (default: shown below)
  timestamp: False
  # Optional: draw bounding box on the snapshots (default: shown below)
  bounding_box: True
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
  # Optional: quality of the encoded jpeg, 0-100 (default: shown below)
  quality: 70

# Optional: Configuration for semantic search capability
semantic_search:
  # Optional: Enable semantic search (default: shown below)
  enabled: False
  # Optional: Re-index embeddings database from historical tracked objects (default: shown below)
  reindex: False
  # Optional: Set the model size used for embeddings. (default: shown below)
  # NOTE: small model runs on CPU and large model runs on GPU
  model_size: "small"

# Optional: Configuration for AI generated tracked object descriptions
# NOTE: Semantic Search must be enabled for this to do anything.
# WARNING: Depending on the provider, this will send thumbnails over the internet
# to Google or OpenAI's LLMs to generate descriptions. It can be overridden at
# the camera level (enabled: False) to enhance privacy for indoor cameras.
genai:
  # Optional: Enable AI description generation (default: shown below)
  enabled: False
  # Required if enabled: Provider must be one of ollama, gemini, or openai
  provider: ollama
  # Required if provider is ollama. May also be used for an OpenAI API compatible backend with the openai provider.
  base_url: http://localhost::11434
  # Required if gemini or openai
  api_key: "{FRIGATE_GENAI_API_KEY}"
  # Optional: The default prompt for generating descriptions. Can use replacement
  # variables like "label", "sub_label", "camera" to make more dynamic. (default: shown below)
  prompt: "Describe the {label} in the sequence of images with as much detail as possible. Do not describe the background."
  # Optional: Object specific prompts to customize description results
  # Format: {label}: {prompt}
  object_prompts:
    person: "My special person prompt."

# Optional: Restream configuration
# Uses https://github.com/AlexxIT/go2rtc (v1.9.2)
go2rtc:

# Optional: jsmpeg stream configuration for WebUI
live:
  # Optional: Set the name of the stream that should be used for live view
  # in frigate WebUI. (default: name of camera)
  stream_name: camera_name
  # Optional: Set the height of the jsmpeg stream. (default: 720)
  # This must be less than or equal to the height of the detect stream. Lower resolutions
  # reduce bandwidth required for viewing the jsmpeg stream. Width is computed to match known aspect ratio.
  height: 720
  # Optional: Set the encode quality of the jsmpeg stream (default: shown below)
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
    # Optional: Enable/Disable the camera (default: shown below).
    # If disabled: config is used but no live stream and no capture etc.
    # Events/Recordings are still viewable.
    enabled: True
    # Required: ffmpeg settings for the camera
    ffmpeg:
      # Required: A list of input streams for the camera. See documentation for more information.
      inputs:
        # Required: the path to the stream
        # NOTE: path may include environment variables or docker secrets, which must begin with 'FRIGATE_' and be referenced in {}
        - path: rtsp://viewer:{FRIGATE_RTSP_PASSWORD}@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
          # Required: list of roles for this stream. valid values are: audio,detect,record
          # NOTICE: In addition to assigning the audio, detect, and record roles
          # they must also be enabled in the camera config.
          roles:
            - audio
            - detect
            - record
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

    # Optional: URL to visit the camera web UI directly from the system page. Might not be available on every camera.
    webui_url: ""

    # Optional: zones for this camera
    zones:
      # Required: name of the zone
      # NOTE: This must be different than any camera names, but can match with another zone on another
      #       camera.
      front_steps:
        # Required: List of x,y coordinates to define the polygon of the zone.
        # NOTE: Presence in a zone is evaluated only based on the bottom center of the objects bounding box.
        coordinates: 0.284,0.997,0.389,0.869,0.410,0.745
        # Optional: Number of consecutive frames required for object to be considered present in the zone (default: shown below).
        inertia: 3
        # Optional: Number of seconds that an object must loiter to be considered in the zone (default: shown below)
        loitering_time: 0
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

    # Optional: Configuration for how camera is handled in the GUI.
    ui:
      # Optional: Adjust sort order of cameras in the UI. Larger numbers come later (default: shown below)
      # By default the cameras are sorted alphabetically.
      order: 0
      # Optional: Whether or not to show the camera in the Frigate UI (default: shown below)
      dashboard: True

    # Optional: connect to ONVIF camera
    # to enable PTZ controls.
    onvif:
      # Required: host of the camera being connected to.
      host: 0.0.0.0
      # Optional: ONVIF port for device (default: shown below).
      port: 8000
      # Optional: username for login.
      # NOTE: Some devices require admin to access ONVIF.
      user: admin
      # Optional: password for login.
      password: admin
      # Optional: Ignores time synchronization mismatches between the camera and the server during authentication.
      # Using NTP on both ends is recommended and this should only be set to True in a "safe" environment due to the security risk it represents.
      ignore_time_mismatch: False
      # Optional: PTZ camera object autotracking. Keeps a moving object in
      # the center of the frame by automatically moving the PTZ camera.
      autotracking:
        # Optional: enable/disable object autotracking. (default: shown below)
        enabled: False
        # Optional: calibrate the camera on startup (default: shown below)
        # A calibration will move the PTZ in increments and measure the time it takes to move.
        # The results are used to help estimate the position of tracked objects after a camera move.
        # Frigate will update your config file automatically after a calibration with
        # a "movement_weights" entry for the camera. You should then set calibrate_on_startup to False.
        calibrate_on_startup: False
        # Optional: the mode to use for zooming in/out on objects during autotracking. (default: shown below)
        # Available options are: disabled, absolute, and relative
        #   disabled - don't zoom in/out on autotracked objects, use pan/tilt only
        #   absolute - use absolute zooming (supported by most PTZ capable cameras)
        #   relative - use relative zooming (not supported on all PTZs, but makes concurrent pan/tilt/zoom movements)
        zooming: disabled
        # Optional: A value to change the behavior of zooming on autotracked objects. (default: shown below)
        # A lower value will keep more of the scene in view around a tracked object.
        # A higher value will zoom in more on a tracked object, but Frigate may lose tracking more quickly.
        # The value should be between 0.1 and 0.75
        zoom_factor: 0.3
        # Optional: list of objects to track from labelmap.txt (default: shown below)
        track:
          - person
        # Required: Begin automatically tracking an object when it enters any of the listed zones.
        required_zones:
          - zone_name
        # Required: Name of ONVIF preset in camera's firmware to return to when tracking is over. (default: shown below)
        return_preset: home
        # Optional: Seconds to delay before returning to preset. (default: shown below)
        timeout: 10
        # Optional: Values generated automatically by a camera calibration. Do not modify these manually. (default: shown below)
        movement_weights: []

    # Optional: Configuration for how to sort the cameras in the Birdseye view.
    birdseye:
      # Optional: Adjust sort order of cameras in the Birdseye view. Larger numbers come later (default: shown below)
      # By default the cameras are sorted alphabetically.
      order: 0

    # Optional: Configuration for AI generated tracked object descriptions
    genai:
      # Optional: Enable AI description generation (default: shown below)
      enabled: False
      # Optional: Use the object snapshot instead of thumbnails for description generation (default: shown below)
      use_snapshot: False
      # Optional: The default prompt for generating descriptions. Can use replacement
      # variables like "label", "sub_label", "camera" to make more dynamic. (default: shown below)
      prompt: "Describe the {label} in the sequence of images with as much detail as possible. Do not describe the background."
      # Optional: Object specific prompts to customize description results
      # Format: {label}: {prompt}
      object_prompts:
        person: "My special person prompt."
      # Optional: objects to generate descriptions for (default: all objects that are tracked)
      objects:
        - person
        - cat
      # Optional: Restrict generation to objects that entered any of the listed zones (default: none, all zones qualify)
      required_zones: []

# Optional
ui:
  # Optional: Set a timezone to use in the UI (default: use browser local time)
  # timezone: America/Denver
  # Optional: Set the time format used.
  # Options are browser, 12hour, or 24hour (default: shown below)
  time_format: browser
  # Optional: Set the date style for a specified length.
  # Options are: full, long, medium, short
  # Examples:
  #    short: 2/11/23
  #    medium: Feb 11, 2023
  #    full: Saturday, February 11, 2023
  # (default: shown below).
  date_style: short
  # Optional: Set the time style for a specified length.
  # Options are: full, long, medium, short
  # Examples:
  #    short: 8:14 PM
  #    medium: 8:15:22 PM
  #    full: 8:15:22 PM Mountain Standard Time
  # (default: shown below).
  time_style: medium
  # Optional: Ability to manually override the date / time styling to use strftime format
  # https://www.gnu.org/software/libc/manual/html_node/Formatting-Calendar-Time.html
  # possible values are shown above (default: not set)
  strftime_fmt: "%Y/%m/%d %H:%M"

# Optional: Telemetry configuration
telemetry:
  # Optional: Enabled network interfaces for bandwidth stats monitoring (default: empty list, let nethogs search all)
  network_interfaces:
    - eth
    - enp
    - eno
    - ens
    - wl
    - lo
  # Optional: Configure system stats
  stats:
    # Enable AMD GPU stats (default: shown below)
    amd_gpu_stats: True
    # Enable Intel GPU stats (default: shown below)
    intel_gpu_stats: True
    # Enable network bandwidth stats monitoring for camera ffmpeg processes, go2rtc, and object detectors. (default: shown below)
    # NOTE: The container must either be privileged or have cap_net_admin, cap_net_raw capabilities enabled.
    network_bandwidth: False
  # Optional: Enable the latest version outbound check (default: shown below)
  # NOTE: If you use the HomeAssistant integration, disabling this will prevent it from reporting new versions
  version_check: True

# Optional: Camera groups (default: no groups are setup)
# NOTE: It is recommended to use the UI to setup camera groups
camera_groups:
  # Required: Name of camera group
  front:
    # Required: list of cameras in the group
    cameras:
      - front_cam
      - side_cam
      - front_doorbell_cam
    # Required: icon used for group
    icon: LuCar
    # Required: index of this group
    order: 0
```
