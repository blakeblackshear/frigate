<p align="center">
  <img align="center" alt="logo" src="docs/frigate.png">
</p>

# Frigate - NVR With Realtime Object Detection for IP Cameras
Uses OpenCV and Tensorflow to perform realtime object detection locally for IP cameras. Designed for integration with HomeAssistant or others via MQTT.

Use of a [Google Coral Accelerator](https://coral.ai/products/) is optional, but highly recommended. The Coral will outperform even the best CPUs and can process 100+ FPS with very little overhead.

- Designed to minimize resource use and maximize performance by only looking for objects when and where it is necessary
- Leverages multiprocessing heavily with an emphasis on realtime over processing every frame
- Uses a very low overhead motion detection to determine where to run object detection
- Object detection with TensorFlow runs in separate processes for maximum FPS
- Communicates over MQTT for easy integration into other systems

## Documentation
- [How Frigate Works](docs/how-frigate-works.md)
- [Recommended Hardware](#recommended-hardware)
- [Installing](#installing)
- [Configuration File](#configuration)
- [Optimizing Performance](#optimizing-performance)
- [Detectors](#detectors)
- [Object Filters](#object-filters)
- [Masks](#masks)
- [Zones](#zones)
- [Integration with HomeAssistant](#integration-with-homeassistant)
- [MQTT Topics](#mqtt-topics)
- [HTTP Endpoints](#http-endpoints)
- [Custom Models](#custom-models)
- [Troubleshooting](#troubleshooting)

## Recommended Hardware
|Name|Inference Speed|Notes|
|----|---------------|-----|
|Atomic Pi|16ms|Good option for a dedicated low power board with a small number of cameras. Can leverage Intel QuickSync for stream decoding.|
|Intel NUC NUC7i3BNK|8-10ms|Great performance. Can handle many cameras at 5fps depending on typical amounts of motion.|
|BMAX B2 Plus|10-12ms|Good balance of performance and cost. Also capable of running many other services at the same time as frigate.|
|Minisforum GK41|9-10ms|Great alternative to a NUC with dual Gigabit NICs. Easily handles several 1080p cameras.|
|Raspberry Pi 3B (32bit)|60ms|Can handle a small number of cameras, but the detection speeds are slow due to USB 2.0.|
|Raspberry Pi 4 (32bit)|15-20ms|Can handle a small number of cameras. The 2GB version runs fine.|
|Raspberry Pi 4 (64bit)|10-15ms|Can handle a small number of cameras. The 2GB version runs fine.|

[Back to top](#documentation)

## Installing

### HassOS Addon
HassOS users can install via the addon repository. Frigate requires that an MQTT server be running.
1. Navigate to Supervisor > Add-on Store > Repositories
1. Add https://github.com/blakeblackshear/frigate-hass-addons
1. Setup your configuration in the `Configuration` tab
1. Start the addon container

### Docker
Make sure you choose the right image for your architecture:
|Arch|Image Name|
|-|-|
|amd64|blakeblackshear/frigate:stable-amd64|
|armv7|blakeblackshear/frigate:stable-armv7|
|aarch64|blakeblackshear/frigate:stable-aarch64|

It is recommended to run with docker-compose:
```yaml
  frigate:
    container_name: frigate
    restart: unless-stopped
    privileged: true
    image: blakeblackshear/frigate:stable-amd64
    volumes:
      - /dev/bus/usb:/dev/bus/usb
      - /etc/localtime:/etc/localtime:ro
      - <path_to_config>:/config
      - <path_to_directory_for_clips>:/clips      
      - type: tmpfs # 1GB of memory, reduces SSD/SD Card wear
        target: /cache
        tmpfs:
          size: 100000000
    ports:
      - "5000:5000"
    environment:
      FRIGATE_RTSP_PASSWORD: "password"
    healthcheck:
      test: ["CMD", "wget" , "-q", "-O-", "http://localhost:5000"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 3m
```

If you can't use docker compose, you can run the container with:
```bash
docker run --rm \
--name frigate \
--privileged \
-v /dev/bus/usb:/dev/bus/usb \
-v <path_to_config_dir>:/config:ro \
-v /etc/localtime:/etc/localtime:ro \
-p 5000:5000 \
-e FRIGATE_RTSP_PASSWORD='password' \
blakeblackshear/frigate:stable-amd64
```

### Kubernetes
Use the [helm chart](https://github.com/k8s-at-home/charts/tree/master/charts/frigate).

### Virtualization
For ideal performance, Frigate needs access to underlying hardware for the Coral and GPU devices for ffmpeg decoding. Running Frigate in a VM on top of Proxmox, ESXi, Virtualbox, etc. is not recommended. The virtualization layer typically introduces a sizable amount of overhead for communication with Coral devices.

#### Proxmox
Some people have had success running Frigate in LXC directly with the following config:
```
arch: amd64
cores: 2
features: nesting=1
hostname: FrigateLXC
memory: 4096
net0: name=eth0,bridge=vmbr0,firewall=1,hwaddr=2E:76:AE:5A:58:48,ip=dhcp,ip6=auto,type=veth
ostype: debian
rootfs: local-lvm:vm-115-disk-0,size=12G
swap: 512
lxc.cgroup.devices.allow: c 189:385 rwm
lxc.mount.entry: /dev/dri/renderD128 dev/dri/renderD128 none bind,optional,create=file
lxc.mount.entry: /dev/bus/usb/004/002 dev/bus/usb/004/002 none bind,optional,create=file
lxc.apparmor.profile: unconfined
lxc.cgroup.devices.allow: a
lxc.cap.drop:
```

### Calculating shm-size
The default shm-size of 64m is fine for setups with 3 or less 1080p cameras. If frigate is exiting with "Bus error" messages, it could be because you have too many high resolution cameras and you need to specify a higher shm size.

You can calculate the necessary shm-size for each camera with the following formula:
```
(width * height * 1.5 * 7 + 270480)/1048576 = <shm size in mb>
```
[Back to top](#documentation)

## Configuration
HassOS users can manage their configuration directly in the addon Configuration tab. For other installations, the default location for the config file is `/config/config.yml`. This can be overridden with the `CONFIG_FILE` environment variable. Camera specific ffmpeg parameters are documented [here](docs/cameras.md).

```yaml
# Optional: port for http server (default: shown below)
web_port: 5000

# Optional: detectors configuration
# USB Coral devices will be auto detected with CPU fallback
detectors:
  # Required: name of the detector
  coral:
    # Required: type of the detector
    # Valid values are 'edgetpu' (requires device property below) and 'cpu'.
    type: edgetpu
    # Optional: device name as defined here: https://coral.ai/docs/edgetpu/multiple-edgetpu/#using-the-tensorflow-lite-python-api
    device: usb

# Required: mqtt configuration
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

# Optional: Global configuration for saving clips
save_clips:
  # Optional: Maximum length of time to retain video during long events. (default: shown below)
  # NOTE: If an object is being tracked for longer than this amount of time, the cache
  #       will begin to expire and the resulting clip will be the last x seconds of the event.
  max_seconds: 300
  # Optional: Location to save event clips. (default: shown below)
  clips_dir: /clips
  # Optional: Location to save cache files for creating clips. (default: shown below)
  # NOTE: To reduce wear on SSDs and SD cards, use a tmpfs volume.
  cache_dir: /cache

# Optional: Global ffmpeg args
# "ffmpeg" + global_args + input_args + "-i" + input + output_args
ffmpeg:
  # Optional: global ffmpeg args (default: shown below)
  global_args:
    - -hide_banner
    - -loglevel
    - panic
  # Optional: global hwaccel args (default: shown below)
  # NOTE: See hardware acceleration docs for your specific device
  hwaccel_args: []
  # Optional: global input args (default: shown below)
  input_args:
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
    - -rtsp_transport
    - tcp
    - -stimeout
    - '5000000'
    - -use_wallclock_as_timestamps
    - '1'
  # Optional: global output args (default: shown below)
  output_args:
    - -f
    - rawvideo
    - -pix_fmt
    - yuv420p

# Optional: Global object filters for all cameras.
# NOTE: can be overridden at the camera level
objects:
  # Optional: list of objects to track from labelmap.txt (default: shown below)
  track:
    - person
  # Optional: filters to reduce false positives for specific object types
  filters:
    person:
      # Optional: minimum width*height of the bounding box for the detected object (default: 0)
      min_area: 5000
      # Optional: maximum width*height of the bounding box for the detected object (default: max_int)
      max_area: 100000
      # Optional: minimum score for the object to initiate tracking (default: shown below)
      min_score: 0.5
      # Optional: minimum decimal percentage for tracked object's computed score to be considered a true positive (default: shown below)
      threshold: 0.85

# Required: configuration section for cameras
cameras:
  # Required: name of the camera
  back:
    # Required: ffmpeg settings for the camera
    ffmpeg:
      # Required: Source passed to ffmpeg after the -i parameter.
      # NOTE: Environment variables that begin with 'FRIGATE_' may be referenced in {}
      input: rtsp://viewer:{FRIGATE_RTSP_PASSWORD}@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
      # Optional: camera specific global args (default: inherit)
      global_args:
      # Optional: camera specific hwaccel args (default: inherit)
      hwaccel_args:
      # Optional: camera specific input args (default: inherit)
      input_args:
      # Optional: camera specific output args (default: inherit)
      output_args:
    
    # Optional: height of the frame
    # NOTE: Recommended to set this value, but frigate will attempt to autodetect.
    height: 720
    # Optional: width of the frame
    # NOTE: Recommended to set this value, but frigate will attempt to autodetect.
    width: 1280
    # Optional: desired fps for your camera
    # NOTE: Recommended value of 5. Ideally, try and reduce your FPS on the camera.
    #       Frigate will attempt to autodetect if not specified.
    fps: 5

    # Optional: motion mask
    # NOTE: see docs for more detailed info on creating masks
    mask: poly,0,900,1080,900,1080,1920,0,1920

    # Optional: timeout for highest scoring image before allowing it
    # to be replaced by a newer image. (default: shown below)
    best_image_timeout: 60

    # Optional: camera specific mqtt settings
    mqtt:
      # Optional: crop the camera frame to the detection region of the object (default: False)
      crop_to_region: True
      # Optional: resize the image before publishing over mqtt
      snapshot_height: 300

    # Optional: zones for this camera
    zones:
      # Required: name of the zone
      # NOTE: This must be different than any camera names, but can match with another zone on another
      #       camera.
      front_steps:
        # Required: List of x,y coordinates to define the polygon of the zone.
        # NOTE: Coordinates can be generated at https://www.image-map.net/
        coordinates: 545,1077,747,939,788,805
        # Optional: Zone level object filters.
        # NOTE: The global and camera filters are applied upstream.
        filters:
          person:
            min_area: 5000
            max_area: 100000
            threshold: 0.8

    # Optional: save clips configuration
    # NOTE: This feature does not work if you have added "-vsync drop" in your input params. 
    #       This will only work for camera feeds that can be copied into the mp4 container format without
    #       encoding such as h264. It may not work for some types of streams.
    save_clips:
      # Required: enables clips for the camera (default: shown below)
      enabled: False
      # Optional: Number of seconds before the event to include in the clips (default: shown below)
      pre_capture: 30
      # Optional: Objects to save clips for. (default: all tracked objects)
      objects:
        - person      

    # Optional: Configuration for the snapshots in the debug view and mqtt
    snapshots:
      # Optional: print a timestamp on the snapshots (default: shown below)
      show_timestamp: True
      # Optional: draw zones on the debug mjpeg feed (default: shown below)
      draw_zones: False
      # Optional: draw bounding boxes on the mqtt snapshots (default: shown below)
      draw_bounding_boxes: True

    # Optional: Camera level object filters config. If defined, this is used instead of the global config.
    objects:
      track:
        - person
        - car
      filters:
        person:
          min_area: 5000
          max_area: 100000
          min_score: 0.5
          threshold: 0.85
```
[Back to top](#documentation)

## Optimizing Performance
- **Google Coral**: It is strongly recommended to use a Google Coral, but Frigate will fall back to CPU in the event one is not found. Offloading TensorFlow to the Google Coral is an order of magnitude faster and will reduce your CPU load dramatically. A $60 device will outperform $2000 CPU.
- **Resolution**: Choose a camera resolution where the smallest object you want to detect barely fits inside a 300x300px square. The model used by Frigate is trained on 300x300px images, so you will get worse performance and no improvement in accuracy by using a larger resolution since Frigate resizes the area where it is looking for objects to 300x300 anyway.
- **FPS**: 5 frames per second should be adequate. Higher frame rates will require more CPU usage without improving detections or accuracy. Reducing the frame rate on your camera will have the greatest improvement on system resources.
- **Hardware Acceleration**: Make sure you configure the `hwaccel_args` for your hardware. They provide a significant reduction in CPU usage if they are available.
- **Masks**: Masks can be used to ignore motion and reduce your idle CPU load. If you have areas with regular motion such as timestamps or trees blowing in the wind, frigate will constantly try to determine if that motion is from a person or other object you are tracking. Those detections not only increase your average CPU usage, but also clog the pipeline for detecting objects elsewhere. If you are experiencing high values for `detection_fps` when no objects of interest are in the cameras, you should use masks to tell frigate to ignore movement from trees, bushes, timestamps, or any part of the image where detections should not be wasted looking for objects.

### FFmpeg Hardware Acceleration
Frigate works on Raspberry Pi 3b/4 and x86 machines. It is recommended to update your configuration to enable hardware accelerated decoding in ffmpeg. Depending on your system, these parameters may not be compatible.

Raspberry Pi 3/4 (32-bit OS):
```yaml
ffmpeg:
  hwaccel_args:
    - -c:v
    - h264_mmal
```

Raspberry Pi 3/4 (64-bit OS)
```yaml
ffmpeg:
  hwaccel_args:
    - -c:v
    - h264_v4l2m2m
```

Intel-based CPUs (<10th Generation) via Quicksync (https://trac.ffmpeg.org/wiki/Hardware/QuickSync)
```yaml
ffmpeg:
  hwaccel_args:
    - -hwaccel
    - vaapi
    - -hwaccel_device
    - /dev/dri/renderD128
    - -hwaccel_output_format
    - yuv420p
```

Intel-based CPUs (>=10th Generation) via Quicksync (https://trac.ffmpeg.org/wiki/Hardware/QuickSync)
**Note:** You also need to set `LIBVA_DRIVER_NAME=iHD` as an environment variable on the container.
```yaml
ffmpeg:
  hwaccel_args:
    - -hwaccel
    - vaapi
    - -hwaccel_device
    - /dev/dri/renderD128
```

Nvidia GPU based decoding via NVDEC is supported, but requires special configuration. See the [nvidia NVDEC documentation](docs/nvdec.md) for more details.

[Back to top](#documentation)

## Detectors
By default Frigate will look for a USB Coral device and fall back to the CPU if it cannot be found. If you have PCI or multiple Coral devices, you need to configure your detector devices in the config file. When using multiple detectors, they run in dedicated processes, but pull from a common queue of requested detections across all cameras.

Frigate supports `edgetpu` and `cpu` as detector types. The device value should be specified according to the [Documentation for the TensorFlow Lite Python API](https://coral.ai/docs/edgetpu/multiple-edgetpu/#using-the-tensorflow-lite-python-api).

Single USB Coral:
```yaml
detectors:
  coral:
    type: edgetpu
    device: usb
```

Multiple USB Corals:
```yaml
detectors:
  coral1:
    type: edgetpu
    device: usb:0
  coral2:
    type: edgetpu
    device: usb:1
```

Mixing Corals:
```yaml
detectors:
  coral_usb:
    type: edgetpu
    device: usb
  coral_pci:
    type: edgetpu
    device: pci
```

CPU Detectors (not recommended):
```yaml
detectors:
  cpu1:
    type: cpu
  cpu2:
    type: cpu
```
[Back to top](#documentation)

## Reducing False Positives
Tune your object filters to adjust false positives: `min_area`, `max_area`, `min_score`, `threshold`.

For object filters in your configuration, any single detection below `min_score` will be ignored as a false positive. `threshold` is based on the median of the history of scores (padded to 3 values) for a tracked object. Consider the following frames when `min_score` is set to 0.6 and threshold is set to 0.85:

| Frame | Current Score | Score History | Computed Score | Detected Object |
| --- | --- | --- | --- | --- |
| 1 | 0.7 | 0.0, 0, 0.7 | 0.0 | No
| 2 | 0.55 | 0.0, 0.7, 0.0 | 0.0 | No
| 3 | 0.85 | 0.7, 0.0, 0.85 | 0.7 | No
| 4 | 0.90 | 0.7, 0.85, 0.95, 0.90 | 0.875 | Yes
| 5 | 0.88 | 0.7, 0.85, 0.95, 0.90, 0.88 | 0.88 | Yes
| 6 | 0.95 | 0.7, 0.85, 0.95, 0.90, 0.88, 0.95 | 0.89 | Yes

In frame 2, the score is below the `min_score` value, so frigate ignores it and it becomes a 0.0. The computed score is the median of the score history (padding to at least 3 values), and only when that computed score crosses the `threshold` is the object marked as a true positive. That happens in frame 4 in the example.

[Back to top](#documentation)

## Masks
The following types of masks are supported:
- `poly`: (Recommended) List of x,y points like zone configuration
- `base64`: Base64 encoded image file
- `image`: Image file in the `/config` directory

`base64` and `image` masks must be the same aspect ratio and resolution as your camera. 

The mask in the second image would limit motion detection on this camera to only the front yard and not the street. 

<a href="docs/example-mask-check-point.png"><img src="docs/example-mask-check-point.png" height="300"></a>
<a href="docs/example-mask.bmp"><img src="docs/example-mask.bmp" height="300"></a>
<a href="docs/example-mask-overlay.png"><img src="docs/example-mask-overlay.png" height="300"></a>

To create a poly mask:
1. Download a camera snapshot image with the same resolution as the camera feed (`/<camera_name>/latest.jpg`).
1. Upload the image to https://www.image-map.net/
1. Select "shape" poly - start in the lowest left corner and place the first marker (point) and continue upwards and then to the right until the polygon shape covers the area that you want to mask out (ignore). 
1. When you are finished with the polygon click "Show me the code!" and copy all coordinates (point), ie. `"0,461,3,0,1919,0,1919,843,1699,492,1344,458,1346,336,973,317,869,375,866,432"` 
1. Adjust any -1 values to 0 and then add it all to the configuration (see the example configuration for correct indentation and placement)

Example of a finished row corresponding to the below example image:
```yaml
mask: 'poly,0,461,3,0,1919,0,1919,843,1699,492,1344,458,1346,336,973,317,869,375,866,432'
```
    
<a href="docs/example-mask-poly.png"><img src="docs/example-mask-poly.png" height="300"></a>

You can test your mask by temporarily configuring it as a [zone](#zones) and enabling `draw_zones` in your config. Zones are visible on the [MJPEG feed](#camera_name).

[Back to top](#documentation)

## Zones
Zones allow you to define a specific area of the frame and apply additional filters for object types so you can determine whether or not an object is within a particular area. Zones cannot have the same name as a camera. If desired, a single zone can include multiple cameras if you have multiple cameras covering the same area by configuring zones with the same name for each camera.

During testing, `draw_zones` should be set in the config to draw the zone on the frames so you can adjust as needed. The zone line will increase in thickness when any object enters the zone. Zones are visible on the [MJPEG feed](#camera_name).

![Zone Example](docs/zone_example.jpg)

[Back to top](#documentation)

## Recording Clips
**Note**: Previous versions of frigate included `-vsync drop` in input parameters. This is not compatible with FFmpeg's segment feature and must be removed from your input parameters if you have overrides set.

Frigate can save video clips without any CPU overhead for encoding by simply copying the stream directly with FFmpeg. It leverages FFmpeg's segment functionality to maintain a cache of video for each camera. The cache files are written to disk at `cache_dir` and do not introduce memory overhead. When an object is being tracked, it will extend the cache to ensure it can assemble a clip when the event ends. Once the event ends, it again uses FFmpeg to assemble a clip by combining the video clips without any encoding by the CPU. Assembled clips are are saved to the `clips_dir` directory along with a json file containing the current information about the tracked object.

### Global Configuration Options
- `max_seconds`: This limits the size of the cache when an object is being tracked. If an object is stationary and being tracked for a long time, the cache files will expire and this value will be the maximum clip length for the *end* of the event. For example, if this is set to 300 seconds and an object is being tracked for 600 seconds, the clip will end up being the last 300 seconds. Defaults to 300 seconds.

### Per-camera Configuration Options
- `pre_capture`: Defines how much time should be included in the clip prior to the beginning of the event. Defaults to 30 seconds.
- `objects`: List of object types to save clips for. Object types here must be listed for tracking at the camera or global configuration. Defaults to all tracked objects.

[Back to top](#documentation)

## Integration with HomeAssistant
Setup a camera, binary_sensor, sensor and optionally automation as shown for each camera you define in frigate. Replace <camera_name> with the camera name as defined in the frigate `config.yml` (The `frigate_coral_fps` and `frigate_coral_inference` sensors only need to be defined once)

```yaml
camera:
  - name: <camera_name> Last Person
    platform: mqtt
    topic: frigate/<camera_name>/person/snapshot
  - name: <camera_name> Last Car
    platform: mqtt
    topic: frigate/<camera_name>/car/snapshot

binary_sensor:
  - name: <camera_name> Person
    platform: mqtt
    state_topic: "frigate/<camera_name>/person"
    device_class: motion
    availability_topic: "frigate/available"

sensor:
  - platform: rest
    name: Frigate Debug
    resource: http://localhost:5000/debug/stats
    scan_interval: 5
    json_attributes:
      - <camera_name>
      - detection_fps
      - detectors
    value_template: 'OK'  
  - platform: template
    sensors:
      <camera_name>_fps: 
        value_template: '{{ states.sensor.frigate_debug.attributes["<camera_name>"]["camera_fps"] }}'
        unit_of_measurement: 'FPS'
      <camera_name>_skipped_fps: 
        value_template: '{{ states.sensor.frigate_debug.attributes["<camera_name>"]["skipped_fps"] }}'
        unit_of_measurement: 'FPS'
      <camera_name>_detection_fps: 
        value_template: '{{ states.sensor.frigate_debug.attributes["<camera_name>"]["detection_fps"] }}'
        unit_of_measurement: 'FPS'
      frigate_detection_fps: 
        value_template: '{{ states.sensor.frigate_debug.attributes["detection_fps"] }}'
        unit_of_measurement: 'FPS'
      frigate_coral_inference:
        value_template: '{{ states.sensor.frigate_debug.attributes["detectors"]["coral"]["inference_speed"] }}' 
        unit_of_measurement: 'ms'
        
automation:
  - alias: Alert me if a person is detected while armed away
    trigger: 
      platform: state
      entity_id: binary_sensor.camera_person
      from: 'off'
      to: 'on'
    condition:
      - condition: state
        entity_id: alarm_control_panel.home_alarm
        state: armed_away
    action:
      - service: notify.user_telegram
        data:
          message: "A person was detected."
          data:
            photo:
              - url: http://<ip>:5000/<camera_name>/person/best.jpg
                caption: A person was detected.        
```

[Back to top](#documentation)

## HTTP Endpoints
A web server is available on port 5000 with the following endpoints.

### `/<camera_name>`
An mjpeg stream for debugging. Keep in mind the mjpeg endpoint is for debugging only and will put additional load on the system when in use. 

You can access a higher resolution mjpeg stream by appending `h=height-in-pixels` to the endpoint. For example `http://localhost:5000/back?h=1080`. You can also increase the FPS by appending `fps=frame-rate` to the URL such as `http://localhost:5000/back?fps=10` or both with `?fps=10&h=1000`

### `/<camera_name>/<object_name>/best.jpg[?h=300&crop=1]`
The best snapshot for any object type. It is a full resolution image by default.

Example parameters:
- `h=300`: resizes the image to 300 pixes tall
- `crop=1`: crops the image to the region of the detection rather than returning the entire image

### `/<camera_name>/latest.jpg[?h=300]`
The most recent frame that frigate has finished processing. It is a full resolution image by default.

Example parameters:
- `h=300`: resizes the image to 300 pixes tall

### `/debug/stats`
Contains some granular debug info that can be used for sensors in HomeAssistant.

Sample response:
```jsonc
{
    /* Per Camera Stats */
    "back": {
        /***************
        * Frames per second being consumed from your camera. If this is higher
        * than it is supposed to be, you should set -r FPS in your input_args.
        * camera_fps = process_fps + skipped_fps
        ***************/
        "camera_fps": 5.0,
        /***************
        * Number of times detection is run per second. This can be higher than
        * your camera FPS because frigate often looks at the same frame multiple times
        * or in multiple locations
        ***************/
        "detection_fps": 1.5,
        /***************
        * PID for the ffmpeg process that consumes this camera
        ***************/
        "ffmpeg_pid": 27,
        /***************
        * Timestamps of frames in various parts of processing
        ***************/
        "frame_info": {
            /***************
            * Timestamp of the frame frigate is running object detection on.
            ***************/
            "detect": 1596994991.91426,
            /***************
            * Timestamp of the frame frigate is processing detected objects on.
            * This is where MQTT messages are sent, zones are checked, etc.
            ***************/
            "process": 1596994991.91426,
            /***************
            * Timestamp of the frame frigate last read from ffmpeg.
            ***************/
            "read": 1596994991.91426
        },
        /***************
        * PID for the process that runs detection for this camera
        ***************/
        "pid": 34,
        /***************
        * Frames per second being processed by frigate.
        ***************/
        "process_fps": 5.1,
        /***************
        * Timestamp when the detection process started looking for a frame. If this value stays constant
        * for a long time, that means there aren't any frames in the frame queue.
        ***************/
        "read_start": 1596994991.943814,
        /***************
        * Frames per second skip for processing by frigate.
        ***************/
        "skipped_fps": 0.0
    },
    /***************
    * Sum of detection_fps across all cameras and detectors. 
    * This should be the sum of all detection_fps values from cameras.
    ***************/
    "detection_fps": 5.0,
    /* Detectors Stats */
    "detectors": {
      "coral": {
          /***************
          * Timestamp when object detection started. If this value stays non-zero and constant
          * for a long time, that means the detection process is stuck.
          ***************/
          "detection_start": 0.0,
          /***************
          * Time spent running object detection in milliseconds.
          ***************/
          "inference_speed": 10.48,
          /***************
          * PID for the shared process that runs object detection on the Coral.
          ***************/
          "pid": 25321
      }
    }
}
```

[Back to top](#documentation)

## MQTT Topics
These are the MQTT messages generated by Frigate. The default topic_prefix is `frigate`, but can be changed in the config file.

### `frigate/available`
Designed to be used as an availability topic with HomeAssistant. Possible message are:
"online": published when frigate is running (on startup)
"offline": published right before frigate stops

### `frigate/<camera_name>/<object_name>`
Publishes `ON` or `OFF` and is designed to be used a as a binary sensor in HomeAssistant for whether or not that object type is detected.

### `frigate/<camera_name>/<object_name>/snapshot`
Publishes a jpeg encoded frame of the detected object type. When the object is no longer detected, the highest confidence image is published or the original image
is published again.

The height and crop of snapshots can be configured in the config.

### `frigate/<camera_name>/events/start`
Message published at the start of any tracked object. JSON looks as follows:
```json
{
    "label": "person",
    "score": 0.87890625,
    "box": [
        95,
        155,
        581,
        1182
    ],
    "area": 499122,
    "region": [
        0,
        132,
        1080,
        1212
    ],
    "frame_time": 1600208805.60284,
    "centroid": [
        338,
        668
    ],
    "id": "1600208805.60284-k1l43p",
    "start_time": 1600208805.60284,
    "top_score": 0.87890625,
    "zones": [],
    "score_history": [
        0.87890625
    ],
    "computed_score": 0.0,
    "false_positive": true
}
```

### `frigate/<camera_name>/events/end`
Same as `frigate/<camera_name>/events/start`, but with an `end_time` property as well.

### `frigate/<zone_name>/<object_name>`
Publishes `ON` when the object enters the zone and `OFF` when the object disappears or exits the zone. Designed to be used a as a binary sensor in HomeAssistant for whether or not that object type is detected in the zone.

[Back to top](#documentation)

## Custom Models
Models for both CPU and EdgeTPU (Coral) are bundled in the image. You can use your own models with volume mounts:
- CPU Model: `/cpu_model.tflite`
- EdgeTPU Model: `/edgetpu_model.tflite`
- Labels: `/labelmap.txt`

### Customizing the Labelmap
The labelmap can be customized to your needs. A common reason to do this is to combine multiple object types that are easily confused when you don't need to be as granular such as car/truck. You must retain the same number of labels, but you can change the names. To change:

- Download the [COCO labelmap](https://dl.google.com/coral/canned_models/coco_labels.txt)
- Modify the label names as desired. For example, change `7 truck` to `7 car`
- Mount the new file at `/labelmap.txt` in the container with an additional volume
  ```
  -v ./config/labelmap.txt:/labelmap.txt
  ```

[Back to top](#documentation)

## Troubleshooting

### "ffmpeg didnt return a frame. something is wrong"
Turn on logging for the camera by overriding the global_args and setting the log level to `info`:
```yaml
ffmpeg:
  global_args:
    - -hide_banner
    - -loglevel
    - info
```

### "On connect called"
If you see repeated "On connect called" messages in your config, check for another instance of frigate. This happens when multiple frigate containers are trying to connect to mqtt with the same client_id.

[Back to top](#documentation)

