#!/bin/bash

set -euxo pipefail

apt-get -qq update

apt-get -qq install --no-install-recommends -y \
    apt-transport-https \
    gnupg \
    wget \
    lbzip2 \
    procps vainfo \
    unzip locales tzdata libxml2 xz-utils \
    python3 \
    python3-pip \
    curl \
    lsof \
    jq \
    nethogs \
    libgl1 \
    libglib2.0-0 \
    libusb-1.0.0

mkdir -p -m 600 /root/.gnupg

# install coral runtime
wget -q -O /tmp/libedgetpu1-max.deb "https://github.com/feranick/libedgetpu/releases/download/16.0TF2.17.1-1/libedgetpu1-max_16.0tf2.17.1-1.bookworm_${TARGETARCH}.deb"
unset DEBIAN_FRONTEND
yes | dpkg -i /tmp/libedgetpu1-max.deb && export DEBIAN_FRONTEND=noninteractive
rm /tmp/libedgetpu1-max.deb

# install python3 & tflite runtime
if [[ "${TARGETARCH}" == "amd64" ]]; then
    pip3 install --break-system-packages https://github.com/frigate-nvr/TFlite-builds/releases/download/v2.17.1/tflite_runtime-2.17.1-cp311-cp311-linux_x86_64.whl
fi

if [[ "${TARGETARCH}" == "arm64" ]]; then
    pip3 install --break-system-packages https://github.com/feranick/TFlite-builds/releases/download/v2.17.1/tflite_runtime-2.17.1-cp311-cp311-linux_aarch64.whl
fi

# btbn-ffmpeg -> amd64
if [[ "${TARGETARCH}" == "amd64" ]]; then
    mkdir -p /usr/lib/ffmpeg/5.0
    mkdir -p /usr/lib/ffmpeg/7.0
    wget -qO btbn-ffmpeg.tar.xz "https://github.com/NickM-27/FFmpeg-Builds/releases/download/autobuild-2022-07-31-12-37/ffmpeg-n5.1-2-g915ef932a3-linux64-gpl-5.1.tar.xz"
    tar -xf btbn-ffmpeg.tar.xz -C /usr/lib/ffmpeg/5.0 --strip-components 1
    rm -rf btbn-ffmpeg.tar.xz /usr/lib/ffmpeg/5.0/doc /usr/lib/ffmpeg/5.0/bin/ffplay
    wget -qO btbn-ffmpeg.tar.xz "https://github.com/NickM-27/FFmpeg-Builds/releases/download/autobuild-2024-09-19-12-51/ffmpeg-n7.0.2-18-g3e6cec1286-linux64-gpl-7.0.tar.xz"
    tar -xf btbn-ffmpeg.tar.xz -C /usr/lib/ffmpeg/7.0 --strip-components 1
    rm -rf btbn-ffmpeg.tar.xz /usr/lib/ffmpeg/7.0/doc /usr/lib/ffmpeg/7.0/bin/ffplay
fi

# ffmpeg -> arm64
if [[ "${TARGETARCH}" == "arm64" ]]; then
    mkdir -p /usr/lib/ffmpeg/5.0
    mkdir -p /usr/lib/ffmpeg/7.0
    wget -qO btbn-ffmpeg.tar.xz "https://github.com/NickM-27/FFmpeg-Builds/releases/download/autobuild-2022-07-31-12-37/ffmpeg-n5.1-2-g915ef932a3-linuxarm64-gpl-5.1.tar.xz"
    tar -xf btbn-ffmpeg.tar.xz -C /usr/lib/ffmpeg/5.0 --strip-components 1
    rm -rf btbn-ffmpeg.tar.xz /usr/lib/ffmpeg/5.0/doc /usr/lib/ffmpeg/5.0/bin/ffplay
    wget -qO btbn-ffmpeg.tar.xz "https://github.com/NickM-27/FFmpeg-Builds/releases/download/autobuild-2024-09-19-12-51/ffmpeg-n7.0.2-18-g3e6cec1286-linuxarm64-gpl-7.0.tar.xz"
    tar -xf btbn-ffmpeg.tar.xz -C /usr/lib/ffmpeg/7.0 --strip-components 1
    rm -rf btbn-ffmpeg.tar.xz /usr/lib/ffmpeg/7.0/doc /usr/lib/ffmpeg/7.0/bin/ffplay
fi

# arch specific packages
if [[ "${TARGETARCH}" == "amd64" ]]; then
    # install amd / intel-i965 driver packages
    apt-get -qq install --no-install-recommends --no-install-suggests -y \
        i965-va-driver intel-gpu-tools onevpl-tools \
        libva-drm2 \
        mesa-va-drivers radeontop

    # intel packages use zst compression so we need to update dpkg
    apt-get install -y dpkg

    # use intel apt intel packages
    wget -qO - https://repositories.intel.com/gpu/intel-graphics.key | gpg --yes --dearmor --output /usr/share/keyrings/intel-graphics.gpg
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/intel-graphics.gpg] https://repositories.intel.com/gpu/ubuntu jammy client" | tee /etc/apt/sources.list.d/intel-gpu-jammy.list
    apt-get -qq update
    apt-get -qq install --no-install-recommends --no-install-suggests -y \
        intel-opencl-icd=24.35.30872.31-996~22.04 intel-level-zero-gpu=1.3.29735.27-914~22.04 intel-media-va-driver-non-free=24.3.3-996~22.04 \
        libmfx1=23.2.2-880~22.04 libmfxgen1=24.2.4-914~22.04 libvpl2=1:2.13.0.0-996~22.04

    rm -f /usr/share/keyrings/intel-graphics.gpg
    rm -f /etc/apt/sources.list.d/intel-gpu-jammy.list
fi

if [[ "${TARGETARCH}" == "arm64" ]]; then
    apt-get -qq install --no-install-recommends --no-install-suggests -y \
        libva-drm2 mesa-va-drivers radeontop
fi

# install vulkan
apt-get -qq install --no-install-recommends --no-install-suggests -y \
    libvulkan1 mesa-vulkan-drivers

apt-get purge gnupg apt-transport-https xz-utils -y
apt-get clean autoclean -y
apt-get autoremove --purge -y
rm -rf /var/lib/apt/lists/*

# Install yq, for frigate-prepare and go2rtc echo source
curl -fsSL \
    "https://github.com/mikefarah/yq/releases/download/v4.33.3/yq_linux_$(dpkg --print-architecture)" \
    --output /usr/local/bin/yq
chmod +x /usr/local/bin/yq
