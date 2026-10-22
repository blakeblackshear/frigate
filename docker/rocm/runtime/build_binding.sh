#!/bin/bash
# Match Frigate's CPython ABI using the same pinned MIGraphX source as the core.
set -euo pipefail
test ! -e /dev/kfd
test ! -e /dev/dri
export CMAKE_BUILD_PARALLEL_LEVEL="${BUILD_JOBS:-2}"
export LD_LIBRARY_PATH=/opt/rocm/lib:/opt/rocm/lib/migraphx/lib
mkdir -p /work/migraphx /work/pybind11 /work/binding
tar -xzf /inputs/sources/migraphx.tar.gz --strip-components=1 -C /work/migraphx
tar -xzf /inputs/sources/pybind11.tar.gz --strip-components=1 -C /work/pybind11
cmake -S /work/pybind11 -B /work/pybind11-build \
    -DCMAKE_INSTALL_PREFIX=/opt/pybind11 -DPYBIND11_TEST=OFF
cmake --install /work/pybind11-build
cp /work/migraphx/src/py/migraphx_py.cpp /work/binding/
cp /recipes/CMakeLists.source.txt /work/binding/CMakeLists.txt
cmake -G Ninja -S /work/binding -B /work/binding-build \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_INSTALL_PREFIX=/opt/rocm \
    -Dpybind11_DIR=/opt/pybind11/share/cmake/pybind11
cmake --build /work/binding-build
cmake --install /work/binding-build
