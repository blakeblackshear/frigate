#!/bin/bash

set -euxo pipefail

hailo_version="4.21.0"

# sha256 digests of the release artifacts; update when bumping hailo_version.
# The runtime tarball is keyed by TARGETARCH, the wheel by the python arch tag.
declare -A hailort_checksums=(
    ["amd64"]="0a57ac5f7cc8c2c3668133189d9285b55f498e8cb219797e203f6f5015fec4b3"
    ["arm64"]="dd840548eb5d0d147c99aee2cb013d39d64be09c5bc63061171fcfacf4547b3f"
    ["x86_64"]="8112a973ab48095399b29d883f31987828df5861b8553f614c89f098a67b3fb6"
    ["aarch64"]="658432a43573280d472f6402d7934669effe7f163ba3dffa31c50bbeeaa7c01d"
)

if [[ "${TARGETARCH}" == "amd64" ]]; then
    arch="x86_64"
elif [[ "${TARGETARCH}" == "arm64" ]]; then
    arch="aarch64"
fi

# downloaded rather than streamed into tar because streaming and verifying the
# digest before extraction are mutually exclusive
wget -qO /tmp/hailort.tar.gz "https://github.com/frigate-nvr/hailort/releases/download/v${hailo_version}/hailort-debian12-${TARGETARCH}.tar.gz"
echo "${hailort_checksums[${TARGETARCH}]}  /tmp/hailort.tar.gz" | sha256sum -c -
tar -C / -xzf /tmp/hailort.tar.gz
rm -f /tmp/hailort.tar.gz

wheel="/wheels/hailort-${hailo_version}-cp311-cp311-linux_${arch}.whl"
mkdir -p /wheels
wget -qO "${wheel}" "https://github.com/frigate-nvr/hailort/releases/download/v${hailo_version}/hailort-${hailo_version}-cp311-cp311-linux_${arch}.whl"
echo "${hailort_checksums[${arch}]}  ${wheel}" | sha256sum -c -
