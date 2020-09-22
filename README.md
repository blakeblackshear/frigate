# Frigate - NVR With Realtime Object Detection for IP Cameras
Uses OpenCV and Tensorflow to perform realtime object detection locally for IP cameras. Designed for integration with HomeAssistant or others via MQTT.

Use of a [Google Coral Accelerator](https://coral.ai/products/) is optional, but highly recommended. On my Intel i7 processor, I can process 2-3 FPS with the CPU. The Coral can process 100+ FPS with very low CPU load.

- Leverages multiprocessing heavily with an emphasis on realtime over processing every frame
- Uses a very low overhead motion detection to determine where to run object detection
- Object detection with Tensorflow runs in a separate process
- Object info is published over MQTT for integration into HomeAssistant as a binary sensor
- An endpoint is available to view an MJPEG stream for debugging, but should not be used continuously

![Diagram](diagram.png)

## Example video (from older version)
You see multiple bounding boxes because it draws bounding boxes from all frames in the past 1 second where a person was detected. Not all of the bounding boxes were from the current frame.
[![](http://img.youtube.com/vi/nqHbCtyo4dY/0.jpg)](http://www.youtube.com/watch?v=nqHbCtyo4dY "Frigate")

## Getting Started
Run the container with
```bash
docker run --rm \
-name blakeblackshear/frigate:stable \
--privileged \
--shm-size=512m \ # should work for a 2-3 cameras
-v /dev/bus/usb:/dev/bus/usb \
-v <path_to_config_dir>:/config:ro \
-v /etc/localtime:/etc/localtime:ro \
-p 5000:5000 \
-e FRIGATE_RTSP_PASSWORD='password' \
blakeblackshear/frigate:stable
```

Example docker-compose:
```yaml
  frigate:
    container_name: frigate
    restart: unless-stopped
    privileged: true
    shm_size: '1g' # should work for 5-7 cameras
    image: blakeblackshear/frigate:stable
    volumes:
      - /dev/bus/usb:/dev/bus/usb
      - /etc/localtime:/etc/localtime:ro
      - <path_to_config>:/config
      - <path_to_directory_for_clips>:/clips
    ports:
      - "5000:5000"
    environment:
      FRIGATE_RTSP_PASSWORD: "password"
```

A `config.yml` file must exist in the `config` directory. See example [here](config/config.example.yml) and device specific info can be found [here](docs/DEVICES.md).

## Recommended Hardware
**Note: I may receive commissions for purchases made through links below.**
|Name|Inference Speed|Notes|
|----|---------------|-----|
|[Atomic Pi](https://amzn.to/2FKJHpu)|16ms|Best option for a dedicated low power board with a small number of cameras.|
|[Intel NUC NUC7i3BNK](https://amzn.to/2RDYZPe)|8-10ms|Best possible performance. Can handle 7+ cameras at 5fps depending on typical amounts of motion.|
|[BMAX B2 Plus](https://amzn.to/3cjgQ81)|10-12ms|Good balance of performance and cost. Also capable of running many other services at the same time as frigate.|
|[Minisforum GK41](https://amzn.to/32FyKhG)|9-10ms|Great alternative to a NUC. Easily handiles 4 1080p cameras.|

ARM boards are not officially supported at the moment due to some python dependencies that require modification to work on ARM devices. The Raspberry Pi4 gets about 16ms inference speeds, but the hardware acceleration for ffmpeg does not work for converting yuv420 to rgb24. The Atomic Pi is x86 and much more efficient.

Users have reported varying success in getting frigate to run in a VM. In some cases, the virtualization layer introduces a significant delay in communication with the Coral. If running virtualized in Proxmox, pass the USB card/interface to the virtual machine not the USB ID for faster inference speed.

## Integration with HomeAssistant

Setup a camera, binary_sensor, sensor and optionally automation as shown for each camera you define in frigate. Replace <camera_name> with the camera name as defined in the frigate `config.yml` (The `frigate_coral_fps` and `frigate_coral_inference` sensors only need to be defined once)

```
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
      - coral
    value_template: 'OK'  
  - platform: template
    sensors:
      <camera_name>_fps: 
        value_template: '{{ states.sensor.frigate_debug.attributes["<camera_name>"]["fps"] }}'
        unit_of_measurement: 'FPS'
      <camera_name>_skipped_fps: 
        value_template: '{{ states.sensor.frigate_debug.attributes["<camera_name>"]["skipped_fps"] }}'
        unit_of_measurement: 'FPS'
      <camera_name>_detection_fps: 
        value_template: '{{ states.sensor.frigate_debug.attributes["<camera_name>"]["detection_fps"] }}'
        unit_of_measurement: 'FPS'
      frigate_coral_fps: 
        value_template: '{{ states.sensor.frigate_debug.attributes["coral"]["fps"] }}'
        unit_of_measurement: 'FPS'
      frigate_coral_inference:
        value_template: '{{ states.sensor.frigate_debug.attributes["coral"]["inference_speed"] }}' 
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
Contains some granular debug info that can be used for sensors in HomeAssistant. See details below.

## MQTT Messages
These are the MQTT messages generated by Frigate. The default topic_prefix is `frigate`, but can be changed in the config file.

### frigate/available
Designed to be used as an availability topic with HomeAssistant. Possible message are:
"online": published when frigate is running (on startup)
"offline": published right before frigate stops

### frigate/<camera_name>/<object_name>
Publishes `ON` or `OFF` and is designed to be used a as a binary sensor in HomeAssistant for whether or not that object type is detected.

### frigate/<camera_name>/<object_name>/snapshot
Publishes a jpeg encoded frame of the detected object type. When the object is no longer detected, the highest confidence image is published or the original image
is published again.

The height and crop of snapshots can be configured as shown in the example config.

### frigate/<camera_name>/<object_name>/event
Publishes a jpeg encoded frame  as well as data of the detected object in the same message. The message will have the below format
```json
{
   "image": "<BASE64 encoded image>",
   "status": "ON/OFF", 
   "label": "person",
   "score" : 0.76354,
   "start_time" : 1594298020.819046,
   "id": "1594298020.819046-0"
}
```

### frigate/<camera_name>/events/start
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

### frigate/<camera_name>/events/end
Same as `frigate/<camera_name>/events/start`, but with an `end_time` property as well.

### frigate/<zone_name>/<object_name>
Publishes `ON` or `OFF` and is designed to be used a as a binary sensor in HomeAssistant for whether or not that object type is detected in the zone.

## Understanding min_score and threshold
`min_score` defines the minimum score for Frigate to begin tracking a detected object. Any single detection below `min_score` will be ignored as a false positive. `threshold` is based on the median of the history of scores for a tracked object. Consider the following frames when `min_score` is set to 0.6 and threshold is set to 0.85:

| Frame | Current Score | Score History | Computed Score | Detected Object |
| --- | --- | --- | --- | --- |
| 1 | 0.7 | 0.0, 0, 0.7 | 0.0 | No
| 2 | 0.55 | 0.0, 0.7, 0.0 | 0.0 | No
| 3 | 0.85 | 0.7, 0.0, 0.85 | 0.7 | No
| 4 | 0.90 | 0.7, 0.85, 0.95, 0.90 | 0.875 | Yes
| 5 | 0.88 | 0.7, 0.85, 0.95, 0.90, 0.88 | 0.88 | Yes
| 6 | 0.95 | 0.7, 0.85, 0.95, 0.90, 0.88, 0.95 | 0.89 | Yes

In frame 2, the score is below the `min_score` value, so frigate ignores it and it becomes a 0.0. The computed score is the median of the score history (padding to at least 3 values), and only when that computed score crosses the `threshold` is the object marked as a true positive. That happens in frame 4 in the example.

## Using a custom model or labels
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

## Recording Clips
**Note**: Previous versions of frigate included `-vsync drop` in input parameters. This is not compatible with FFmpeg's segment feature and must be removed from your input parameters if you have overrides set.

Frigate can save video clips without any CPU overhead for encoding by simply copying the stream directly with FFmpeg. It leverages FFmpeg's segment functionality to maintain a cache of 90 seconds of video for each camera. The cache files are written to disk at /cache and do not introduce memory overhead. When an object is being tracked, it will extend the cache to ensure it can assemble a clip when the event ends. Once the event ends, it again uses FFmpeg to assemble a clip by combining the video clips without any encoding by the CPU. Assembled clips are are saved to the /clips directory along with a json file containing the current information about the tracked object.

### Global Configuration Options
- `max_seconds`: This limits the size of the cache when an object is being tracked. If an object is stationary and being tracked for a long time, the cache files will expire and this value will be the maximum clip length for the *end* of the event. For example, if this is set to 300 seconds and an object is being tracked for 600 seconds, the clip will end up being the last 300 seconds. Defaults to 300 seconds.

### Per-camera Configuration Options
- `pre_capture`: Defines how much time should be included in the clip prior to the beginning of the event. Defaults to 30 seconds.
- `objects`: List of object types to save clips for. Object types here must be listed for tracking at the camera or global configuration. Defaults to all tracked objects.

## Google Coral Configuration
Frigate attempts to detect your Coral device automatically. If you have multiple Coral devices or a version that is not detected automatically, you can specify using the `tensorflow_device` config option.

## Masks and limiting detection to a certain area
The mask works by looking at the bottom center of any bounding box (first image, red dot below) and comparing that to your mask. If that red dot falls on an area of your mask that is black, the detection (and motion) will be ignored. The mask in the second image would limit detection on this camera to only objects that are in the front yard and not the street. 

<a href="docs/example-mask-check-point.png"><img src="docs/example-mask-check-point.png" height="300"></a>
<a href="docs/example-mask.bmp"><img src="docs/example-mask.bmp" height="300"></a>
<a href="docs/example-mask-overlay.png"><img src="docs/example-mask-overlay.png" height="300"></a>

The following types of masks are supported:
- `base64`: Base64 encoded image file
- `poly`: List of x,y points like zone configuration
- `image`: Path to an image file in the config directory

`base64` and `image` masks must be the same aspect ratio as your camera. 

## Zones
Zones allow you to define a specific area of the frame and apply additional filters for object types so you can determine whether or not an object is within a particular area. Zones cannot have the same name as a camera. If desired, a single zone can include multiple cameras if you have multiple cameras covering the same area. See the sample config for details on how to configure.

During testing, `draw_zones` can be set in the config to tell frigate to draw the zone on the frames so you can adjust as needed. The zone line will increase in thickness when any object enters the zone.

![Zone Example](docs/zone_example.jpg)

## Debug Info
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
    /* Coral Stats */
    "coral": {
        /***************
        * Timestamp when object detection started. If this value stays non-zero and constant
        * for a long time, that means the detection process is stuck.
        ***************/
        "detection_start": 0.0,
        /***************
        * Frames per second of the Coral. This should be the sum of all detection_fps values from cameras.
        ***************/
        "fps": 6.9,
        /***************
        * Time spent running object detection in milliseconds.
        ***************/
        "inference_speed": 10.48,
        /***************
        * PID for the shared process that runs object detection on the Coral.
        ***************/
        "pid": 25321
    },
    "plasma_store_rc": null // Return code for the plasma store. This should be null normally.
}
```

## Tips
- Lower the framerate of the video feed on the camera to reduce the CPU usage for capturing the feed. Not as effective, but you can also modify the `take_frame` [configuration](config/config.example.yml) for each camera to only analyze every other frame, or every third frame, etc. 
- Hard code the resolution of each camera in your config if you are having difficulty starting frigate or if the initial ffprobe for camerea resolution fails or returns incorrect info. Example:
```
cameras:
  back:
    ffmpeg:
      input: rtsp://<camera>
    height: 1080
    width: 1920
```
- Additional logging is available in the docker container - You can view the logs by running `docker logs -t frigate`
- Object configuration - Tracked objects types, sizes and thresholds can be defined globally and/or on a per camera basis. The global and camera object configuration is *merged*. For example, if you defined tracking person, car, and truck globally but modified your backyard camera to only track person, the global config would merge making the effective list for the backyard camera still contain person, car and truck. If you want precise object tracking per camera, best practice to put a minimal list of objects at the global level and expand objects on a per camera basis. Object threshold and area configuration will be used first from the camera object config (if defined) and then from the global config.  See the [example config](config/config.example.yml) for more information.

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

