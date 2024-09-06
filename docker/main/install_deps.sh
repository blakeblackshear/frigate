#!/bin/bash

set -euxo pipefail

DEBIAN_FRONTEND=noninteractive
export DEBIAN_FRONTEND

apt-get -qq update

apt-get -qq install --no-install-recommends -y \
    apt-transport-https \
    gnupg \
    wget \
    procps vainfo \
    unzip locales tzdata libxml2 xz-utils \
    python3 \
    python3-pip \
    curl \
    jq \
    nethogs

mkdir -p -m 600 /root/.gnupg

# add coral repo
curl -fsSLo - https://packages.cloud.google.com/apt/doc/apt-key.gpg | \
    gpg --dearmor -o /etc/apt/trusted.gpg.d/google-cloud-packages-archive-keyring.gpg
echo "deb https://packages.cloud.google.com/apt coral-edgetpu-stable main" > /etc/apt/sources.list.d/coral-edgetpu.list
echo "libedgetpu1-max libedgetpu/accepted-eula select true" | debconf-set-selections

# enable non-free repo in Debian
if grep -q "Debian" /etc/issue; then
    sed -i -e's/ main/ main contrib non-free non-free-firmware/g' /etc/apt/sources.list.d/debian.sources
    echo "deb https://cdn-aws.deb.debian.org/debian unstable main contrib non-free non-free-firmware" > /etc/apt/sources.list.d/debian-unstable.list
    {
        echo 'Package: *'
        echo 'Pin: release a=unstable'
        echo 'Pin-Priority: 300'
    } > /etc/apt/preferences.d/unstable
fi

# coral drivers
apt-get -qq update
apt-get -y install --no-install-recommends --no-install-suggests libedgetpu1-max python3-numpy

# Google have abandoned the Coral Edge TPU and the version of pycoral in their repo only works with Python 3.9.
# The open source community have stepped up and have updated pycoral to work with newer versions of TFLite and Python.
# See: https://github.com/google-coral/pycoral/issues/85#issuecomment-2282233714

case "${TARGETARCH}" in
    amd64)
        tflite_wheel=https://github.com/feranick/TFlite-builds/releases/download/v2.17.0/tflite_runtime-2.17.0-cp312-cp312-linux_x86_64.whl
        pycoral_wheel=https://github.com/feranick/pycoral/releases/download/2.0.2TF2.17.0/pycoral-2.0.2-cp312-cp312-linux_x86_64.whl
        ;;
    arm64)
        tflite_wheel=https://github.com/feranick/TFlite-builds/releases/download/v2.17.0/tflite_runtime-2.17.0-cp312-cp312-linux_aarch64.whl
        pycoral_wheel=https://github.com/feranick/pycoral/releases/download/2.0.2TF2.17.0/pycoral-2.0.2-cp312-cp312-linux_aarch64.whl
        ;;
    *)
        echo Pycoral is not supported on target architecture "${TARGETARCH}". 1>&2
        exit 1
        ;;
esac

pip install --break-system-packages "${tflite_wheel}"
pip install --break-system-packages "${pycoral_wheel}"
    
# arch specific packages
case "${TARGETARCH}" in
    amd64)
        apt -y -qq install --no-install-recommends --no-install-suggests \
            intel-opencl-icd \
            mesa-va-drivers radeontop libva-drm2 intel-media-va-driver-non-free i965-va-driver libmfx1 intel-gpu-tools
        # something about this dependency requires it to be installed in a separate call rather than in the line above
        apt -y -qq install --no-install-recommends --no-install-suggests \
            i965-va-driver-shaders
        ;;
    arm64)
        apt -y -qq install --no-install-recommends --no-install-suggests \
            libva-drm2 mesa-va-drivers
        ;;
esac

# install vulkan
apt-get -qq install --no-install-recommends --no-install-suggests -y \
    libvulkan1 mesa-vulkan-drivers

apt-get -y purge gnupg apt-transport-https xz-utils
apt-get -y clean autoclean
apt-get -y autoremove --purge
rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

# Install yq, for frigate-prepare and go2rtc echo source
curl -fsSL \
    "https://github.com/mikefarah/yq/releases/download/v4.33.3/yq_linux_$(dpkg --print-architecture)" \
    --output /usr/local/bin/yq
chmod +x /usr/local/bin/yq
