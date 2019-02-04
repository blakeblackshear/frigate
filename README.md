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
docker run -it --rm \
-v <path_to_frozen_detection_graph.pb>:/frozen_inference_graph.pb:ro \
-v <path_to_labelmap.pbtext>:/label_map.pbtext:ro \
-p 5000:5000 \
-e RTSP_URL='<rtsp_url>' \
-e REGIONS='<box_size_1>,<x_offset_1>,<y_offset_1>:<box_size_2>,<x_offset_2>,<y_offset_2>' \
realtime-od:latest
```

Access the mjpeg stream at http://localhost:5000

## Tips
- Lower the framerate of the RTSP feed on the camera to what you want to reduce the CPU usage for capturing the feed

## Future improvements
- MQTT messages when detected objects change
- Dynamic changes to processing speed, ie. only process 1FPS unless motion detected
- Parallel processing to increase FPS
- Look into GPU accelerated decoding of RTSP stream
- Send video over a socket and use JSMPEG