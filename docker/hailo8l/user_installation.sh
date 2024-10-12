#!/bin/bash

# Update package list and install dependencies
sudo apt-get update
sudo apt-get install -y build-essential cmake git wget

arch=$(uname -m)

if [[ $arch == "x86_64" ]]; then
    sudo apt install -y linux-headers-$(uname -r);
else
    sudo apt install -y linux-modules-extra-$(uname -r);
fi

# Clone the HailoRT driver repository
git clone --depth 1 --branch v4.18.0 https://github.com/hailo-ai/hailort-drivers.git

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
sudo mv hailo8_fw.4.17.0.bin /lib/firmware/hailo/hailo8_fw.bin

# Install udev rules
sudo cp ./linux/pcie/51-hailo-udev.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules && sudo udevadm trigger

echo "HailoRT driver installation complete."
echo "reboot your system to load the firmware!"
