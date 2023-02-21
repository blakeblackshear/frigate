#!/bin/bash

set -euxo pipefail

s6_version="3.1.4.1"

if [[ "${TARGETARCH}" == "amd64" ]]; then
    s6_arch="x86_64"
elif [[ "${TARGETARCH}" == "arm" ]]; then
    s6_arch="armhf"
elif [[ "${TARGETARCH}" == "arm64" ]]; then
    s6_arch="aarch64"
fi

mkdir -p /rootfs/

wget -qO- "https://github.com/just-containers/s6-overlay/releases/download/v${s6_version}/s6-overlay-noarch.tar.xz" |
    tar -C /rootfs/ -Jxpf -

wget -qO- "https://github.com/just-containers/s6-overlay/releases/download/v${s6_version}/s6-overlay-${s6_arch}.tar.xz" |
    tar -C /rootfs/ -Jxpf -
