#!/bin/bash

set -euxo pipefail

mkdir -p /trt-wheels

if [[ "${TARGETARCH}" == "arm64" ]]; then

  # NVIDIA supplies python-tensorrt for python3.8, but frigate uses python3.9,
  # so we must build python-tensorrt ourselves.

  # Get python-tensorrt source
  mkdir /workspace
  cd /workspace
  git clone -b ${TENSORRT_VER} https://github.com/NVIDIA/TensorRT.git --depth=1

  # Collect dependencies
  EXT_PATH=/workspace/external && mkdir -p $EXT_PATH
  pip3 install pybind11 && ln -s /usr/local/lib/python3.9/dist-packages/pybind11 $EXT_PATH/pybind11
  ln -s /usr/include/python3.9 $EXT_PATH/python3.9
  ln -s /usr/include/aarch64-linux-gnu/NvOnnxParser.h /workspace/TensorRT/parsers/onnx/

  # Build wheel
  cd /workspace/TensorRT/python
  EXT_PATH=$EXT_PATH PYTHON_MAJOR_VERSION=3 PYTHON_MINOR_VERSION=9 TARGET_ARCHITECTURE=aarch64 /bin/bash ./build.sh
  mv build/dist/*.whl /trt-wheels/

fi
