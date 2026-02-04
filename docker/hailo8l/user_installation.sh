#!/bin/bash

# Update package list and install dependencies
sudo apt-get update
sudo apt-get install -y build-essential cmake git wget linux-headers-$(uname -r)

hailo_version="4.21.0"
arch=$(uname -m)

if [[ $arch == "aarch64" ]]; then
    source /etc/os-release
    os_codename=$VERSION_CODENAME
    echo "Detected OS codename: $os_codename"
fi

if [ "$os_codename" = "trixie" ]; then
    sudo apt install -y dkms
fi

# Clone the HailoRT driver repository
git clone --depth 1 --branch v${hailo_version} https://github.com/hailo-ai/hailort-drivers.git

# Build and install the HailoRT driver
cd hailort-drivers/linux/pcie
sudo make all
sudo make install

# Load the Hailo PCI driver
sudo modprobe hailo_pci

if [ $? -ne 0 ]; then
  echo "Unable to load hailo_pci module, common reasons for this are:"
  echo "- Key was rejected by service: Secure Boot is enabling disallowing install."
  echo "- Permissions are not setup correctly."
  exit 1
fi

# Download and install the firmware
cd ../../
./download_firmware.sh

# verify the firmware folder is present
if [ ! -d /lib/firmware/hailo ]; then
  sudo mkdir /lib/firmware/hailo
fi
sudo mv hailo8_fw.*.bin /lib/firmware/hailo/hailo8_fw.bin

# Install udev rules
sudo cp ./linux/pcie/51-hailo-udev.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules && sudo udevadm trigger

echo "HailoRT driver installation complete."
echo "reboot your system to load the firmware!"
echo "Driver version: $(modinfo -F version hailo_pci)"
