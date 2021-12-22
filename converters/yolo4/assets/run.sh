#!/bin/bash

set -xe
cd /tensorrt_demos/plugins && make

cd /tensorrt_demos/yolo
for model in yolov4-tiny-288 \
             yolov4-tiny-416 \
             yolov4-288 \
             yolov4-416 ; do
    python3 yolo_to_onnx.py -m ${model}
    python3 onnx_to_tensorrt.py -m ${model}
    cp /tensorrt_demos/yolo/${model}.trt /model/${model}.trt
done     
