# Realtime Object Detection for RTSP Cameras
- Prioritizes realtime processing over frames per second. Dropping frames is fine.
- OpenCV runs in a separate process so it can grab frames as quickly as possible to ensure there aren't old frames in the buffer
- Object detection with Tensorflow runs in a separate process and ignores frames that are more than 0.5 seconds old
- Uses shared memory arrays for handing frames between processes
- Provides a url for viewing the video feed at a hard coded ~5FPS as an mjpeg stream
- Frames are only encoded into mjpeg stream when it is being viewed

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
realtime-od:latest
```

Access the mjpeg stream at http://localhost:5000

## Future improvements
- MQTT messages when detected objects change
- Dynamic changes to processing speed, ie. only process 1FPS unless motion detected
- Break incoming frame into multiple smaller images and run detection in parallel for lower latency (rather than input a lower resolution)
- Parallel processing to increase FPS