#!/bin/bash

set -euxo pipefail

go2rtc_version="1.9.14"

# sha256 digests of the release binaries; update when bumping go2rtc_version.
declare -A go2rtc_checksums=(
    ["amd64"]="32d616af226bd731678ffde328b94cfb94e30339bfefc469cfb76323144615a6"
    ["arm64"]="359fabade8a7a51e81a55fe6df6b0ef81764a5e1d63179577534eaaa71904b50"
)

dest_dir="/rootfs/usr/local/go2rtc/bin"
mkdir -p "${dest_dir}"

wget -qO "${dest_dir}/go2rtc" \
    "https://github.com/AlexxIT/go2rtc/releases/download/v${go2rtc_version}/go2rtc_linux_${TARGETARCH}"
echo "${go2rtc_checksums[${TARGETARCH}]}  ${dest_dir}/go2rtc" | sha256sum -c -
chmod 755 "${dest_dir}/go2rtc"
