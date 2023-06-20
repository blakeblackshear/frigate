#!/bin/bash

set -euxo pipefail

OUTPUT_FOLDER=/trt_models
echo "Generating the following TRT Models: ${YOLO_MODELS:="yolov4-tiny-288,yolov4-tiny-416,yolov7-tiny-416"}"

# Create output folder
mkdir -p ${OUTPUT_FOLDER}

# Clone tensorrt_demos repo
# git clone --depth 1 https://github.com/NateMeyer/tensorrt_demos.git -b conditional_download /tmp/tensorrt_demos
cd /tmp/ && wget -qO tensorrt_demos.zip https://github.com/NateMeyer/tensorrt_demos/archive/refs/heads/conditional_download.zip
unzip tensorrt_demos.zip

cp /usr/local/lib/libyolo_layer.so /tmp/tensorrt_demos-conditional_download/plugins/libyolo_layer.so

# Download yolo weights
cd /tmp/tensorrt_demos-conditional_download/yolo && ./download_yolo.sh $YOLO_MODELS

# Build trt engine
cd /tmp/tensorrt_demos-conditional_download/yolo

for model in ${YOLO_MODELS//,/ }
do
    python3 yolo_to_onnx.py -m ${model}
    python3 onnx_to_tensorrt.py -m ${model}
    cp /tmp/tensorrt_demos-conditional_download/yolo/${model}.trt ${OUTPUT_FOLDER}/${model}.trt;
done

# Cleanup repo
rm -r /tmp/tensorrt_demos-conditional_download
