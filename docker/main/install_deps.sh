
#!/bin/bash

set -euxo pipefail

apt-get -qq update

apt-get -qq install --no-install-recommends -y \
    apt-transport-https \
    gnupg \
    wget \
    procps vainfo \
    unzip locales tzdata libxml2 xz-utils \
    python3.9 \
    python3-pip \
    curl \
    lsof \
    jq \
    nethogs

# ensure python3 defaults to python3.9
update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.9 1

mkdir -p -m 600 /root/.gnupg

# add coral repo
curl -fsSLo - https://packages.cloud.google.com/apt/doc/apt-key.gpg | \
    gpg --dearmor -o /etc/apt/trusted.gpg.d/google-cloud-packages-archive-keyring.gpg
echo "deb https://packages.cloud.google.com/apt coral-edgetpu-stable main" | tee /etc/apt/sources.list.d/coral-edgetpu.list
echo "libedgetpu1-max libedgetpu/accepted-eula select true" | debconf-set-selections

# enable non-free repo in Debian
if grep -q "Debian" /etc/issue; then
    sed -i -e's/ main/ main contrib non-free/g' /etc/apt/sources.list
fi

# coral drivers
apt-get -qq update
apt-get -qq install --no-install-recommends --no-install-suggests -y \
    libedgetpu1-max python3-tflite-runtime python3-pycoral

# btbn-ffmpeg -> amd64
if [[ "${TARGETARCH}" == "amd64" ]]; then
    mkdir -p /usr/lib/ffmpeg/5.0
    mkdir -p /usr/lib/ffmpeg/7.0
    wget -qO btbn-ffmpeg.tar.xz "https://github.com/NickM-27/FFmpeg-Builds/releases/download/autobuild-2022-07-31-12-37/ffmpeg-n5.1-2-g915ef932a3-linux64-gpl-5.1.tar.xz"
    tar -xf btbn-ffmpeg.tar.xz -C /usr/lib/ffmpeg/5.0 --strip-components 1
    rm -rf btbn-ffmpeg.tar.xz /usr/lib/ffmpeg/5.0/doc /usr/lib/ffmpeg/5.0/bin/ffplay
    wget -qO btbn-ffmpeg.tar.xz "https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2024-09-30-15-36/ffmpeg-n7.1-linux64-gpl-7.1.tar.xz"
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
    wget -qO btbn-ffmpeg.tar.xz "https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2024-09-30-15-36/ffmpeg-n7.1-linuxarm64-gpl-7.1.tar.xz"
    tar -xf btbn-ffmpeg.tar.xz -C /usr/lib/ffmpeg/7.0 --strip-components 1
    rm -rf btbn-ffmpeg.tar.xz /usr/lib/ffmpeg/7.0/doc /usr/lib/ffmpeg/7.0/bin/ffplay
fi

# arch specific packages
if [[ "${TARGETARCH}" == "amd64" ]]; then
    # use debian bookworm for amd / intel-i965 driver packages
    echo 'deb https://deb.debian.org/debian bookworm main contrib non-free' >/etc/apt/sources.list.d/debian-bookworm.list
    apt-get -qq update
    apt-get -qq install --no-install-recommends --no-install-suggests -y \
        i965-va-driver intel-gpu-tools onevpl-tools \
        libva-drm2 \
        mesa-va-drivers radeontop

    # something about this dependency requires it to be installed in a separate call rather than in the line above
    apt-get -qq install --no-install-recommends --no-install-suggests -y \
        i965-va-driver-shaders

    rm -f /etc/apt/sources.list.d/debian-bookworm.list

    # use intel apt intel packages
    wget -qO - https://repositories.intel.com/gpu/intel-graphics.key | gpg --yes --dearmor --output /usr/share/keyrings/intel-graphics.gpg
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/intel-graphics.gpg] https://repositories.intel.com/gpu/ubuntu jammy client" | tee /etc/apt/sources.list.d/intel-gpu-jammy.list
    apt-get -qq update
    apt-get -qq install --no-install-recommends --no-install-suggests -y \
        intel-opencl-icd intel-level-zero-gpu intel-media-va-driver-non-free \
        libmfx1 libmfxgen1 libvpl2

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
