#!/bin/bash

# Installs the DEEPX NPU kernel driver and the DX-RT runtime on the Docker host,
# then enables the vendor's dxrt.service. A container cannot load kernel
# modules, so this runs outside the image; the driver creates the /dev/dxrt*
# nodes and the daemon multiplexes the NPU across host and container.
#
# Driver, runtime (v3.4.0) and NPU firmware (v2.7.4) must agree or inference
# hangs instead of failing at startup; 3.4.0 needs driver 2.5.0, firmware 2.7.0.
#
# DEEPX NPU support in Frigate is maintained by Sixfab (https://sixfab.com).

set -euo pipefail

driver_version="v2.6.0"
# the commit the tag resolves to, since DEEPX signs neither tags nor releases
# and this is compiled and installed as root. Update both together
driver_commit="7074748e7104f470b02f517583abba652b3f05fa"
firmware_version="v2.7.4"

sudo apt-get update
sudo apt-get install -y git build-essential "linux-headers-$(uname -r)" pciutils wget

if ! lspci -d 1ff4: | grep -q .; then
    echo "No DEEPX device found on the PCIe bus (lspci -d 1ff4:)."
    echo "Check that the module is seated correctly before continuing."
    exit 1
fi

# fetch the pinned commit rather than cloning the tag, so a retag cannot swap
# in different source
mkdir dx_rt_npu_linux_driver
cd dx_rt_npu_linux_driver
git init -q
git remote add origin https://github.com/DEEPX-AI/dx_rt_npu_linux_driver.git
git fetch --depth 1 origin "${driver_commit}"
git checkout -q FETCH_HEAD

fetched_commit=$(git rev-parse HEAD)
if [[ "${fetched_commit}" != "${driver_commit}" ]]; then
    echo "Fetched commit ${fetched_commit} does not match pinned driver_commit ${driver_commit}."
    echo "Refusing to build unverified driver source."
    exit 1
fi

cd modules

sudo ./build.sh -c install --reload

sudo depmod -A

# dx_dma is the PCIe transport, dxrt_driver the NPU driver on top of it
for module in dx_dma dxrt_driver; do
    if ! sudo modprobe "${module}"; then
        echo "Unable to load the ${module} kernel module, common reasons are:"
        echo "- Secure Boot is enabled and is rejecting the unsigned module."
        echo "- The running kernel does not match the installed linux-headers."
        exit 1
    fi
done

if ! compgen -G "/dev/dxrt*" > /dev/null; then
    echo "Modules loaded but no /dev/dxrt* device node appeared."
    echo "Run ./sanity_check.sh from the driver repo to diagnose."
    exit 1
fi

runtime_version="v3.4.0"
declare -A runtime_sha256=(
    [amd64]="736cfef009ce9e974ab1ab610d867239d19d72a426a53e367ddcbd53297b6e20"
    [arm64]="eb6107f5f02f2ad76ae89f414e8b5f346f34fbc6f0888236136853a26be6f6a0"
)

runtime_release="${runtime_version#v}"
deb_arch=$(dpkg --print-architecture)
deb_file="/tmp/libdxrt-bin_${runtime_release}_${deb_arch}.deb"

wget -qO "${deb_file}" \
    "https://raw.githubusercontent.com/DEEPX-AI/dx_rt/${runtime_version}/release/${runtime_release}/libdxrt-bin_${runtime_release}_${deb_arch}.deb"

expected_sha256="${runtime_sha256[${deb_arch}]:-}"
if [[ -z "${expected_sha256}" ]]; then
    echo "No pinned SHA-256 for architecture ${deb_arch}; refusing to install."
    exit 1
fi
if [[ "$(sha256sum "${deb_file}" | cut -d' ' -f1)" != "${expected_sha256}" ]]; then
    echo "SHA-256 mismatch for ${deb_file}; refusing to install."
    exit 1
fi

sudo dpkg -i "${deb_file}"
sudo ldconfig
rm -f "${deb_file}"

sudo cp /usr/share/libdxrt-bin/service/dxrt.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now dxrt.service

if ! sudo systemctl is-active --quiet dxrt.service; then
    echo "dxrt.service did not start. Check: sudo journalctl -u dxrt.service"
    exit 1
fi

echo "DEEPX driver and runtime installation complete."
echo "Driver version:   $(modinfo -F version dxrt_driver) (expected ${driver_version#v})"
echo "Runtime version:  ${runtime_release}"
echo "Device node(s):   $(echo /dev/dxrt*)"
echo
echo "This driver expects NPU firmware ${firmware_version}. Check it with:"
echo "  dxrt-cli --status"
echo "Update the module if it does not match before starting Frigate."
