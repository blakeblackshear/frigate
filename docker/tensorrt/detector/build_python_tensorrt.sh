#!/bin/bash

set -euxo pipefail

mkdir -p /trt-wheels

if [[ "${TARGETARCH}" == "arm64" ]]; then

  wget -q https://developer.nvidia.com/downloads/compute/machine-learning/tensorrt/10.3.0/tars/TensorRT-10.3.0.26.l4t.aarch64-gnu.cuda-12.6.tar.gz -O TensorRT.tar.gz
  tar -zxf TensorRT.tar.gz
  mv TensorRT-10.3.0.26/python/tensorrt-10.3.0-cp311-none-linux_aarch64.whl /trt-wheels/
  rm -rf TensorRT-10.3.0.26
  rm -rf TensorRT.tar.gz

fi
