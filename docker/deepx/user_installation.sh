#!/bin/bash

# Installs the DEEPX NPU kernel driver on the Docker host.
#
# The driver has to be built and loaded on the host rather than in the Frigate
# container: containers share the host kernel, so a kernel module cannot be
# loaded from inside one. Once loaded it exposes the NPU as /dev/dxrt* device
# nodes, which are passed through to the container (see the DEEPX section of
# the installation docs).
#
# A DEEPX install has three separately versioned pieces that have to agree:
#
#   DX-RT runtime  v3.4.2  the Frigate image, docker/main/install_dxrt.sh
#   Kernel driver  v2.6.0  this file (provides dxrt_driver and dx_dma)
#   NPU firmware   v2.7.4  the module itself, flashed from the host
#
# DX-RT v3.4.2 requires driver 2.5.0 and firmware 2.7.0 as a minimum, so the
# versions pinned here sit above that floor. A mismatch is the most common
# cause of inference requests that are accepted but never complete, and it
# fails silently rather than at startup. This script only installs the driver:
# reading or flashing the firmware version requires the DX-RT runtime on the
# host, which conflicts with the copy Frigate runs in its container, so that is
# a separate manual step covered in the installation docs.
#
# DEEPX NPU support in Frigate is developed and maintained by Sixfab
# (https://sixfab.com).

set -euo pipefail

driver_version="v2.6.0"
firmware_version="v2.7.4"

sudo apt-get update
sudo apt-get install -y git build-essential "linux-headers-$(uname -r)" pciutils

if ! lspci -d 1ff4: | grep -q .; then
    echo "No DEEPX device found on the PCIe bus (lspci -d 1ff4:)."
    echo "Check that the module is seated correctly before continuing."
    exit 1
fi

git clone --depth 1 --branch "${driver_version}" \
    https://github.com/DEEPX-AI/dx_rt_npu_linux_driver.git
cd dx_rt_npu_linux_driver/modules

# --reload unloads any running modules and loads the newly built ones, so the
# NPU is usable without a reboot.
sudo ./build.sh -c install --reload

sudo depmod -A

# dx_dma is the PCIe transport, dxrt_driver is the NPU driver on top of it.
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

# dxrtd runs inside the Frigate container and may only run once per system, so
# a host copy left over from a runtime install has to be disabled.
if systemctl list-unit-files dxrt.service &> /dev/null; then
    echo "Disabling the host dxrt.service so the container can run dxrtd."
    sudo systemctl disable --now dxrt.service
fi

echo "DEEPX driver installation complete."
echo "Driver version: $(modinfo -F version dxrt_driver)"
echo "Device node(s): $(echo /dev/dxrt*)"
echo
echo "This driver expects NPU firmware ${firmware_version}. The firmware version"
echo "can only be read with the DX-RT runtime installed on the host, so check it"
echo "before starting Frigate, then remove the host runtime: Frigate runs its own"
echo "copy of dxrtd and only one may run per system."
