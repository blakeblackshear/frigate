#!/bin/bash

set -euxo pipefail

# Intel media driver is x86_64-only. Create empty rootfs on other arches so
# the downstream COPY --from has a valid source.
if [ "$(uname -m)" != "x86_64" ]; then
    mkdir -p /rootfs
    exit 0
fi

MEDIA_DRIVER_VERSION="intel-media-25.2.6"
GMMLIB_VERSION="intel-gmmlib-22.7.2"

apt-get -qq update
apt-get -qq install -y wget gnupg ca-certificates cmake g++ make pkg-config ccache

export CCACHE_DIR=/root/.ccache
export PATH="/usr/lib/ccache:$PATH"
ccache --max-size=2G
ccache --zero-stats

# Use Intel's jammy repo for newer libva-dev (2.22) which provides the
# VVC/VVC-decode headers required by media-driver 25.x
wget -qO - https://repositories.intel.com/gpu/intel-graphics.key | gpg --yes --dearmor --output /usr/share/keyrings/intel-graphics.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/intel-graphics.gpg] https://repositories.intel.com/gpu/ubuntu jammy client" > /etc/apt/sources.list.d/intel-gpu-jammy.list
apt-get -qq update
apt-get -qq install -y libva-dev

# Build gmmlib (required by media-driver)
wget -qO gmmlib.tar.gz "https://github.com/intel/gmmlib/archive/refs/tags/${GMMLIB_VERSION}.tar.gz"
mkdir /tmp/gmmlib
tar -xf gmmlib.tar.gz -C /tmp/gmmlib --strip-components 1
cmake -S /tmp/gmmlib -B /tmp/gmmlib/build -DCMAKE_BUILD_TYPE=Release
make -C /tmp/gmmlib/build -j"$(nproc)"
make -C /tmp/gmmlib/build install

# Build intel-media-driver
wget -qO media-driver.tar.gz "https://github.com/intel/media-driver/archive/refs/tags/${MEDIA_DRIVER_VERSION}.tar.gz"
mkdir /tmp/media-driver
tar -xf media-driver.tar.gz -C /tmp/media-driver --strip-components 1
cmake -S /tmp/media-driver -B /tmp/media-driver/build \
    -DCMAKE_BUILD_TYPE=Release \
    -DENABLE_KERNELS=ON \
    -DENABLE_NONFREE_KERNELS=ON \
    -DCMAKE_INSTALL_PREFIX=/usr \
    -DCMAKE_INSTALL_LIBDIR=/usr/lib/x86_64-linux-gnu \
    -DCMAKE_C_FLAGS="-Wno-error" \
    -DCMAKE_CXX_FLAGS="-Wno-error"
make -C /tmp/media-driver/build -j"$(nproc)"

# Install driver to rootfs for COPY --from
make -C /tmp/media-driver/build install DESTDIR=/rootfs

ccache --show-stats
