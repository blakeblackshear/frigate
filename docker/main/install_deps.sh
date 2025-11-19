#!/bin/bash

set -euxo pipefail

apt-get -qq update

apt-get -qq install --no-install-recommends -y \
    apt-transport-https \
    ca-certificates \
    gnupg \
    wget \
    lbzip2 \
    procps vainfo \
    unzip locales tzdata libxml2 xz-utils \
    python3.11 \
    curl \
    lsof \
    jq \
    nethogs \
    libgl1 \
    libglib2.0-0 \
    libusb-1.0.0 \
    python3-h2 \
    libgomp1  # memryx detector

update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

mkdir -p -m 600 /root/.gnupg

# install coral runtime
wget -q -O /tmp/libedgetpu1-max.deb "https://github.com/feranick/libedgetpu/releases/download/16.0TF2.17.1-1/libedgetpu1-max_16.0tf2.17.1-1.bookworm_${TARGETARCH}.deb"
unset DEBIAN_FRONTEND
yes | dpkg -i /tmp/libedgetpu1-max.deb && export DEBIAN_FRONTEND=noninteractive
rm /tmp/libedgetpu1-max.deb

# install mesa-teflon-delegate from bookworm-backports
# Only available for arm64 at the moment
if [[ "${TARGETARCH}" == "arm64" ]]; then
    if [[ "${BASE_IMAGE}" == *"nvcr.io/nvidia/tensorrt"* ]]; then
        echo "Info: Skipping apt-get commands because BASE_IMAGE includes 'nvcr.io/nvidia/tensorrt' for arm64."
    else
        echo "deb http://deb.debian.org/debian bookworm-backports main" | tee /etc/apt/sources.list.d/bookworm-backbacks.list
        apt-get -qq update
        apt-get -qq install --no-install-recommends --no-install-suggests -y mesa-teflon-delegate/bookworm-backports
    fi
fi

# ffmpeg -> amd64
if [[ "${TARGETARCH}" == "amd64" ]]; then
    mkdir -p /usr/lib/ffmpeg/5.0
    wget -qO ffmpeg.tar.xz "https://github.com/NickM-27/FFmpeg-Builds/releases/download/autobuild-2022-07-31-12-37/ffmpeg-n5.1-2-g915ef932a3-linux64-gpl-5.1.tar.xz"
    tar -xf ffmpeg.tar.xz -C /usr/lib/ffmpeg/5.0 --strip-components 1 amd64/bin/ffmpeg amd64/bin/ffprobe
    rm -rf ffmpeg.tar.xz
    mkdir -p /usr/lib/ffmpeg/7.0
    wget -qO ffmpeg.tar.xz "https://github.com/NickM-27/FFmpeg-Builds/releases/download/autobuild-2024-09-19-12-51/ffmpeg-n7.0.2-18-g3e6cec1286-linux64-gpl-7.0.tar.xz"
    tar -xf ffmpeg.tar.xz -C /usr/lib/ffmpeg/7.0 --strip-components 1 amd64/bin/ffmpeg amd64/bin/ffprobe
    rm -rf ffmpeg.tar.xz
fi

# ffmpeg -> arm64
if [[ "${TARGETARCH}" == "arm64" ]]; then
    mkdir -p /usr/lib/ffmpeg/5.0
    wget -qO ffmpeg.tar.xz "https://github.com/NickM-27/FFmpeg-Builds/releases/download/autobuild-2022-07-31-12-37/ffmpeg-n5.1-2-g915ef932a3-linuxarm64-gpl-5.1.tar.xz"
    tar -xf ffmpeg.tar.xz -C /usr/lib/ffmpeg/5.0 --strip-components 1 arm64/bin/ffmpeg arm64/bin/ffprobe
    rm -f ffmpeg.tar.xz
    mkdir -p /usr/lib/ffmpeg/7.0
    wget -qO ffmpeg.tar.xz "https://github.com/NickM-27/FFmpeg-Builds/releases/download/autobuild-2024-09-19-12-51/ffmpeg-n7.0.2-18-g3e6cec1286-linuxarm64-gpl-7.0.tar.xz"
    tar -xf ffmpeg.tar.xz -C /usr/lib/ffmpeg/7.0 --strip-components 1 arm64/bin/ffmpeg arm64/bin/ffprobe
    rm -f ffmpeg.tar.xz
fi

# arch specific packages
if [[ "${TARGETARCH}" == "amd64" ]]; then
  # Install non-free version of i965 driver
  sed -i -E "/^Components: main$/s/main/main contrib non-free non-free-firmware/" "/etc/apt/sources.list.d/debian.sources" \
      && apt-get -qq update \
      && apt-get install --no-install-recommends --no-install-suggests -y i965-va-driver-shaders \
      && sed -i -E "/^Components: main contrib non-free non-free-firmware$/s/main contrib non-free non-free-firmware/main/" "/etc/apt/sources.list.d/debian.sources" \
      && apt-get update

    # install amd / intel-i965 driver packages
    apt-get -qq install --no-install-recommends --no-install-suggests -y \
        intel-gpu-tools onevpl-tools \
        libva-drm2 \
        mesa-va-drivers radeontop

    # intel packages use zst compression so we need to update dpkg
    apt-get install -y dpkg

    # use intel apt intel packages
    wget -qO - https://repositories.intel.com/gpu/intel-graphics.key | gpg --yes --dearmor --output /usr/share/keyrings/intel-graphics.gpg
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/intel-graphics.gpg] https://repositories.intel.com/gpu/ubuntu jammy client" | tee /etc/apt/sources.list.d/intel-gpu-jammy.list
    apt-get -qq update
    apt-get -qq install --no-install-recommends --no-install-suggests -y \
        intel-media-va-driver-non-free libmfx1 libmfxgen1 libvpl2

    apt-get -qq install -y ocl-icd-libopencl1

    # install libtbb12 for NPU support
    apt-get -qq install -y libtbb12

    rm -f /usr/share/keyrings/intel-graphics.gpg
    rm -f /etc/apt/sources.list.d/intel-gpu-jammy.list

    # install legacy and standard intel icd and level-zero-gpu
    # see https://github.com/intel/compute-runtime/blob/master/LEGACY_PLATFORMS.md for more info
    # needed core package
    wget https://github.com/intel/compute-runtime/releases/download/24.52.32224.5/libigdgmm12_22.5.5_amd64.deb
    dpkg -i libigdgmm12_22.5.5_amd64.deb
    rm libigdgmm12_22.5.5_amd64.deb

    # legacy packages
    wget https://github.com/intel/compute-runtime/releases/download/24.35.30872.36/intel-opencl-icd-legacy1_24.35.30872.36_amd64.deb
    wget https://github.com/intel/compute-runtime/releases/download/24.35.30872.36/intel-level-zero-gpu-legacy1_1.5.30872.36_amd64.deb
    wget https://github.com/intel/intel-graphics-compiler/releases/download/igc-1.0.17537.24/intel-igc-opencl_1.0.17537.24_amd64.deb
    wget https://github.com/intel/intel-graphics-compiler/releases/download/igc-1.0.17537.24/intel-igc-core_1.0.17537.24_amd64.deb
    # standard packages
    wget https://github.com/intel/compute-runtime/releases/download/24.52.32224.5/intel-opencl-icd_24.52.32224.5_amd64.deb
    wget https://github.com/intel/compute-runtime/releases/download/24.52.32224.5/intel-level-zero-gpu_1.6.32224.5_amd64.deb
    wget https://github.com/intel/intel-graphics-compiler/releases/download/v2.5.6/intel-igc-opencl-2_2.5.6+18417_amd64.deb
    wget https://github.com/intel/intel-graphics-compiler/releases/download/v2.5.6/intel-igc-core-2_2.5.6+18417_amd64.deb
    # npu packages
    wget https://github.com/oneapi-src/level-zero/releases/download/v1.21.9/level-zero_1.21.9+u22.04_amd64.deb
    wget https://github.com/intel/linux-npu-driver/releases/download/v1.17.0/intel-driver-compiler-npu_1.17.0.20250508-14912879441_ubuntu22.04_amd64.deb
    wget https://github.com/intel/linux-npu-driver/releases/download/v1.17.0/intel-fw-npu_1.17.0.20250508-14912879441_ubuntu22.04_amd64.deb
    wget https://github.com/intel/linux-npu-driver/releases/download/v1.17.0/intel-level-zero-npu_1.17.0.20250508-14912879441_ubuntu22.04_amd64.deb

    dpkg -i *.deb
    rm *.deb
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
    "https://github.com/mikefarah/yq/releases/download/v4.48.2/yq_linux_$(dpkg --print-architecture)" \
    --output /usr/local/bin/yq
chmod +x /usr/local/bin/yq
