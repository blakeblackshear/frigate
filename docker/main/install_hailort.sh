#!/bin/bash

set -euxo pipefail

if [[ "${TARGETARCH}" == "amd64" ]]; then
    arch="x86_64"
elif [[ "${TARGETARCH}" == "arm64" ]]; then
    arch="aarch64"
fi

wget -qO- "https://github.com/${HAILORT_GIT_REPO}/releases/download/v${HAILORT_VERSION}/hailort-debian12-${TARGETARCH}.tar.gz" | tar -C / -xzf -
wget -P /wheels/ "https://github.com/${HAILORT_GIT_REPO}/releases/download/v${HAILORT_VERSION}/hailort-${HAILORT_VERSION}-cp311-cp311-linux_${arch}.whl"
