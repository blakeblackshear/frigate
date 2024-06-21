#!/bin/bash

set -euxo pipefail

tempio_version="2021.09.0"

if [[ "${TARGETARCH}" == "amd64" ]]; then
    arch="amd64"
elif [[ "${TARGETARCH}" == "arm64" ]]; then
    arch="aarch64"
fi

mkdir -p /rootfs/usr/local/tempio/bin

wget -q -O /rootfs/usr/local/tempio/bin/tempio "https://github.com/home-assistant/tempio/releases/download/${tempio_version}/tempio_${arch}"
chmod 755 /rootfs/usr/local/tempio/bin/tempio
