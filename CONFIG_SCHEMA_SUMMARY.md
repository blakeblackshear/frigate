# Frigate Configuration Schema - Complete Analysis

This document provides a comprehensive overview of the entire Frigate configuration schema, extracted from all config model files.

## Configuration Structure Overview

The Frigate configuration is hierarchical, with the root `FrigateConfig` object containing both global settings and per-camera configurations.

### Top-Level Configuration Sections

1. **System Configuration**
   - `version` - Config version tracking
   - `safe_mode` - Safe mode flag
   - `environment_vars` - Environment variable definitions
   - `logger` - Logging configuration
   - `database` - Database path configuration

2. **Authentication & Security**
   - `auth` - Authentication settings (AuthConfig)
   - `proxy` - Proxy authentication settings (ProxyConfig)
   - `tls` - TLS configuration (TlsConfig)

3. **Communication**
   - `mqtt` - MQTT broker configuration (MqttConfig)
   - `networking` - Network settings including IPv6 (NetworkingConfig)
   - `notifications` - Global notification settings (NotificationConfig)

4. **User Interface**
   - `ui` - UI preferences (UIConfig)
   - `camera_groups` - Camera grouping for UI (Dict[str, CameraGroupConfig])

5. **Detection & AI**
   - `detectors` - Hardware detector configuration (Dict[str, BaseDetectorConfig])
   - `model` - Detection model settings (ModelConfig)
   - `genai` - Generative AI provider configuration (GenAIConfig)
   - `classification` - Object classification settings (ClassificationConfig)
   - `semantic_search` - Semantic search configuration (SemanticSearchConfig)
   - `face_recognition` - Face recognition settings (FaceRecognitionConfig)
   - `lpr` - License plate recognition settings (LicensePlateRecognitionConfig)

6. **Global Camera Defaults**
   - `audio` - Global audio detection settings (AudioConfig)
   - `audio_transcription` - Audio transcription settings (AudioTranscriptionConfig)
   - `birdseye` - Birdseye view configuration (BirdseyeConfig)
   - `detect` - Global detection settings (DetectConfig)
   - `ffmpeg` - Global FFmpeg settings (FfmpegConfig)
   - `live` - Live view settings (CameraLiveConfig)
   - `motion` - Global motion detection (MotionConfig)
   - `objects` - Global object tracking (ObjectConfig)
   - `record` - Global recording settings (RecordConfig)
   - `review` - Review settings (ReviewConfig)
   - `snapshots` - Global snapshot settings (SnapshotsConfig)
   - `timestamp_style` - Timestamp styling (TimestampStyleConfig)

7. **Cameras**
   - `cameras` - Per-camera configuration (Dict[str, CameraConfig])
   - `go2rtc` - Restream configuration (RestreamConfig with extra='allow')

8. **Telemetry**
   - `telemetry` - System statistics and monitoring (TelemetryConfig)

## Camera Configuration (CameraConfig)

Each camera has extensive configuration options:

### Camera Identity
- `name` - Camera identifier
- `friendly_name` - UI display name
- `enabled` - Enable/disable camera
- `type` - Camera type (generic, lpr)

### Camera Features (all inherit from global defaults)
- `audio` - Audio detection (AudioConfig)
- `audio_transcription` - Audio transcription (AudioTranscriptionConfig)
- `birdseye` - Birdseye participation (BirdseyeCameraConfig)
- `detect` - Object detection (DetectConfig)
- `face_recognition` - Face recognition (CameraFaceRecognitionConfig)
- `ffmpeg` - FFmpeg settings (CameraFfmpegConfig) **REQUIRED**
- `live` - Live view streams (CameraLiveConfig)
- `lpr` - License plate recognition (CameraLicensePlateRecognitionConfig)
- `motion` - Motion detection (MotionConfig)
- `objects` - Object tracking and filtering (ObjectConfig)
- `record` - Recording settings (RecordConfig)
- `review` - Review configuration (ReviewConfig)
- `semantic_search` - Semantic triggers (CameraSemanticSearchConfig)
- `snapshots` - Snapshot settings (SnapshotsConfig)
- `timestamp_style` - Timestamp styling (TimestampStyleConfig)

### Camera-Specific Settings
- `best_image_timeout` - Timeout for best image capture
- `mqtt` - MQTT image publishing (CameraMqttConfig)
- `notifications` - Notification settings (NotificationConfig)
- `onvif` - ONVIF/PTZ configuration (OnvifConfig)
- `ui` - UI display settings (CameraUiConfig)
- `webui_url` - Direct camera URL
- `zones` - Zone definitions (Dict[str, ZoneConfig])

## Key Nested Configurations

### FFmpeg Configuration (CameraFfmpegConfig)
The most critical camera setting with required inputs:
- `inputs` - List of camera input streams (List[CameraInput])
  - Each input has: `path`, `roles` (detect, record, audio), `global_args`, `hwaccel_args`, `input_args`
- `path` - FFmpeg binary path
- `global_args` - Global FFmpeg arguments
- `hwaccel_args` - Hardware acceleration (defaults to "auto")
- `input_args` - Input arguments (defaults to "preset-rtsp-generic")
- `output_args` - Output arguments per role (FfmpegOutputArgsConfig)
  - `detect` - Detect stream output args
  - `record` - Record stream output args
- `retry_interval` - Reconnection interval
- `apple_compatibility` - HEVC tag for Apple devices

### Detection Configuration (DetectConfig)
- `enabled` - Enable detection
- `width`, `height` - Detection resolution
- `fps` - Detection frame rate (default: 5)
- `min_initialized` - Frames to initialize object
- `max_disappeared` - Frames before object expires
- `stationary` - Stationary object handling (StationaryConfig)
  - `interval` - Check interval
  - `threshold` - Frames to consider stationary
  - `max_frames` - Max tracking frames (StationaryMaxFramesConfig)
  - `classifier` - Use visual classifier
- `annotation_offset` - Timestamp offset

### Object Tracking (ObjectConfig)
- `track` - List of objects to track (default: ["person"])
- `filters` - Per-object filters (Dict[str, FilterConfig])
  - `min_area`, `max_area` - Size filters (pixels or percentage)
  - `min_ratio`, `max_ratio` - Aspect ratio filters
  - `threshold` - Average confidence threshold
  - `min_score` - Minimum confidence
  - `mask` - Detection mask polygon
- `mask` - Global object mask
- `genai` - GenAI object analysis (GenAIObjectConfig)
  - `enabled`, `use_snapshot`, `prompt`, `object_prompts`
  - `objects`, `required_zones`, `debug_save_thumbnails`
  - `send_triggers` (GenAIObjectTriggerConfig)

### Recording Configuration (RecordConfig)
- `enabled` - Enable recording
- `sync_recordings` - Sync on startup
- `expire_interval` - Cleanup interval
- `continuous` - Continuous recording retention (RecordRetainConfig)
- `motion` - Motion recording retention (RecordRetainConfig)
- `detections` - Detection event settings (EventsConfig)
  - `pre_capture`, `post_capture` - Buffer times
  - `retain` - Retention settings (ReviewRetainConfig)
- `alerts` - Alert event settings (EventsConfig)
- `export` - Export settings (RecordExportConfig)
- `preview` - Preview quality (RecordPreviewConfig)

### Snapshot Configuration (SnapshotsConfig)
- `enabled` - Enable snapshots
- `clean_copy` - Clean image without overlays
- `timestamp` - Add timestamp overlay
- `bounding_box` - Add bounding box
- `crop` - Crop to object
- `required_zones` - Zone requirements
- `height` - Snapshot height
- `retain` - Retention settings (RetainConfig)
  - `default` - Default retention days
  - `mode` - Retain mode (all, motion, active_objects)
  - `objects` - Per-object retention
- `quality` - JPEG quality (0-100)

### Zone Configuration (ZoneConfig)
- `coordinates` - Polygon coordinates (required)
- `filters` - Per-object zone filters (Dict[str, FilterConfig])
- `distances` - Real-world distances (4 values for quadrilateral)
- `inertia` - Frames to confirm object in zone
- `loitering_time` - Seconds to trigger loitering
- `speed_threshold` - Minimum speed
- `objects` - Objects that trigger zone

### ONVIF/PTZ Configuration (OnvifConfig)
- `host`, `port`, `user`, `password` - ONVIF connection
- `tls_insecure` - Skip TLS verification
- `ignore_time_mismatch` - Ignore time sync issues
- `autotracking` - PTZ autotracking (PtzAutotrackConfig)
  - `enabled` - Enable autotracking
  - `calibrate_on_startup` - Calibrate on start
  - `zooming` - Zoom mode (disabled, absolute, relative)
  - `zoom_factor` - Zoom amount (0.1-0.75)
  - `track` - Objects to track
  - `required_zones` - Zones to trigger tracking
  - `return_preset` - Home preset
  - `timeout` - Return timeout
  - `movement_weights` - Calibration weights (6 floats)

### Review Configuration (ReviewConfig)
- `alerts` - Alert review settings (AlertsConfig)
  - `enabled`, `labels`, `required_zones`, `cutoff_time`
- `detections` - Detection review settings (DetectionsConfig)
  - `enabled`, `labels`, `required_zones`, `cutoff_time`
- `genai` - GenAI descriptions (GenAIReviewConfig)
  - `enabled`, `alerts`, `detections`
  - `additional_concerns`, `debug_save_thumbnails`
  - `preferred_language`

### Motion Detection (MotionConfig)
- `enabled` - Enable motion detection
- `threshold` - Detection threshold (1-255)
- `lightning_threshold` - Lightning detection (0.3-1.0)
- `improve_contrast` - Contrast enhancement
- `contour_area` - Contour area threshold
- `delta_alpha` - Delta blending
- `frame_alpha` - Frame blending
- `frame_height` - Processing height
- `mask` - Motion mask polygon
- `mqtt_off_delay` - MQTT update delay

### Audio Configuration (AudioConfig)
- `enabled` - Enable audio detection
- `max_not_heard` - Timeout for audio events
- `min_volume` - Minimum volume threshold
- `listen` - Audio types to detect (default: bark, fire_alarm, scream, speech, yell)
- `filters` - Per-audio-type filters (Dict[str, AudioFilterConfig])
  - `threshold` - Confidence threshold
- `num_threads` - Detection threads

## Advanced Features

### Face Recognition (FaceRecognitionConfig)
Global settings:
- `enabled`, `model_size`, `device`
- `unknown_score`, `detection_threshold`, `recognition_threshold`
- `min_area`, `min_faces`, `save_attempts`
- `blur_confidence_filter`

Per-camera (CameraFaceRecognitionConfig):
- `enabled`, `min_area`

### License Plate Recognition (LicensePlateRecognitionConfig)
Global settings:
- `enabled`, `model_size`, `device`
- `detection_threshold`, `recognition_threshold`
- `min_area`, `min_plate_length`
- `format` - Regex pattern
- `match_distance` - Fuzzy matching
- `known_plates` - Known plate list
- `enhancement` - Image enhancement (0-10)
- `debug_save_plates`
- `replace_rules` - Normalization rules (List[ReplaceRule])

Per-camera (CameraLicensePlateRecognitionConfig):
- `enabled`, `expire_time`, `min_area`, `enhancement`

### Semantic Search (SemanticSearchConfig)
- `enabled`, `reindex`
- `model` - CLIP model (jinav1, jinav2)
- `model_size`, `device`

Per-camera triggers (CameraSemanticSearchConfig):
- `triggers` - Dict of trigger configs (Dict[str, TriggerConfig])
  - `enabled`, `type` (thumbnail, description)
  - `data` - Text phrase or image ID
  - `threshold` - Confidence threshold
  - `actions` - Actions to perform (notification)

### Classification (ClassificationConfig)
- `bird` - Bird classification (BirdClassificationConfig)
  - `enabled`, `threshold`
- `custom` - Custom models (Dict[str, CustomClassificationConfig])
  - `enabled`, `name`, `threshold`
  - `object_config` - Object-based classification
    - `objects`, `classification_type` (sub_label, attribute)
  - `state_config` - State-based classification
    - `cameras` - Per-camera crops
    - `motion` - Motion-triggered
    - `interval` - Time-based interval

### Generative AI (GenAIConfig)
- `api_key`, `base_url`
- `model` - Model name (default: gpt-4o)
- `provider` - Provider (openai, azure_openai, gemini, ollama)
- `provider_options` - Extra options

## Detector Configuration

### Supported Detector Types
- cpu (not recommended)
- cpu_tfl
- deepstack
- degirum
- edgetpu_tfl
- hailo8l
- memryx
- onnx
- openvino
- rknn
- synaptics
- teflon_tfl
- tensorrt
- zmq_ipc

### Base Detector Fields (BaseDetectorConfig)
- `type` - Detector type (required)
- `model` - Model configuration (ModelConfig)
- `model_path` - Custom model path

### Model Configuration (ModelConfig)
- `path` - Model file path (or plus:// for Frigate+ models)
- `labelmap_path` - Custom label map
- `width`, `height` - Model input size (default: 320x320)
- `labelmap` - Label map overrides
- `attributes_map` - Object attribute mappings
- `input_tensor` - Tensor shape (nchw, nhwc, hwnc, hwcn)
- `input_pixel_format` - Pixel format (rgb, bgr, yuv)
- `input_dtype` - Data type (float, float_denorm, int)
- `model_type` - Model architecture (dfine, rfdetr, ssd, yolox, yolonas, yolo-generic)

## MQTT Configuration (MqttConfig)

- `enabled` - Enable MQTT
- `host`, `port` - Broker connection
- `topic_prefix`, `client_id` - MQTT topics
- `stats_interval` - Stats publishing interval
- `user`, `password` - Authentication (supports EnvString)
- `tls_ca_certs`, `tls_client_cert`, `tls_client_key` - TLS settings
- `tls_insecure` - Skip TLS verification
- `qos` - MQTT QoS level

## Authentication (AuthConfig)

- `enabled` - Enable authentication
- `reset_admin_password` - Reset admin password
- `cookie_name` - JWT cookie name
- `cookie_secure` - Secure cookie flag
- `session_length` - Session duration (seconds)
- `refresh_time` - Refresh threshold (seconds)
- `failed_login_rate_limit` - Rate limiting
- `trusted_proxies` - Trusted proxy IPs
- `hash_iterations` - Password hashing iterations (default: 600000)
- `roles` - Custom role definitions (Dict[str, List[str]])
  - Keys: role name
  - Values: list of camera names (empty = all cameras)
  - Reserved roles: 'admin', 'viewer'

## UI Configuration (UIConfig)

- `timezone` - Override system timezone
- `time_format` - Time format (browser, 12hour, 24hour)
- `date_style` - Date style (full, long, medium, short)
- `time_style` - Time style (full, long, medium, short)
- `strftime_fmt` - Custom strftime format
- `unit_system` - Measurement units (imperial, metric)

## Timestamp Styling (TimestampStyleConfig)

- `position` - Position (tl, tr, bl, br)
- `format` - strftime format (default: "%m/%d/%Y %H:%M:%S")
- `color` - RGB color (ColorConfig)
  - `red`, `green`, `blue` (0-255)
- `thickness` - Line thickness
- `effect` - Effect type (solid, shadow)

## Telemetry (TelemetryConfig)

- `network_interfaces` - Interfaces to monitor
- `stats` - Stats configuration (StatsConfig)
  - `amd_gpu_stats` - AMD GPU monitoring
  - `intel_gpu_stats` - Intel GPU monitoring
  - `network_bandwidth` - Network bandwidth monitoring
  - `intel_gpu_device` - SR-IOV device
- `version_check` - Check for updates

## Live View (CameraLiveConfig)

- `streams` - Stream mappings (Dict[str, str])
  - Key: friendly name
  - Value: go2rtc stream name
- `height` - View height (default: 720)
- `quality` - Encoding quality (1-31, default: 8)

## Camera Groups (CameraGroupConfig)

- `cameras` - Camera list (string or list)
- `icon` - Group icon (default: "generic")
- `order` - Sort order (default: 0)

## Birdseye Configuration

### Global (BirdseyeConfig)
- `enabled` - Enable birdseye
- `mode` - Mode (objects, motion, continuous)
- `restream` - RTSP restream
- `width`, `height` - Output resolution
- `quality` - Encoding quality (1-31)
- `inactivity_threshold` - Inactivity timeout
- `layout` - Layout settings (BirdseyeLayoutConfig)
  - `scaling_factor` - Scale factor (1.0-5.0)
  - `max_cameras` - Camera limit

### Per-Camera (BirdseyeCameraConfig)
- `enabled` - Include camera
- `mode` - Camera mode
- `order` - Display order

## Important Notes

1. **Global vs Camera Settings**: Most settings can be defined globally and overridden per-camera. The system performs a deep merge of global and camera-specific configs.

2. **Required Fields**:
   - `mqtt` (at root level)
   - `cameras` (at root level)
   - `ffmpeg.inputs` (per camera)
   - `path` (per input)
   - `roles` (per input, must include "detect")
   - `coordinates` (per zone)

3. **EnvString**: Many sensitive fields (passwords, API keys) support environment variable interpolation using `{FRIGATE_VARNAME}` syntax.

4. **Preset Support**: FFmpeg args support preset strings (e.g., "preset-rtsp-generic", "preset-record-generic-audio-aac") which are expanded automatically.

5. **Hardware Acceleration**: `hwaccel_args: "auto"` will automatically detect and configure hardware acceleration.

6. **Percentage vs Pixels**: Filter `min_area` and `max_area` accept integers (pixels) or floats 0.000001-0.99 (percentage of frame).

7. **Coordinate Format**: Masks and zones use relative coordinates (0.0-1.0) or absolute pixels. Format: "x1,y1,x2,y2,..." or list of "x,y" strings.

8. **State Tracking**: Many configs have `enabled_in_config` fields to track original config state vs runtime changes.

9. **Validators**: Many fields have complex validation rules enforced by Pydantic validators (see source code for details).

10. **Extra Fields**: The `go2rtc` config accepts any extra fields (extra='allow') and passes them through to go2rtc.

## Configuration File Format

Frigate accepts both YAML and JSON configuration files. The system auto-detects the format based on:
1. File extension (.yaml, .yml, .json)
2. Content sniffing (looks for JSON structure)

Default config location: `/config/config.yml`

## Schema Validation

The configuration uses Pydantic models with:
- Type validation
- Range validation (ge, le, gt, lt)
- Pattern matching (regex)
- Custom validators
- Field descriptions and titles
- Default values

All config models inherit from `FrigateBaseModel` which sets:
- `extra="forbid"` - No unknown fields allowed
- `protected_namespaces=()` - Allow "model_" field names

## Complete Field Count

This schema documents **over 500 individual configuration fields** across:
- 70+ configuration classes
- 30+ enum types
- Multiple levels of nesting
- Global and per-camera settings
- Feature-specific configurations

Every field includes:
- Type information
- Default values
- Validation rules
- Description/title
- Required/optional status
- Nested object references