#!/bin/bash

set -euxo pipefail

CUDA_HOME=/usr/local/cuda
LD_LIBRARY_PATH=${LD_LIBRARY_PATH}:/usr/local/cuda/lib64:/usr/local/cuda/extras/CUPTI/lib64
OUTPUT_FOLDER=/tensorrt_models
echo "Generating the following TRT Models: ${YOLO_MODELS:="yolov4-tiny-288,yolov4-tiny-416,yolov7-tiny-416"}"

# Create output folder
mkdir -p ${OUTPUT_FOLDER}

# Install packages
pip install --upgrade pip && pip install onnx==1.9.0 protobuf==3.20.3

#test if arch is aarch64 (tested on Jetson Orin Nano and nvcr.io/nvidia/l4t-tensorrt:r8.5.2.2-devel )
if [[ $(uname -m) == "aarch64" ]]; then
    echo "This system has a 64-bit ARM processor."
    pip3 install -U onnx
    apt-get update && apt-get install -y wget
else
    echo "This system does not have a 64-bit ARM processor."
fi

# Clone tensorrt_demos repo
git clone --depth 1 https://github.com/yeahme49/tensorrt_demos.git /tensorrt_demos

# Build libyolo
cd /tensorrt_demos/plugins && make all
cp libyolo_layer.so ${OUTPUT_FOLDER}/libyolo_layer.so

# Download yolo weights
cd /tensorrt_demos/yolo && ./download_yolo.sh

# Build trt engine
cd /tensorrt_demos/yolo

for model in ${YOLO_MODELS//,/ }
do
    python3 yolo_to_onnx.py -m ${model}
    python3 onnx_to_tensorrt.py -m ${model}
    cp /tensorrt_demos/yolo/${model}.trt ${OUTPUT_FOLDER}/${model}.trt;
done
