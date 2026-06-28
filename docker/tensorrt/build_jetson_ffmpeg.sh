#!/bin/bash

# For jetson platforms, build ffmpeg with custom patches. NVIDIA supplies a deb
# with accelerated decoding, but it doesn't have accelerated scaling or encoding

set -euxo pipefail

INSTALL_PREFIX=/rootfs/usr/lib/ffmpeg/jetson

apt-get -qq update
apt-get -qq install -y --no-install-recommends build-essential ccache clang cmake pkg-config unzip
apt-get -qq install -y --no-install-recommends libx264-dev libx265-dev

pushd /tmp

CUDA_MAJOR=""
if [ -f /usr/local/cuda/version.json ]; then
    CUDA_MAJOR="$(grep -m1 -oE '"version"[[:space:]]*:[[:space:]]*"[^"]+"' /usr/local/cuda/version.json | sed -E 's/.*"([0-9]+)\..*/\1/' || true)"
fi
if [ -z "${CUDA_MAJOR}" ] && compgen -G "/usr/local/cuda-13*" > /dev/null; then
    CUDA_MAJOR=13
fi
if [ -z "${CUDA_MAJOR}" ] && command -v nvcc > /dev/null 2>&1; then
    CUDA_MAJOR="$(nvcc --version | sed -nE 's/.*release ([0-9]+)\..*/\1/p' | head -n1 || true)"
fi

# Tracks whether this is the JP7/R39 path, so the ffmpeg build below can link the real R39
# tegra multimedia libs instead of the stale jetson-ffmpeg stubs (see TEGRA_LIB_DIR usage).
JETSON_R39=0
TEGRA_LIB_DIR=/usr/lib/aarch64-linux-gnu/nvidia

# Install libnvmpi to enable nvmpi decoders (h264_nvmpi, hevc_nvmpi)
if [[ "${CUDA_MAJOR}" = "13" || -n "${L4T_APT_RELEASE:-}" || -n "${JETSON_SOC_REPO:-}" ]]; then
    JETSON_R39=1
    L4T_APT_RELEASE=${L4T_APT_RELEASE:-r39.2}
    JETSON_SOC_REPO=${JETSON_SOC_REPO:-som}

    apt-key adv --fetch-key https://repo.download.nvidia.com/jetson/jetson-ota-public.asc
    {
        echo "deb https://repo.download.nvidia.com/jetson/common ${L4T_APT_RELEASE} main"
        echo "deb https://repo.download.nvidia.com/jetson/${JETSON_SOC_REPO} ${L4T_APT_RELEASE} main"
        echo "deb https://repo.download.nvidia.com/jetson/ffmpeg ${L4T_APT_RELEASE} main"
    } >> /etc/apt/sources.list.d/nvidia-l4t-apt-source.list

    mkdir -p /opt/nvidia/l4t-packages/
    touch /opt/nvidia/l4t-packages/.nv-l4t-disable-boot-fw-update-in-preinstall

    apt-get update
    apt-get -qq install -y --no-install-recommends -o Dpkg::Options::="--force-confold" nvidia-l4t-jetson-multimedia-api

    require_jetson_file() {
        local description="$1"
        local pattern="$2"
        shift 2
        local directory
        local found

        # Match case-insensitively: R39.2 (JP7) renamed the multimedia headers to all-lowercase
        # (e.g. nvbufsurftransform.h) while older L4T shipped CamelCase (NvBufSurfTransform.h). The
        # jetson-ffmpeg build's nvUtils2NvBuf.h includes the lowercase names, so the lowercase
        # headers (present on R39.2) satisfy the build; only this validation gate was casing-strict.
        for directory in "$@"; do
            found="$(find "${directory}" -type f -iname "${pattern}" -print -quit 2> /dev/null || true)"
            if [ -n "${found}" ]; then
                echo "${description}: ${found}"
                return 0
            fi
        done

        echo "Missing ${description}" >&2
        return 1
    }

    require_jetson_file "Jetson multimedia header NvBufSurface.h" "NvBufSurface.h" /usr/src/jetson_multimedia_api /usr/include
    require_jetson_file "Jetson multimedia header NvBufSurfTransform.h" "NvBufSurfTransform.h" /usr/src/jetson_multimedia_api /usr/include
    require_jetson_file "Jetson multimedia library libnvbufsurface" "libnvbufsurface.so*" /usr/lib /usr/local/lib
    require_jetson_file "Jetson multimedia library libnvbufsurftransform" "libnvbufsurftransform.so*" /usr/lib /usr/local/lib
elif [ -e /usr/local/cuda-12 ]; then
    # assume Jetpack 6.2
    apt-key adv --fetch-key https://repo.download.nvidia.com/jetson/jetson-ota-public.asc
    {
        echo "deb https://repo.download.nvidia.com/jetson/common r36.4 main"
        echo "deb https://repo.download.nvidia.com/jetson/t234 r36.4 main"
        echo "deb https://repo.download.nvidia.com/jetson/ffmpeg r36.4 main"
    } >> /etc/apt/sources.list.d/nvidia-l4t-apt-source.list

    mkdir -p /opt/nvidia/l4t-packages/
    touch /opt/nvidia/l4t-packages/.nv-l4t-disable-boot-fw-update-in-preinstall

    apt-get update
    apt-get -qq install -y --no-install-recommends -o Dpkg::Options::="--force-confold" nvidia-l4t-jetson-multimedia-api
elif [ -e /usr/local/cuda-10.2 ]; then
    # assume Jetpack 4.X
    wget -q https://developer.nvidia.com/embedded/L4T/r32_Release_v5.0/T186/Jetson_Multimedia_API_R32.5.0_aarch64.tbz2 -O jetson_multimedia_api.tbz2
    tar xaf jetson_multimedia_api.tbz2 -C / && rm jetson_multimedia_api.tbz2
else
    # assume Jetpack 5.X
    wget -q https://developer.nvidia.com/downloads/embedded/l4t/r35_release_v3.1/release/jetson_multimedia_api_r35.3.1_aarch64.tbz2 -O jetson_multimedia_api.tbz2
    tar xaf jetson_multimedia_api.tbz2 -C / && rm jetson_multimedia_api.tbz2
fi

wget -q https://github.com/AndBobsYourUncle/jetson-ffmpeg/archive/9c17b09.zip -O jetson-ffmpeg.zip
unzip jetson-ffmpeg.zip && rm jetson-ffmpeg.zip && mv jetson-ffmpeg-* jetson-ffmpeg && cd jetson-ffmpeg
# On R39/JP7 the real tegra multimedia libs ARE installed (by nvidia-l4t-jetson-multimedia-api),
# living in /usr/lib/aarch64-linux-gnu/nvidia. The 2023-era jetson-ffmpeg stubs predate R39 and
# lack newer symbols (e.g. NvBufSurfaceGetDeviceInfo), so libnvmpi.so links with an unresolved
# reference and ffmpeg's later `-lnvmpi` configure test fails. Put the real lib dir ahead of the
# stubs so libnvmpi resolves against R39's libnvbufsurface. Those real libs in turn need the CUDA
# driver (libcuda.so.1) and the CUDA runtime libs, which are only present at container RUNTIME via
# the nvidia runtime — so for the build-time link we point -rpath-link at the CUDA *stubs* dir
# (libcuda.so stub) and the CUDA lib dir. Pre-R39 keeps the stubs-only path.
if [ "${JETSON_R39}" = "1" ]; then
    CUDA_STUBS_DIR="$(dirname "$(find /usr/local/cuda*/targets/*/lib/stubs -name libcuda.so 2>/dev/null | head -n1)")"
    CUDA_LIB_DIR="$(dirname "$(find /usr/local/cuda*/targets/*/lib -maxdepth 1 -name 'libcudart.so*' 2>/dev/null | head -n1)")"
    # The CUDA stub ships only unversioned libcuda.so, but R39's libnvbufsurface.so.1.0.0 records a
    # NEEDED entry for the versioned soname libcuda.so.1. -rpath-link looks up that exact soname, so
    # without a libcuda.so.1 the transitive cu* driver symbols stay unresolved at link time. Provide
    # a build-only versioned symlink to the stub (real libcuda.so.1 is injected at container runtime).
    CUDA_SONAME_DIR=/tmp/cuda-soname-compat
    mkdir -p "${CUDA_SONAME_DIR}"
    if [ -n "${CUDA_STUBS_DIR}" ]; then
        ln -sf "${CUDA_STUBS_DIR}/libcuda.so" "${CUDA_SONAME_DIR}/libcuda.so.1"
        ln -sf "${CUDA_STUBS_DIR}/libcuda.so" "${CUDA_SONAME_DIR}/libcuda.so"
    fi
    export LD_LIBRARY_PATH=${TEGRA_LIB_DIR}:${CUDA_SONAME_DIR}:${CUDA_STUBS_DIR}:${CUDA_LIB_DIR}:$(pwd)/stubs:${LD_LIBRARY_PATH:-}
    EXTRA_NVMPI_LDFLAGS="-L${TEGRA_LIB_DIR} -Wl,-rpath-link,${TEGRA_LIB_DIR}"
    [ -n "${CUDA_STUBS_DIR}" ] && EXTRA_NVMPI_LDFLAGS="${EXTRA_NVMPI_LDFLAGS} -L${CUDA_STUBS_DIR} -Wl,-rpath-link,${CUDA_STUBS_DIR} -L${CUDA_SONAME_DIR} -Wl,-rpath-link,${CUDA_SONAME_DIR}"
    [ -n "${CUDA_LIB_DIR}" ] && EXTRA_NVMPI_LDFLAGS="${EXTRA_NVMPI_LDFLAGS} -Wl,-rpath-link,${CUDA_LIB_DIR}"
else
    export LD_LIBRARY_PATH=$(pwd)/stubs:${LD_LIBRARY_PATH:-}   # tegra multimedia libs aren't available in image, so use stubs for ffmpeg build
    EXTRA_NVMPI_LDFLAGS=""
fi
mkdir build
cd build
cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=$INSTALL_PREFIX ${EXTRA_NVMPI_LDFLAGS:+-DCMAKE_SHARED_LINKER_FLAGS="${EXTRA_NVMPI_LDFLAGS}"}
make -j"$(nproc)"
make install
cd ../../

# Install nv-codec-headers to enable ffnvcodec filters (scale_cuda)
wget -q https://github.com/FFmpeg/nv-codec-headers/archive/refs/heads/master.zip
unzip master.zip && rm master.zip && cd nv-codec-headers-master
make PREFIX=$INSTALL_PREFIX install
cd ../ && rm -rf nv-codec-headers-master

# Build ffmpeg with nvmpi patch
wget -q https://ffmpeg.org/releases/ffmpeg-6.0.tar.xz
tar xaf ffmpeg-*.tar.xz && rm ffmpeg-*.tar.xz && cd ffmpeg-*
patch -p1 < ../jetson-ffmpeg/ffmpeg_patches/ffmpeg6.0_nvmpi.patch
export PKG_CONFIG_PATH=$INSTALL_PREFIX/lib/pkgconfig
# On R39/JP7, ffmpeg's `-lnvmpi` configure probe (and final link) must see the real tegra libs in
# /usr/lib/aarch64-linux-gnu/nvidia AND the CUDA driver/runtime stubs to resolve everything libnvmpi
# transitively pulls in (NvBufSurfaceGetDeviceInfo from libnvbufsurface, and that lib's own
# libcuda.so.1 / cu* driver-API deps). Reuse the same link flags assembled for the libnvmpi build
# (TEGRA + CUDA stubs + CUDA lib dirs). Pre-R39 leaves configure flags unchanged.
FFMPEG_EXTRA_LDFLAGS=""
if [ "${JETSON_R39}" = "1" ]; then
    FFMPEG_EXTRA_LDFLAGS="${EXTRA_NVMPI_LDFLAGS}"
fi
# enable Jetson codecs but disable dGPU codecs
./configure --cc='ccache gcc' --cxx='ccache g++' \
            --enable-shared --disable-static --prefix=$INSTALL_PREFIX \
            --enable-gpl --enable-libx264  --enable-libx265 \
            --enable-nvmpi --enable-ffnvcodec --enable-cuda-llvm \
            --disable-cuvid --disable-nvenc --disable-nvdec \
            ${FFMPEG_EXTRA_LDFLAGS:+--extra-ldflags="${FFMPEG_EXTRA_LDFLAGS}"} \
    || { cat ffbuild/config.log && false; }
make -j"$(nproc)"
make install
cd ../

rm -rf /var/lib/apt/lists/*
popd
