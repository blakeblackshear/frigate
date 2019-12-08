<a href='https://ko-fi.com/P5P7XGO9' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://az743702.vo.msecnd.net/cdn/kofi4.png?v=2' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

# Frigate - Realtime Object Detection for IP Cameras
**Note:** This version requires the use of a [Google Coral USB Accelerator](https://coral.withgoogle.com/products/accelerator/)

Uses OpenCV and Tensorflow to perform realtime object detection locally for IP cameras. Designed for integration with HomeAssistant or others via MQTT.

- Leverages multiprocessing and threads heavily with an emphasis on realtime over processing every frame
- Allows you to define specific regions (squares) in the image to look for objects
- No motion detection (for now)
- Object detection with Tensorflow runs in a separate thread
- Object info is published over MQTT for integration into HomeAssistant as a binary sensor
- An endpoint is available to view an MJPEG stream for debugging

![Diagram](diagram.png)

## Example video (from older version)
You see multiple bounding boxes because it draws bounding boxes from all frames in the past 1 second where a person was detected. Not all of the bounding boxes were from the current frame.
[![](http://img.youtube.com/vi/nqHbCtyo4dY/0.jpg)](http://www.youtube.com/watch?v=nqHbCtyo4dY "Frigate")

## Getting Started
Build the container with
```
docker build -t frigate .
```

The `mobilenet_ssd_v2_coco_quant_postprocess_edgetpu.tflite` model is included and used by default. You can use your own model and labels by mounting files in the container at `/frozen_inference_graph.pb` and `/label_map.pbtext`. Models must be compatible with the Coral according to [this](https://coral.withgoogle.com/models/).

Run the container with
```
docker run --rm \
--privileged \
-v /dev/bus/usb:/dev/bus/usb \
-v <path_to_config_dir>:/config:ro \
-p 5000:5000 \
-e FRIGATE_RTSP_PASSWORD='password' \
frigate:latest
```

Example docker-compose:
```
  frigate:
    container_name: frigate
    restart: unless-stopped
    privileged: true
    image: frigate:latest
    volumes:
      - /dev/bus/usb:/dev/bus/usb
      - <path_to_config>:/config
    ports:
      - "5000:5000"
    environment:
      FRIGATE_RTSP_PASSWORD: "password"
```

A `config.yml` file must exist in the `config` directory. See example [here](config/config.yml).

Access the mjpeg stream at `http://localhost:5000/<camera_name>` and the best person snapshot at `http://localhost:5000/<camera_name>/best_person.jpg`

## Integration with HomeAssistant
```
camera:
  - name: Camera Last Person
    platform: mqtt
    topic: frigate/<camera_name>/snapshot

binary_sensor:
  - name: Camera Person
    platform: mqtt
    state_topic: "frigate/<camera_name>/objects"
    value_template: '{{ value_json.person }}'
    device_class: motion
    availability_topic: "frigate/available"

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
              - url: http://<ip>:5000/<camera_name>/best_person.jpg
                caption: A person was detected.
```

## Tips
- Lower the framerate of the video feed on the camera to reduce the CPU usage for capturing the feed

## Future improvements
- [x] Remove motion detection for now
- [x] Try running object detection in a thread rather than a process
- [x] Implement min person size again
- [x] Switch to a config file
- [x] Handle multiple cameras in the same container
- [ ] Attempt to figure out coral symlinking
- [ ] Add object list to config with min scores for mqtt
- [ ] Move mjpeg encoding to a separate process
- [ ] Simplify motion detection (check entire image against mask, resize instead of gaussian blur)
- [ ] See if motion detection is even worth running
- [ ] Scan for people across entire image rather than specfic regions
- [ ] Dynamically resize detection area and follow people
- [ ] Add ability to turn detection on and off via MQTT
- [ ] Output movie clips of people for notifications, etc.
- [ ] Integrate with homeassistant push camera
- [ ] Merge bounding boxes that span multiple regions
- [ ] Implement mode to save labeled objects for training
- [ ] Try and reduce CPU usage by simplifying the tensorflow model to just include the objects we care about
- [ ] Look into GPU accelerated decoding of RTSP stream
- [ ] Send video over a socket and use JSMPEG
- [x] Look into neural compute stick
