#!/bin/bash

set -euxo pipefail

s6_arch="${TARGETARCH}"
if [[ "${TARGETARCH}" == "amd64" ]]; then
    s6_arch="amd64"
elif [[ "${TARGETARCH}" == "arm" ]]; then
    s6_arch="armhf"
elif [[ "${TARGETARCH}" == "arm64" ]]; then
    s6_arch="aarch64"
fi
wget -qO /tmp/s6-overlay-installer "https://github.com/just-containers/s6-overlay/releases/download/v2.2.0.3/s6-overlay-${s6_arch}-installer"
chmod +x /tmp/s6-overlay-installer
/tmp/s6-overlay-installer /rootfs/
