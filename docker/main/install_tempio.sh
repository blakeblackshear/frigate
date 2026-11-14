#!/bin/bash

set -euxo pipefail

tempio_version="2021.09.0"

# sha256 digests of the release binaries; update when bumping tempio_version.
# Upstream publishes no checksums, so these come from a one-time fetch and
# guard against later substitution rather than the original download.
declare -A tempio_checksums=(
    ["amd64"]="b7b93ebfd24c1161cec7aecfad62ab51f2241149358cef354b86cdbc6a60546f"
    ["aarch64"]="3a5c32981ba68b75ed9b28497429e5a5cecbeb74c3b821b035a48b37609bb895"
)

if [[ "${TARGETARCH}" == "amd64" ]]; then
    arch="amd64"
elif [[ "${TARGETARCH}" == "arm64" ]]; then
    arch="aarch64"
fi

mkdir -p /rootfs/usr/local/tempio/bin

wget -q -O /rootfs/usr/local/tempio/bin/tempio "https://github.com/home-assistant/tempio/releases/download/${tempio_version}/tempio_${arch}"
echo "${tempio_checksums[${arch}]}  /rootfs/usr/local/tempio/bin/tempio" | sha256sum -c -
chmod 755 /rootfs/usr/local/tempio/bin/tempio
