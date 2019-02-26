# Realtime Object Detection for RTSP Cameras
This results in a MJPEG stream with objects identified that has a lower latency than directly viewing the RTSP feed with VLC.
- Prioritizes realtime processing over frames per second. Dropping frames is fine.
- OpenCV runs in a separate process so it can grab frames as quickly as possible to ensure there aren't old frames in the buffer
- Object detection with Tensorflow runs in a separate process and ignores frames that are more than 0.5 seconds old
- Uses shared memory arrays for handing frames between processes
- Provides a url for viewing the video feed at a hard coded ~5FPS as an mjpeg stream
- Frames are only encoded into mjpeg stream when it is being viewed
- A process is created per detection region

## Getting Started
Build the container with
```
docker build -t realtime-od .
```

Download a model from the [zoo](https://github.com/tensorflow/models/blob/master/research/object_detection/g3doc/detection_model_zoo.md).

Download the cooresponding label map from [here](https://github.com/tensorflow/models/tree/master/research/object_detection/data).

Run the container with
```
docker run --rm \
-v <path_to_frozen_detection_graph.pb>:/frozen_inference_graph.pb:ro \
-v <path_to_labelmap.pbtext>:/label_map.pbtext:ro \
-p 5000:5000 \
-e RTSP_URL='<rtsp_url>' \
-e REGIONS='<box_size_1>,<x_offset_1>,<y_offset_1>,<min_person_size_1>,<min_motion_size_1>,<mask_file_1>:<box_size_2>,<x_offset_2>,<y_offset_2>,<min_person_size_2>,<min_motion_size_2>,<mask_file_2>' \
-e MQTT_HOST='your.mqtthost.com' \
-e MQTT_MOTION_TOPIC='cameras/1/motion' \
-e MQTT_OBJECT_TOPIC='cameras/1/objects' \
-e MQTT_OBJECT_CLASSES='person,car,truck' \
realtime-od:latest
```

Access the mjpeg stream at http://localhost:5000

## Tips
- Lower the framerate of the RTSP feed on the camera to what you want to reduce the CPU usage for capturing the feed
- Use SSDLite models

## Future improvements
- [x] Switch to MQTT prefix
- [x] Add last will and availability for MQTT
- [ ] Build tensorflow from source for CPU optimizations
- [ ] Add ability to turn detection on and off via MQTT
- [ ] MQTT reconnect if disconnected
- [ ] MQTT motion occasionally gets stuck ON
- [ ] Output movie clips of people for notifications, etc.
- [x] Add a max size for motion and objects (height/width > 1.5, total area > 1500 and < 100,000)
- [x] Make motion less sensitive to rain
- [x] Use Events or Conditions to signal between threads rather than polling a value
- [x] Implement a debug option to save images with detected objects
- [x] Only report if x% of the recent frames have a person to avoid single frame false positives (maybe take an average of the person scores in the past x frames?)
- [ ] Filter out detected objects that are not the right size
- [ ] Make resilient to network drop outs
- [ ] Merge bounding boxes that span multiple regions
- [ ] Switch to a config file
- [ ] Allow motion regions to be different than object detection regions
- [ ] Implement mode to save labeled objects for training
- [x] Add motion detection masking
- [x] Change color of bounding box if motion detected
- [x] Look for a subset of object types
- [ ] Try and reduce CPU usage by simplifying the tensorflow model to just include the objects we care about
- [x] MQTT messages when detected objects change
- [x] Implement basic motion detection with opencv and only look for objects in the regions with detected motion
- [x] Dynamic changes to processing speed, ie. only process 1FPS unless motion detected
- [x] Parallel processing to increase FPS
- [ ] Look into GPU accelerated decoding of RTSP stream
- [ ] Send video over a socket and use JSMPEG

## Building Tensorflow from source for CPU optimizations
https://www.tensorflow.org/install/source#docker_linux_builds
used `tensorflow/tensorflow:1.12.0-devel-py3`

## Optimizing the graph (cant say I saw much difference in CPU usage)
https://github.com/tensorflow/tensorflow/blob/master/tensorflow/tools/graph_transforms/README.md#optimizing-for-deployment
```
docker run -it -v ${PWD}:/lab -v ${PWD}/../back_camera_model/models/ssd_mobilenet_v2_coco_2018_03_29/frozen_inference_graph.pb:/frozen_inference_graph.pb:ro tensorflow/tensorflow:1.12.0-devel-py3 bash

bazel build tensorflow/tools/graph_transforms:transform_graph

bazel-bin/tensorflow/tools/graph_transforms/transform_graph \
--in_graph=/frozen_inference_graph.pb \
--out_graph=/lab/optimized_inception_graph.pb \
--inputs='image_tensor' \
--outputs='num_detections,detection_scores,detection_boxes,detection_classes' \
--transforms='
  strip_unused_nodes(type=float, shape="1,300,300,3")
  remove_nodes(op=Identity, op=CheckNumerics)
  fold_constants(ignore_errors=true)
  fold_batch_norms
  fold_old_batch_norms'
```