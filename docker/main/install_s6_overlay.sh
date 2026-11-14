#!/bin/bash

set -euxo pipefail

s6_version="3.2.1.0"

# sha256 digests of the release artifacts, from the .sha256 files published at
# https://github.com/just-containers/s6-overlay/releases/tag/v3.2.1.0
# Update these when bumping s6_version.
declare -A s6_checksums=(
    ["noarch"]="42e038a9a00fc0fef70bf0bc42f625a9c14f8ecdfe77d4ad93281edf717e10c5"
    ["x86_64"]="8bcbc2cada58426f976b159dcc4e06cbb1454d5f39252b3bb0c778ccf71c9435"
    ["aarch64"]="c8fd6b1f0380d399422fc986a1e6799f6a287e2cfa24813ad0b6a4fb4fa755cc"
)

if [[ "${TARGETARCH}" == "amd64" ]]; then
    s6_arch="x86_64"
elif [[ "${TARGETARCH}" == "arm64" ]]; then
    s6_arch="aarch64"
fi

mkdir -p /rootfs/

download_and_extract() {
    local arch="$1"
    local tarball="/tmp/s6-overlay-${arch}.tar.xz"
    wget -qO "${tarball}" \
        "https://github.com/just-containers/s6-overlay/releases/download/v${s6_version}/s6-overlay-${arch}.tar.xz"
    echo "${s6_checksums[${arch}]}  ${tarball}" | sha256sum -c -
    tar -C /rootfs/ -Jxpf "${tarball}"
    rm -f "${tarball}"
}

download_and_extract "noarch"
download_and_extract "${s6_arch}"
