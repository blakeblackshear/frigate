#!/bin/bash

set -euxo pipefail

ONNXRUNTIME_VERSION=${ONNXRUNTIME_VERSION:-1.25.1}
ONNXRUNTIME_BRANCH=${ONNXRUNTIME_BRANCH:-rel-1.25.1}
ORT_PARALLEL=${ORT_PARALLEL:-4}
ORT_NVCC_THREADS=${ORT_NVCC_THREADS:-1}

mkdir -p /trt-wheels /workspace

pip3 install --upgrade pip setuptools wheel packaging numpy

command -v nvcc
test -f /usr/local/cuda/include/cuda.h

require_header() {
    local pattern="$1"
    local header

    for header in /usr/include/${pattern} /usr/include/aarch64-linux-gnu/${pattern}; do
        if [[ -e "${header}" ]]; then
            echo "${header}"
            return 0
        fi
    done

    echo "Missing required header matching ${pattern}" >&2
    return 1
}

require_ldconfig_entry() {
    local lib_name="$1"

    if ! ldconfig -p | grep -q "${lib_name}\\.so"; then
        echo "Missing ldconfig entry for ${lib_name}" >&2
        return 1
    fi
}

require_header "cudnn.h"
require_header "cudnn_version*.h"
require_header "NvInfer.h"
require_header "NvOnnxParser.h"

require_ldconfig_entry "libnvinfer"
require_ldconfig_entry "libnvinfer_plugin"
require_ldconfig_entry "libnvonnxparser"

cd /workspace
rm -rf onnxruntime
git clone --recursive --branch "${ONNXRUNTIME_BRANCH}" https://github.com/microsoft/onnxruntime.git onnxruntime

cd /workspace/onnxruntime
./build.sh \
    --config Release \
    --update \
    --build \
    --build_wheel \
    --parallel "${ORT_PARALLEL}" \
    --nvcc_threads "${ORT_NVCC_THREADS}" \
    --allow_running_as_root \
    --compile_no_warning_as_error \
    --skip_tests \
    --use_cuda \
    --cuda_home /usr/local/cuda \
    --use_tensorrt \
    --cudnn_home /usr/lib/aarch64-linux-gnu \
    --tensorrt_home /usr/lib/aarch64-linux-gnu \
    --cmake_extra_defines onnxruntime_BUILD_UNIT_TESTS=OFF

cp build/Linux/Release/dist/onnxruntime_gpu-"${ONNXRUNTIME_VERSION}"-*.whl /trt-wheels/
