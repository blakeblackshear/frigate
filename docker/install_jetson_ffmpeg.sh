#!/bin/bash

set -euxo pipefail

if [[ "${TARGETARCH}" == "arm64" ]]; then
    echo "deb https://repo.download.nvidia.com/jetson/ffmpeg main main" | tee /etc/apt/sources.list.d/jetson_ffmpeg.list
    echo "deb-src https://repo.download.nvidia.com/jetson/ffmpeg main main" | tee /etc/apt/sources.list/jetson_ffmpeg.list
    apt-get -qq update
    apt-get -qq install --no-install-recommends --no-install-suggests -y ffmpeg
fi

rm -rf /var/lib/apt/lists/*

