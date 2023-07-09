#!/bin/bash

set -euxo pipefail

SCRIPT_DIR="/usr/local/src/tensorrt_demos"

# Clone tensorrt_demos repo
git clone --depth 1 https://github.com/NateMeyer/tensorrt_demos.git -b conditional_download

# Build libyolo
cd ./tensorrt_demos/plugins && make all
cp libyolo_layer.so /usr/local/lib/libyolo_layer.so

# Store yolo scripts for later conversion
cd ../
mkdir -p ${SCRIPT_DIR}/plugins
cp plugins/libyolo_layer.so ${SCRIPT_DIR}/plugins/libyolo_layer.so
cp -a yolo ${SCRIPT_DIR}/
