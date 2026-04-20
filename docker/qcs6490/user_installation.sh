#!/bin/bash
#
# Host-side setup for the Qualcomm Hexagon NPU detector on a Radxa Dragon Q6A
# (or other QCS6490 board). Installs:
#   - fastrpc user-space (libcdsprpc.so, cdsprpcd, fastrpc_test)
#   - Radxa firmware that ships the cDSP image + skel libs the QNN HTP
#     backend dlopens at runtime
#   - a transient cdsprpcd systemd service
# and disables hexagonrpcd, which holds the fastrpc devices and conflicts.
#
# Run with sudo. Logs out + back in are required for the fastrpc group to
# take effect for your user.

set -euo pipefail

if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (sudo $0)"
    exit 1
fi

ARCH=$(dpkg --print-architecture)
if [ "$ARCH" != "arm64" ]; then
    echo "This script targets arm64 (QCS6490). Detected: $ARCH"
    exit 1
fi

apt-get update
apt-get install -y --no-install-recommends ca-certificates curl

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

# fastrpc user-space (provides libcdsprpc.so + cdsprpcd). Not in apt.
FASTRPC_VER=1.0.4-1
echo "==> Installing fastrpc ${FASTRPC_VER}"
for pkg in fastrpc fastrpc-tools; do
    curl -fsSL -o "${WORKDIR}/${pkg}.deb" \
        "https://github.com/radxa-pkg/fastrpc/releases/download/${FASTRPC_VER}/${pkg}_${FASTRPC_VER}_arm64.deb"
done
apt-get install -y "${WORKDIR}/fastrpc.deb" "${WORKDIR}/fastrpc-tools.deb"

# Radxa QCS6490 firmware (provides /usr/lib/dsp/cdsp/{cdsp.mbn,*_skel.so,...}
# and /usr/lib/rfsa/adsp/, both required by the cDSP at runtime).
RADXA_FW_VER=0.2.29
echo "==> Installing radxa-firmware-qcs6490 ${RADXA_FW_VER}"
curl -fsSL -o "${WORKDIR}/radxa-firmware-qcs6490.deb" \
    "https://github.com/radxa-pkg/radxa-firmware/releases/download/${RADXA_FW_VER}/radxa-firmware-qcs6490_${RADXA_FW_VER}_all.deb"
apt-get install -y "${WORKDIR}/radxa-firmware-qcs6490.deb"

# hexagonrpcd from the apt 'hexagonrpcd' package conflicts with cdsprpcd by
# holding /dev/fastrpc-* exclusively. We need cdsprpcd for QNN HTP.
echo "==> Disabling conflicting hexagonrpcd services"
for unit in hexagonrpcd hexagonrpcd-suspend hexagonrpcd-resume; do
    systemctl disable --now "${unit}" 2>/dev/null || true
done

echo "==> Enabling cdsprpcd"
cat >/etc/systemd/system/cdsprpcd.service <<'UNIT'
[Unit]
Description=Qualcomm cDSP FastRPC daemon
After=local-fs.target

[Service]
Type=simple
ExecStart=/usr/bin/cdsprpcd
Restart=always

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now cdsprpcd

# Allow non-root containers + users to open /dev/fastrpc-*.
echo "==> Adding invoking user to fastrpc group"
TARGET_USER="${SUDO_USER:-$USER}"
if [ -n "${TARGET_USER}" ] && id "${TARGET_USER}" >/dev/null 2>&1; then
    usermod -aG fastrpc "${TARGET_USER}"
fi

echo
echo "Hexagon NPU host setup complete."
echo "Log out and back in for fastrpc group membership to take effect, then:"
echo "  docker run ... ghcr.io/blakeblackshear/frigate:stable-qcs6490"
echo "Pass these to the container (devices, group, env):"
echo "  --device /dev/fastrpc-cdsp --device /dev/fastrpc-cdsp-secure"
echo "  --device /dev/fastrpc-adsp --device /dev/dma_heap/system"
echo "  --group-add \$(getent group fastrpc | cut -d: -f3)"
echo "  -v /usr/lib/dsp:/usr/lib/dsp:ro -v /usr/lib/rfsa:/usr/lib/rfsa:ro"
