# Frigate - Realtime Object Detection for IP Cameras
Uses OpenCV and Tensorflow to perform realtime object detection locally for IP cameras. Designed for integration with HomeAssistant or others via MQTT.

Use of a [Google Coral USB Accelerator](https://coral.withgoogle.com/products/accelerator/) is optional, but highly recommended. On my Intel i7 processor, I can process 2-3 FPS with the CPU. The Coral can process 100+ FPS with very low CPU load.

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
-name frigate \
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
|Name|Inference Speed|Notes|
|----|---------------|-----|
|Atomic Pi|16ms|Best option for a dedicated low power board with a small number of cameras.|
|Intel NUC NUC7i3BNK|8-10ms|Best possible performance. Can handle 7+ cameras at 5fps depending on typical amounts of motion.|
|BMAX B2 Plus|10-12ms|Good balance of performance and cost. Also capable of running many other services at the same time as frigate.

ARM boards are not officially supported at the moment due to some python dependencies that require modification to work on ARM devices. The Raspberry Pi4 gets about 16ms inference speeds, but the hardware acceleration for ffmpeg does not work for converting yuv420 to rgb24. The Atomic Pi is x86 and much more efficient.

Users have reported varying success in getting frigate to run in a VM. In some cases, the virtualization layer introduces a significant delay in communication with the Coral. If running virtualized in Proxmox, pass the USB card/interface to the virtual machine not the USB ID for faster inference speed.

## Integration with HomeAssistant

Setup a the camera, binary_sensor, sensor and optionally automation as shown for each camera you define in frigate. Replace <camera_name> with the camera name as defined in the frigate `config.yml` (The `frigate_coral_fps` and `frigate_coral_inference` sensors only need to be defined once)

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

### `/<camera_name>/<object_name>/best.jpg`
The best snapshot for any object type. It is a full resolution image by default. You can change the size of the image by appending `h=height-in-pixels` to the endpoint.

### `/<camera_name>/latest.jpg`
The most recent frame that frigate has finished processing. It is a full resolution image by default. You can change the size of the image by appending `h=height-in-pixels` to the endpoint.

### `/debug/stats`
Contains some granular debug info that can be used for sensors in HomeAssistant.

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

### frigate/<camera_name>/events/start
Message published at the start of any tracked object. JSON looks as follows:
```json
{
    "label": "person",
    "score": 0.7890625,
    "box": [
        468,
        446,
        550,
        592
    ],
    "area": 11972,
    "region": [
        403,
        395,
        613,
        605
    ],
    "frame_time": 1594298020.819046,
    "centroid": [
        509,
        519
    ],
    "id": "1594298020.819046-0",
    "start_time": 1594298020.819046,
    "top_score": 0.7890625,
    "history": [
        {
            "score": 0.7890625,
            "box": [
                468,
                446,
                550,
                592
            ],
            "region": [
                403,
                395,
                613,
                605
            ],
            "centroid": [
                509,
                519
            ],
            "frame_time": 1594298020.819046
        }
    ]
}
```

### frigate/<camera_name>/events/end
Same as `frigate/<camera_name>/events/start`, but with an `end_time` property as well.

### frigate/<zone_name>/<object_name>
Publishes `ON` or `OFF` and is designed to be used a as a binary sensor in HomeAssistant for whether or not that object type is detected in the zone.

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

## Masks and limiting detection to a certain area
You can create a *bitmap (bmp)* file the same aspect ratio as your camera feed to limit detection to certain areas. The mask works by looking at the bottom center of any bounding box (first image, red dot below) and comparing that to your mask. If that red dot falls on an area of your mask that is black, the detection (and motion) will be ignored. The mask in the second image would limit detection on this camera to only objects that are in the front yard and not the street. 

<img src="docs/example-mask-check-point.png" height="300">
<img src="docs/example-mask.bmp" height="300">
<img src="docs/example-mask-overlay.png" height="300">

## Zones
Zones allow you to define a specific area of the frame and apply additional filters for object types so you can determine whether or not an object is within a particular area. Zones cannot have the same name as a camera. If desired, a single zone can include multiple cameras if you have multiple cameras covering the same area. See the sample config for details on how to configure.

During testing, `draw_zones` can be set in the config to tell frigate to draw the zone on the frames so you can adjust as needed. The zone line will increase in thickness when any object enters the zone.

![Zone Example](docs/zone_example.jpg)

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

