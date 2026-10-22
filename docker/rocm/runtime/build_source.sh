#!/bin/bash
# Build the documented legacy stack from cached, hash-verified inputs.
set -euo pipefail

test ! -e /dev/kfd
test ! -e /dev/dri
export CMAKE_BUILD_PARALLEL_LEVEL="${BUILD_JOBS:-2}"
export PATH="/opt/cmake/bin:/opt/rocm/llvm/bin:${PATH}"
export CC=/opt/rocm/llvm/bin/clang
export CXX=/opt/rocm/llvm/bin/clang++
export LD_LIBRARY_PATH="/opt/owned-deps/lib:/opt/rocm/lib:${LD_LIBRARY_PATH:-}"
prefix=/opt/owned-deps
mkdir -p /work /opt/cmake "$prefix"
tar -xzf /inputs/sources/cmake.tar.gz --strip-components=1 -C /opt/cmake
# Retain Gary's correction for an obsolete absolute link path in MIOpen's
# package metadata. The pinned CMake already supports hipBLASLt's block syntax.
sed -i 's,;/usr/lib/x86_64-linux-gnu/librt.so,,g' \
    /opt/rocm/lib/cmake/miopen/miopen-targets.cmake

extract() {
    local name="$1"
    local source_hash
    source_hash=$(sha256sum "/inputs/sources/$name.tar.gz" | cut -d ' ' -f 1)
    if [ "$(cat "/work/$name/.source-extracted" 2>/dev/null || true)" != "$source_hash" ]; then
        rm -rf "/work/$name" "/work/$name-build"
        mkdir -p "/work/$name"
        tar -xzf "/inputs/sources/$name.tar.gz" --strip-components=1 -C "/work/$name"
        printf '%s\n' "$source_hash" > "/work/$name/.source-extracted"
    fi
}

configure() {
    local name="$1"
    shift
    extract "$name"
    cmake -G Ninja -S "/work/$name" -B "/work/$name-build" \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_INSTALL_PREFIX="$prefix" \
        -DCMAKE_INSTALL_LIBDIR=lib \
        -DCMAKE_PREFIX_PATH="$prefix;/opt/rocm" \
        -DCMAKE_POSITION_INDEPENDENT_CODE=ON \
        -DCMAKE_EXPORT_COMPILE_COMMANDS=ON "$@"
}

install_project() {
    local name="$1"
    shift
    printf '\nBuilding pinned dependency: %s\n' "$name"
    configure "$name" "$@"
    cmake --build "/work/$name-build"
    cmake --install "/work/$name-build"
}

# Match the release's classic rocMLIR backend, rather than the 10.1 provider.
install_project rocm-cmake-7.2
extract rocmlir
grep -q 'MLIR_MIGRAPHX_DIALECT_API_VERSION 4' \
    /work/rocmlir/mlir/include/mlir-c/Dialect/MIGraphX.h
configure rocmlir \
    -DBUILD_FAT_LIBROCKCOMPILER=ON \
    -DLLVM_INCLUDE_TESTS=OFF \
    -DLLVM_INCLUDE_BENCHMARKS=OFF \
    -DLLVM_INCLUDE_EXAMPLES=OFF \
    -DLLVM_PARALLEL_LINK_JOBS= \
    -DROCMLIR_PARALLEL_LINK_JOBS= \
    -DLLVM_ENABLE_LLD=OFF \
    -DLLVM_USE_LINKER=lld \
    -DROCMLIR_DRIVER_TEST_GPU_VALIDATION=OFF
# The install rules also export this translation library outside the fat
# compiler's dependency closure.
cmake --build /work/rocmlir-build \
    --target librockCompiler GpuModuleToRocdlirTranslation
cmake --install /work/rocmlir-build

install_project abseil \
    -DABSL_ENABLE_INSTALL=ON -DABSL_BUILD_TESTING=OFF \
    -DABSL_PROPAGATE_CXX_STD=ON -DBUILD_SHARED_LIBS=OFF
install_project protobuf \
    -Dprotobuf_BUILD_TESTS=OFF -Dprotobuf_BUILD_SHARED_LIBS=OFF \
    -Dprotobuf_ABSL_PROVIDER=package -DCMAKE_CXX_STANDARD=17
install_project json -DJSON_BuildTests=OFF -DCMAKE_POLICY_VERSION_MINIMUM=3.5
install_project half
install_project pybind11 -DPYBIND11_TEST=OFF
install_project msgpack \
    -DMSGPACK_BUILD_TESTS=OFF -DMSGPACK_BUILD_EXAMPLES=OFF \
    -DCMAKE_POLICY_VERSION_MINIMUM=3.5
extract sqlite
# SQLite 3.50 omits its SONAME by default. Set it explicitly so consumers do
# not embed this build prefix as an absolute runtime dependency.
(cd /work/sqlite && ./configure --prefix="$prefix" --disable-static --soname=legacy)
rm -f /work/sqlite/libsqlite3.so
make -C /work/sqlite -j "$CMAKE_BUILD_PARALLEL_LEVEL"
make -C /work/sqlite install
# CK's JIT-only configuration still configures its tests. Supply its declared
# GoogleTest commit locally so configuration never needs a network connection.
extract googletest
install_project composable-kernel \
    -DCK_BUILD_JIT_LIB=ON -DBUILD_SHARED_LIBS=OFF \
    -DGOOGLETEST_DIR=/work/googletest \
    -DFETCHCONTENT_SOURCE_DIR_GOOGLETEST=/work/googletest
install_project onednn \
    -DDNNL_BUILD_EXAMPLES=OFF -DDNNL_BUILD_TESTS=OFF \
    -DDNNL_CPU_RUNTIME=OMP -DDNNL_ARCH_OPT_FLAGS=-march=znver2 \
    -DONEDNN_BUILD_GRAPH=ON

# Preserve Gary's target list and enabled backends for this first reproduction.
# Parallelism and test exclusion only bound the offline build's resources.
configure migraphx \
    '-DGPU_TARGETS=gfx900;gfx908;gfx90a;gfx942;gfx950;gfx1030;gfx1100;gfx1101;gfx1200;gfx1201' \
    -DBUILD_TESTING=OFF \
    -DMIGRAPHX_ENABLE_CPU=ON \
    -DMIGRAPHX_ENABLE_GPU=ON \
    -DMIGRAPHX_ENABLE_MLIR=ON \
    -DMIGRAPHX_ENABLE_PYTHON=OFF \
    -DMIGRAPHX_USE_MIOPEN=ON \
    -DMIGRAPHX_USE_ROCBLAS=ON \
    -DMIGRAPHX_USE_HIPBLASLT=ON \
    -DMIGRAPHX_USE_COMPOSABLEKERNEL=ON
cmake --build /work/migraphx-build
cmake --install /work/migraphx-build

mkdir -p "$prefix/share/frigate"
cp /recipes/source-lock.json "$prefix/share/frigate/"
cp /work/migraphx-build/CMakeCache.txt "$prefix/share/frigate/MIGraphX-CMakeCache.txt"
cp /work/rocmlir-build/CMakeCache.txt "$prefix/share/frigate/rocMLIR-CMakeCache.txt"
python3 - <<'PY'
import json
import os
from pathlib import Path

lock = json.loads(Path('/recipes/source-lock.json').read_text())
expected = lock['build_profile']
Path('/opt/owned-deps/share/frigate/binding-inputs.sha256').write_text(''.join(
    artifact['sha256'] + '  ' + artifact['path'] + '\n'
    for artifact in lock['artifacts'] if artifact['group'] == 'binding'
))
cache = {}
for line in Path('/work/migraphx-build/CMakeCache.txt').read_text().splitlines():
    if line.startswith(('#', '//')) or ':' not in line or '=' not in line:
        continue
    name, value = line.split('=', 1)
    cache[name.split(':', 1)[0]] = value
for name in ('MIGRAPHX_ENABLE_CPU', 'MIGRAPHX_ENABLE_GPU', 'MIGRAPHX_ENABLE_MLIR',
             'MIGRAPHX_USE_MIOPEN', 'MIGRAPHX_USE_ROCBLAS', 'MIGRAPHX_USE_HIPBLASLT',
             'MIGRAPHX_USE_COMPOSABLEKERNEL'):
    assert cache[name] == 'ON', (name, cache.get(name))
assert cache['GPU_TARGETS'].split(';') == expected['GPU_TARGETS']
Path('/opt/owned-deps/share/frigate/builder-resources.json').write_text(
    json.dumps({'compile_jobs': int(os.environ.get('BUILD_JOBS', '2')),
                'logical_cpus': os.cpu_count(), 'gpu_devices_exposed': False}, indent=2) + '\n'
)
PY
cp /work/rocmlir/LICENSE.TXT "$prefix/share/frigate/rocmlir-LICENSE"
cp /work/rocmlir/external/llvm-project/llvm/LICENSE.TXT "$prefix/share/frigate/LLVM-LICENSE"
cp /work/migraphx/LICENSE "$prefix/share/frigate/MIGraphX-LICENSE"
for name in rocm-cmake-7.2 abseil protobuf json half pybind11 msgpack sqlite googletest composable-kernel onednn; do
    mkdir -p "$prefix/share/frigate/licenses/$name"
    for notice in "/work/$name"/LICENSE* "/work/$name"/COPYING* "/work/$name"/NOTICE*; do
        if [ -f "$notice" ]; then
            cp "$notice" "$prefix/share/frigate/licenses/$name/"
        fi
    done
done
dpkg-query -W -f='${Package}\t${Version}\n' > "$prefix/share/frigate/builder-packages.tsv"
sha256sum "$prefix"/lib/libmigraphx*.so* > "$prefix/share/frigate/migraphx-binaries.sha256"
