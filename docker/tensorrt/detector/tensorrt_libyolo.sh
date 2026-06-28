#!/bin/bash

set -euxo pipefail

SCRIPT_DIR="/usr/local/src/tensorrt_demos"

# Clone tensorrt_demos repo
git clone --depth 1 https://github.com/NateMeyer/tensorrt_demos.git -b conditional_download

# CUDA 13 removed libnvToolsExt.so (NVTX is now header-only nvtx3). The plugin Makefile links
# -lnvToolsExt only for optional NVTX profiling annotations, so strip it when the lib is absent —
# the link then succeeds on JP7 / CUDA 13. No-op on CUDA 12 (JP6), where the lib still exists.
if ! ldconfig -p | grep -q 'libnvToolsExt\.so'; then
    sed -i 's/-lnvToolsExt//g' ./tensorrt_demos/plugins/Makefile
fi

# TensorRT 10 (JP7 base) dropped libnvparsers.so (the legacy UFF/Caffe parsers). The plugin
# Makefile links -lnvparsers from an over-broad LIBS list, but the YOLO custom layer never uses
# it, so strip it when the lib is absent — the link then succeeds on TRT 10. No-op on TRT 8
# (JP5/JP6), where libnvparsers still ships.
if ! ldconfig -p | grep -q 'libnvparsers\.so'; then
    sed -i 's/-lnvparsers//g' ./tensorrt_demos/plugins/Makefile
fi

# Build libyolo
if [ ! -e /usr/local/cuda ]; then
    ln -s /usr/local/cuda-* /usr/local/cuda
fi
cd ./tensorrt_demos/plugins && make all -j$(nproc) computes="${COMPUTE_LEVEL:-}"
cp libyolo_layer.so /usr/local/lib/libyolo_layer.so

# Store yolo scripts for later conversion
cd ../
mkdir -p ${SCRIPT_DIR}/plugins
cp plugins/libyolo_layer.so ${SCRIPT_DIR}/plugins/libyolo_layer.so
cp -a yolo ${SCRIPT_DIR}/
