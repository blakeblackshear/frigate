#!/bin/bash

set -euxo pipefail

# Clone tensorrt_demos repo
git clone --depth 1 https://github.com/NateMeyer/tensorrt_demos.git -b conditional_download

# Build libyolo
cd ./tensorrt_demos/plugins && make all
cp libyolo_layer.so /usr/local/lib/libyolo_layer.so
cp libyolo_layer.so ../yolo/libyolo_layer.so

# Store yolo scripts for later conversion
cd ../
mkdir -p /usr/local/src/tensorrt_demos
cp -a yolo /usr/local/src/tensorrt_demos/