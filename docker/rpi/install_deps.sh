#!/bin/bash

set -euxo pipefail

apt-get -qq update

apt-get -qq install --no-install-recommends -y \
    apt-transport-https \
    gnupg \
    wget \
    procps vainfo \
    unzip locales tzdata libxml2 xz-utils \
    python3-pip \
    curl \
    jq \
    nethogs

mkdir -p -m 600 /root/.gnupg

# enable non-free repo
echo "deb http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware" | tee -a /etc/apt/sources.list
apt update

# ffmpeg -> arm64
if [[ "${TARGETARCH}" == "arm64" ]]; then
    # add raspberry pi repo
    gpg --no-default-keyring --keyring /usr/share/keyrings/raspbian.gpg --keyserver keyserver.ubuntu.com --recv-keys 82B129927FA3303E
    echo "deb [signed-by=/usr/share/keyrings/raspbian.gpg] https://archive.raspberrypi.org/debian/ bookworm main" | tee /etc/apt/sources.list.d/raspi.list
    apt-get -qq update
    apt-get -qq install --no-install-recommends --no-install-suggests -y ffmpeg
fi
