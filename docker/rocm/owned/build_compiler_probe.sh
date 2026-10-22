#!/bin/bash
# Exercise the same static compiler archive linked into MIGraphX.
set -euo pipefail
test ! -e /dev/kfd
test ! -e /dev/dri
prefix=/opt/owned-deps
if [ "$OWNED_PROFILE" = 101 ]; then
    ln -s "$prefix/sdk/_rocm_sdk_devel" /opt/rocm
    export CC=/opt/rocm/bin/amdclang
    export CXX=/opt/rocm/bin/amdclang++
    arch=gfx90c
else
    export CC=/opt/rocm/llvm/bin/clang
    export CXX=/opt/rocm/llvm/bin/clang++
    arch=gfx900
fi
export PATH="/opt/cmake/bin:/opt/rocm/bin:/opt/rocm/llvm/bin:/opt/rocm/lib/llvm/bin:$PATH"
export LD_LIBRARY_PATH="$prefix/lib:/opt/rocm/lib:/opt/rocm/lib/llvm/lib"
export CMAKE_BUILD_PARALLEL_LEVEL="${BUILD_JOBS:-12}"
mkdir -p /opt/cmake /work/compiler-probe-src /work/compiler-check
tar -xzf /inputs/sources/cmake.tar.gz --strip-components=1 -C /opt/cmake
cp /recipes/CMakeLists.compiler.txt /work/compiler-probe-src/CMakeLists.txt
cp /recipes/compiler-probe.cpp /work/compiler-probe-src/
cmake -G Ninja -S /work/compiler-probe-src -B /work/compiler-probe-build \
    -DCMAKE_BUILD_TYPE=Release -DCMAKE_PREFIX_PATH="$prefix;/opt/rocm" \
    -DCMAKE_EXE_LINKER_FLAGS=-fuse-ld=lld
cmake --build /work/compiler-probe-build
for dtype in fp32 fp16; do
    /work/compiler-probe-build/owned-compiler-probe "$arch" "$dtype" \
        "/work/compiler-check/$arch-$dtype.hsaco"
done
