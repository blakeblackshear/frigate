#!/bin/bash
# Build the direct MIGraphX stack and native legacy BLAS from locked inputs.
set -euo pipefail
test ! -e /dev/kfd
test ! -e /dev/dri
ulimit -s unlimited
prefix=/opt/owned-deps
export CMAKE_BUILD_PARALLEL_LEVEL="${BUILD_JOBS:-12}"
export PYTHONPATH="$prefix/sdk"
mkdir -p "$prefix/sdk" /work /opt/cmake

# Use AMD's package expansion code, without pip resolution or GPU discovery.
python3 - <<'PY'
import shutil
import os
import tarfile
import zipfile
from pathlib import Path

sdk = Path('/opt/owned-deps/sdk')
if not (sdk / '.expanded').exists():
    for path in sorted(Path('/inputs/sdk').glob('*.whl')):
        with zipfile.ZipFile(path) as wheel:
            wheel.extractall(sdk)
            for entry in wheel.infolist():
                mode = entry.external_attr >> 16 & 0o777
                if mode and not entry.is_dir():
                    os.chmod(sdk / entry.filename, mode)
    with tarfile.open('/inputs/sdk/rocm-10.1.0.tar.gz') as archive:
        source = next(member.name.rsplit('/src/rocm_sdk/', 1)[0] for member in archive
                      if '/src/rocm_sdk/' in member.name)
        archive.extractall('/work/sdk-source')
    shutil.copytree(Path('/work/sdk-source') / source / 'src/rocm_sdk',
                    sdk / 'rocm_sdk', dirs_exist_ok=True)
PY
python3 -m rocm_sdk init
touch "$prefix/sdk/.expanded"
ln -sfn "$prefix/sdk/_rocm_sdk_devel" /opt/rocm
export ROCM_PATH=/opt/rocm
export HIP_PATH=/opt/rocm
export PATH="/opt/cmake/bin:/opt/rocm/bin:/opt/rocm/lib/llvm/bin:$PATH"
export CC=/opt/rocm/bin/amdclang
export CXX=/opt/rocm/bin/amdclang++
export LD_LIBRARY_PATH="$prefix/lib:/opt/rocm/lib:/opt/rocm/lib/llvm/lib"
tar -xzf /inputs/sources/cmake.tar.gz --strip-components=1 -C /opt/cmake

extract() {
    local name="$1" source_hash
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
        -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX="$prefix" \
        -DCMAKE_INSTALL_LIBDIR=lib -DCMAKE_POSITION_INDEPENDENT_CODE=ON \
        -DCMAKE_PREFIX_PATH="$prefix;/opt/rocm" \
        -DCMAKE_EXPORT_COMPILE_COMMANDS=ON "$@"
}
install_project() {
    local name="$1"
    shift
    configure "$name" "$@"
    cmake --build "/work/$name-build"
    cmake --install "/work/$name-build"
}

install_project rocm-cmake-10.1
install_project pybind11 -DPYBIND11_TEST=OFF
# Keep the direct API-6 compiler used by MIGraphX, with its generic GCN path.
# This is a pinned classic rocMLIR build, not the crashing Triton provider.
extract rocmlir
grep -q 'MLIR_MIGRAPHX_DIALECT_API_VERSION 6' /work/rocmlir/mlir/include/mlir-c/Dialect/MIGraphX.h
configure rocmlir \
    -DBUILD_FAT_LIBROCKCOMPILER=ON \
    -DLLVM_TARGETS_TO_BUILD=AMDGPU \
    -DLLVM_INCLUDE_TESTS=OFF -DMLIR_INCLUDE_TESTS=OFF \
    -DLLVM_BUILD_TESTS=OFF -DLLVM_BUILD_EXAMPLES=OFF \
    -DLLVM_INCLUDE_EXAMPLES=OFF -DLLVM_INCLUDE_BENCHMARKS=OFF \
    -DLLVM_ENABLE_ASSERTIONS=OFF -DMLIR_ENABLE_ROCM_RUNNER=OFF \
    -DROCMLIR_ENABLE_NATIVE_ARCH=OFF -DROCMLIR_BUILD_TUNING_DRIVER=OFF \
    -DROCMLIR_PARALLEL_COMPILE_JOBS= -DROCMLIR_PARALLEL_LINK_JOBS= \
    -DLLVM_PARALLEL_LINK_JOBS= -DLLVM_USE_LINKER=lld \
    -DGPU_TARGETS=gfx90c
cmake --build /work/rocmlir-build --target librockCompiler
cmake --install /work/rocmlir-build/mlir/tools/rocmlir-lib

install_project abseil -DABSL_ENABLE_INSTALL=ON -DABSL_BUILD_TESTING=OFF \
    -DABSL_PROPAGATE_CXX_STD=ON -DBUILD_SHARED_LIBS=OFF
install_project protobuf -Dprotobuf_BUILD_TESTS=OFF -Dprotobuf_BUILD_SHARED_LIBS=OFF \
    -Dprotobuf_ABSL_PROVIDER=package -DCMAKE_CXX_STANDARD=17
install_project json -DJSON_BuildTests=OFF -DCMAKE_POLICY_VERSION_MINIMUM=3.5
install_project half
install_project msgpack -DMSGPACK_BUILD_TESTS=OFF -DMSGPACK_BUILD_EXAMPLES=OFF \
    -DCMAKE_POLICY_VERSION_MINIMUM=3.5
extract sqlite
(cd /work/sqlite && ./configure --prefix="$prefix" --disable-static --soname=legacy)
rm -f /work/sqlite/libsqlite3.so
make -C /work/sqlite -j "$CMAKE_BUILD_PARALLEL_LEVEL"
make -C /work/sqlite install
install_project onednn -DDNNL_BUILD_EXAMPLES=OFF -DDNNL_BUILD_TESTS=OFF \
    -DDNNL_CPU_RUNTIME=OMP -DDNNL_ARCH_OPT_FLAGS=-march=znver2 \
    -DONEDNN_BUILD_GRAPH=ON

# CMake equivalents of the community rmake.py legacy profile. Point directly
# at the pinned in-tree Tensile package and system Python dependencies; avoid
# rmake's floating pip virtual environment and network dependency acquisition.
extract rocm-libraries
python3 /recipes/retarget_logic.py
tensile=/work/rocm-libraries/shared/tensile/Tensile
test -f "$tensile/cmake/TensileConfig.cmake"
export PYTHONPATH="/work/rocm-libraries/shared/tensile:$PYTHONPATH"
cmake -G Ninja -S /work/rocm-libraries/projects/rocblas -B /work/rocblas-build \
    -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX="$prefix" \
    -DCMAKE_INSTALL_LIBDIR=lib -DCMAKE_PREFIX_PATH="$prefix;/opt/rocm" \
    -DCMAKE_CXX_COMPILER="$CXX" -DROCM_PATH=/opt/rocm \
    -DGPU_TARGETS=gfx90c -DBUILD_WITH_TENSILE=ON -DBUILD_WITH_HIPBLASLT=OFF \
    -DBUILD_WITH_PIP=OFF -DTensile_DIR="$tensile/cmake" -DTensile_ROOT="$tensile" \
    -DTensile_NO_ENUMERATE=ON -DTensile_CPU_THREADS="$CMAKE_BUILD_PARALLEL_LEVEL" \
    -DTensile_ARCHITECTURE=gfx90c -DTensile_LOGIC=asm_full \
    -DTensile_LAZY_LIBRARY_LOADING=ON -DTensile_SEPARATE_ARCHITECTURES=ON \
    -DTensile_LIBRARY_FORMAT=msgpack -DTensile_CODE_OBJECT_VERSION=default \
    -DTensile_MERGE_FILES=ON \
    -DBUILD_CLIENTS_TESTS=OFF -DBUILD_CLIENTS_BENCHMARKS=OFF \
    -DBUILD_CLIENTS_SAMPLES=OFF
cmake --build /work/rocblas-build
cmake --install /work/rocblas-build

extract migraphx
patch_hash=$(sha256sum /recipes/migraphx-rocblas-only.patch | cut -d ' ' -f 1)
if [ "$(cat /work/migraphx/.legacy-patch-applied 2>/dev/null || true)" != "$patch_hash" ]; then
    if test -f /work/migraphx/.legacy-patch-applied; then
        rm -rf /work/migraphx /work/migraphx-build
        extract migraphx
    fi
    patch --batch --fuzz=0 -p1 -d /work/migraphx < /recipes/migraphx-rocblas-only.patch
    printf '%s\n' "$patch_hash" > /work/migraphx/.legacy-patch-applied
fi
configure migraphx \
    -DCMAKE_INSTALL_RPATH='/opt/rocm/lib/migraphx/lib;/opt/rocm/lib;/opt/rocm/lib/llvm/lib' \
    -DGPU_TARGETS=gfx90c -DBUILD_TESTING=OFF \
    -DMIGRAPHX_ENABLE_CPU=ON -DMIGRAPHX_ENABLE_GPU=ON \
    -DMIGRAPHX_ENABLE_MLIR=ON -DMIGRAPHX_ENABLE_PYTHON=ON \
    -DMIGRAPHX_ENABLE_TENSORFLOW=ON -DMIGRAPHX_ENABLE_ONNX=ON \
    -DPYTHON_VERSIONS=3.11 \
    -DMIGRAPHX_USE_MIOPEN=ON -DMIGRAPHX_USE_ROCBLAS=ON \
    -DMIGRAPHX_USE_HIPBLASLT=OFF -DMIGRAPHX_USE_COMPOSABLEKERNEL=OFF \
    -DMIGRAPHX_USE_EIGEN=OFF -DMIGRAPHX_USE_AMDMLSS=OFF
grep -q -- '-DMIGRAPHX_MLIR' /work/migraphx-build/build.ninja
cmake --build /work/migraphx-build
cmake --install /work/migraphx-build

mkdir -p "$prefix/share/frigate"
cp /recipes/source-lock.json "$prefix/share/frigate/"
cp /recipes/migraphx-rocblas-only.patch "$prefix/share/frigate/"
for name in migraphx rocmlir rocblas; do
    cp "/work/$name-build/CMakeCache.txt" "$prefix/share/frigate/$name-CMakeCache.txt"
done
cp /work/rocmlir/LICENSE "$prefix/share/frigate/rocmlir-LICENSE"
cp /work/rocmlir/external/llvm-project/llvm/LICENSE.TXT "$prefix/share/frigate/LLVM-LICENSE"
cp /work/migraphx/LICENSE "$prefix/share/frigate/MIGraphX-LICENSE"
cp /work/rocm-libraries/projects/rocblas/LICENSE.md "$prefix/share/frigate/rocBLAS-LICENSE"
for name in rocm-cmake-10.1 abseil protobuf json half pybind11 msgpack sqlite onednn; do
    mkdir -p "$prefix/share/frigate/licenses/$name"
    for notice in "/work/$name"/LICENSE* "/work/$name"/COPYING* "/work/$name"/NOTICE*; do
        if [ -f "$notice" ]; then
            cp "$notice" "$prefix/share/frigate/licenses/$name/"
        fi
    done
done
mkdir -p "$prefix/share/frigate/licenses/tensile"
cp /work/rocm-libraries/shared/tensile/LICENSE* "$prefix/share/frigate/licenses/tensile/"
dpkg-query -W -f='${Package}\t${Version}\n' > "$prefix/share/frigate/builder-packages.tsv"
