#!/bin/bash

# Update package list and install dependencies
sudo apt-get update
sudo apt-get install -y build-essential cmake git wget linux-modules-extra-$(uname -r)

arch=$(uname -m)

if [[ $arch == "x86_64" ]]; then
    sudo apt install -y linux-headers-$(uname -r);
else
    sudo apt install -y linux-modules-extra-$(uname -r);
fi

# Clone the HailoRT driver repository
git clone --depth 1 --branch v4.17.0 https://github.com/hailo-ai/hailort-drivers.git

# Build and install the HailoRT driver
cd hailort-drivers/linux/pcie
sudo make all
sudo make install

# Load the Hailo PCI driver
sudo modprobe hailo_pci

# Download and install the firmware
cd ../../
./download_firmware.sh
sudo mv hailo8_fw.4.17.0.bin /lib/firmware/hailo/hailo8_fw.bin

# Install udev rules
sudo cp ./linux/pcie/51-hailo-udev.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules && sudo udevadm trigger

echo "HailoRT driver installation complete."
