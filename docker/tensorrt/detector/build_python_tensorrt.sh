#!/bin/bash

set -euxo pipefail

TENSORRT_PYTHON_BRANCH=${TENSORRT_PYTHON_BRANCH:-release/8.6}

if [[ -n "${TENSORRT_VER:-}" ]]; then
  TENSORRT_MAJOR_MINOR="${TENSORRT_VER%.*}"
  EXPECTED_TENSORRT_PYTHON_BRANCH="release/${TENSORRT_MAJOR_MINOR}"

  if [[ "${TENSORRT_PYTHON_BRANCH}" == "auto" ]]; then
    TENSORRT_PYTHON_BRANCH="${EXPECTED_TENSORRT_PYTHON_BRANCH}"
  elif [[ "${TENSORRT_PYTHON_BRANCH}" != "${EXPECTED_TENSORRT_PYTHON_BRANCH}" ]]; then
    echo "WARNING: TENSORRT_PYTHON_BRANCH=${TENSORRT_PYTHON_BRANCH} does not match TENSORRT_VER=${TENSORRT_VER}; auto would select ${EXPECTED_TENSORRT_PYTHON_BRANCH}" >&2
  fi
fi

mkdir -p /trt-wheels

if [[ "${TARGETARCH}" == "arm64" ]]; then

  # NVIDIA supplies python-tensorrt for python3.10, but frigate uses python3.11,
  # so we must build python-tensorrt ourselves.

  # Get python-tensorrt source
  mkdir -p /workspace
  cd /workspace
  git clone -b "${TENSORRT_PYTHON_BRANCH}" https://github.com/NVIDIA/TensorRT.git --depth=1

  # The TensorRT python build runs the legacy `setup.py bdist_wheel`, which on the JP7 base
  # otherwise resolves the deadsnakes/Debian system setuptools in /usr/lib/python3/dist-packages.
  # That copy's wheel.bdist_wheel routes through distutils `install` -> `install_lib`, whose
  # finalize_options reads a Debian-only `install_layout` option that the install command lacks
  # under this setuptools, crashing with "AttributeError: install_layout". Install a clean,
  # non-Debian setuptools+wheel into /usr/local (which python3.11 imports ahead of /usr/lib)
  # so bdist_wheel uses a consistent toolchain. JP6 already had a compatible setuptools.
  pip3 install --upgrade --ignore-installed 'setuptools>=70.1,<81' 'wheel>=0.43'

  # Collect dependencies
  EXT_PATH=/workspace/external && mkdir -p $EXT_PATH
  pip3 install pybind11 && ln -s /usr/local/lib/python3.11/dist-packages/pybind11 $EXT_PATH/pybind11
  ln -s /usr/include/python3.11 $EXT_PATH/python3.11

  # TensorRT 10's python onnx bindings (pyOnnx.cpp) #include onnx-tensorrt headers such as
  # errorHelpers.hpp that live ONLY in the parsers/onnx submodule (onnx-tensorrt), not in the
  # base image's system include or the shallow TensorRT clone. TRT 8.6 bindings did not need
  # these, so a lone NvOnnxParser.h symlink sufficed there. Populate the submodule at its pinned
  # ref so CMake's ONNX_INC_DIR=${TENSORRT_ROOT}/parsers/onnx resolves every header it needs.
  cd /workspace/TensorRT
  if git submodule update --init --depth=1 parsers/onnx 2>/dev/null && [[ -e parsers/onnx/errorHelpers.hpp ]]; then
    :
  else
    # Fallback: clone onnx-tensorrt at the branch recorded in .gitmodules for this TRT release.
    ONNX_TRT_BRANCH="$(git config -f .gitmodules submodule.parsers/onnx.branch || echo '')"
    rm -rf parsers/onnx
    git clone --depth=1 ${ONNX_TRT_BRANCH:+-b "${ONNX_TRT_BRANCH}"} https://github.com/onnx/onnx-tensorrt.git parsers/onnx
  fi
  # Prefer the system NvOnnxParser.h (matches the installed libnvonnxparser) when present.
  for header in /usr/include/aarch64-linux-gnu/NvOnnxParser.h /usr/include/NvOnnxParser.h; do
    if [[ -e "$header" ]]; then
      ln -sf "$header" /workspace/TensorRT/parsers/onnx/NvOnnxParser.h
      break
    fi
  done
  cd /workspace

  # Build wheel
  cd /workspace/TensorRT/python
  EXT_PATH=$EXT_PATH PYTHON_MAJOR_VERSION=3 PYTHON_MINOR_VERSION=11 TARGET_ARCHITECTURE=aarch64 TENSORRT_MODULE=tensorrt /bin/bash ./build.sh
  mv build/bindings_wheel/dist/*.whl /trt-wheels/

fi
