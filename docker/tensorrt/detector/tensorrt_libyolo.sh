#!/bin/bash

set -euxo pipefail

SCRIPT_DIR="/usr/local/src/tensorrt_demos"

# Clone tensorrt_demos repo
git clone --depth 1 https://github.com/NateMeyer/tensorrt_demos.git -b conditional_download

# Build libyolo
if [ ! -e /usr/local/cuda ]; then
    ln -s /usr/local/cuda-* /usr/local/cuda
fi
cd ./tensorrt_demos/plugins && make all -j$(nproc)
cp libyolo_layer.so /usr/local/lib/libyolo_layer.so

# Store yolo scripts for later conversion
cd ../
mkdir -p ${SCRIPT_DIR}/plugins
cp plugins/libyolo_layer.so ${SCRIPT_DIR}/plugins/libyolo_layer.so
cp -a yolo ${SCRIPT_DIR}/
