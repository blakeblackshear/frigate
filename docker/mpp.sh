#!/bin/bash

set -euxo pipefail

apt-get -qq update
apt install -y pkg-config

if [ -e /usr/local/include/mpp/mpp.h ] || [ -e /usr/include/mpp/mpp.h ] || pkg-config --exists rockchip-mpp; then
    HAS_MPP=1
else
# Install mpp from sources
apt-get -qq update
# TODO: move all apt-get installs to dedicated script for having it in a single Docker layer = performance of reruns.
apt-get install -y git build-essential yasm pkg-config \
libtool coreutils autoconf automake build-essential cmake \
doxygen git graphviz imagemagick libasound2-dev libass-dev \
libavcodec-dev libavdevice-dev libavfilter-dev libavformat-dev \
libavutil-dev libfreetype6-dev libgmp-dev libmp3lame-dev \
libopencore-amrnb-dev libopencore-amrwb-dev libopus-dev \
librtmp-dev libsdl2-dev libsdl2-image-dev libsdl2-mixer-dev \
libsdl2-net-dev libsdl2-ttf-dev libsnappy-dev libsoxr-dev \
libssh-dev libssl-dev libtool libv4l-dev libva-dev libvdpau-dev \
libvo-amrwbenc-dev libvorbis-dev libwebp-dev libx264-dev libx265-dev \
libxcb-shape0-dev libxcb-shm0-dev libxcb-xfixes0-dev libxcb1-dev \
libxml2-dev lzma-dev meson nasm pkg-config python3-dev \
python3-pip texinfo wget yasm zlib1g-dev libdrm-dev libaom-dev libdav1d-dev \
libmp3lame-dev

cd /tmp
git clone https://github.com/rockchip-linux/mpp.git
cd mpp
mkdir build || true && cd build

ARCH=$(uname -m)
EXTRA_CFLAGS=""
EXTRA_CXXFLAGS=""

if [ "$ARCH" = "aarch64" ]; then
    EXTRA_CFLAGS="-march=armv8-a+crc"
    EXTRA_CXXFLAGS="-march=armv8-a+crc"
fi

cmake -DCMAKE_INSTALL_PREFIX=/usr/local -DCMAKE_C_FLAGS="${EXTRA_CFLAGS}" -DCMAKE_CXX_FLAGS="${EXTRA_CXXFLAGS}" ../
make -j$(nproc)
make install
ldconfig

fi

# TODO: consider moving ffmpeg compillation to a dedicated ffmpeg.sh script
if command -v ffmpeg >/dev/null 2>&1; then
    HAS_FFMPEG=1
else
    HAS_FFMPEG=0
fi

if [[ "${HAS_FFMPEG}" == 1 ]]; then
# To avoid possible race condition.
    apt -y remove ffmpeg
fi
# Compile ffmpeg

cd /tmp
git clone https://github.com/FFmpeg/FFmpeg.git
cd FFmpeg

ARCH=$(uname -m)
EXTRA_CFLAGS="-I/usr/local/include"
EXTRA_LDFLAGS="-L/usr/local/lib"

if [ "$ARCH" = "aarch64" ]; then
    EXTRA_CFLAGS="${EXTRA_CFLAGS} -march=armv8-a+crc"
fi

PKG_CONFIG_PATH="/usr/local/lib/pkgconfig" ./configure \
    --enable-rkmpp \
    --extra-cflags="${EXTRA_CFLAGS}" \
    --extra-ldflags="${EXTRA_LDFLAGS}" \
    --extra-libs="-lpthread -lm -latomic" \
    --arch=arm64 \
    --enable-gmp \
    --enable-gpl \
    --enable-libaom \
    --enable-libass \
    --enable-libdav1d \
    --enable-libdrm \
    --enable-libfreetype \
    --enable-libmp3lame \
    --enable-libopencore-amrnb \
    --enable-libopencore-amrwb \
    --enable-libopus \
    --enable-librtmp \
    --enable-libsnappy \
    --enable-libsoxr \
    --enable-libssh \
    --enable-libvorbis \
    --enable-libwebp \
    --enable-libx264 \
    --enable-libx265 \
    --enable-libxml2 \
    --enable-nonfree \
    --enable-version3 \
    --target-os=linux \
    --enable-pthreads \
    --enable-openssl \
    --enable-hardcoded-tables

make -j$(nproc)
make install
ldconfig

cd /tmp
rm -rf mpp
rm -rf FFmpeg
