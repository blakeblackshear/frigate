#!/bin/bash

set -euxo pipefail

if [[ "${TARGETARCH}" == "amd64" ]]; then
    arch="x86_64"
elif [[ "${TARGETARCH}" == "arm64" ]]; then
    arch="aarch64"
fi

wget -qO- "https://github.com/GaryHuang-ASUS/frigate-synaptics-rt/releases/download/v1.5.0-1.0/synaptics-rt-1.0.tar" | tar -C / -xzf -
wget -P /wheels/ "https://github.com/synaptics-synap/synap-python/releases/download/v0.0.4-preview/synap_python-0.0.4-cp311-cp311-manylinux_2_35_aarch64.whl"

