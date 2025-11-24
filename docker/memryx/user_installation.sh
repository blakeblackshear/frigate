#!/bin/bash
set -e  # Exit immediately if any command fails
set -o pipefail

echo "Starting MemryX driver and runtime installation..."

# Detect architecture
arch=$(uname -m)

# Purge existing packages and repo
echo "Removing old MemryX installations..."
# Remove any holds on MemryX packages (if they exist)
sudo apt-mark unhold memx-* mxa-manager || true
sudo apt purge -y memx-* mxa-manager || true
sudo rm -f /etc/apt/sources.list.d/memryx.list /etc/apt/trusted.gpg.d/memryx.asc

# Install kernel headers
echo "Installing kernel headers for: $(uname -r)"
sudo apt update
sudo apt install -y dkms linux-headers-$(uname -r)

# Add MemryX key and repo
echo "Adding MemryX GPG key and repository..."
wget -qO- https://developer.memryx.com/deb/memryx.asc | sudo tee /etc/apt/trusted.gpg.d/memryx.asc >/dev/null
echo 'deb https://developer.memryx.com/deb stable main' | sudo tee /etc/apt/sources.list.d/memryx.list >/dev/null

# Update and install specific SDK 2.1 packages
echo "Installing MemryX SDK 2.1 packages..."
sudo apt update
sudo apt install -y memx-drivers=2.1.* memx-accl=2.1.* mxa-manager=2.1.*

# Hold packages to prevent automatic upgrades
sudo apt-mark hold memx-drivers memx-accl mxa-manager

# ARM-specific board setup
if [[ "$arch" == "aarch64" || "$arch" == "arm64" ]]; then
    echo "Running ARM board setup..."
    sudo mx_arm_setup
fi

echo -e "\n\n\033[1;31mYOU MUST RESTART YOUR COMPUTER NOW\033[0m\n\n"

echo "MemryX SDK 2.1 installation complete!"

