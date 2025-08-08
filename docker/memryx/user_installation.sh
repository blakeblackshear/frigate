#!/bin/bash
set -e  # Exit immediately if any command fails
set -o pipefail

echo "Starting MemryX driver and runtime installation..."

# Detect architecture
arch=$(uname -m)

# Purge existing packages and repo
echo "Removing old MemryX installations..."
sudo apt purge -y memx-* || true
sudo rm -f /etc/apt/sources.list.d/memryx.list /etc/apt/trusted.gpg.d/memryx.asc

# Install kernel headers
echo "Installing kernel headers for: $(uname -r)"
sudo apt update
sudo apt install -y linux-headers-$(uname -r)

# Add MemryX key and repo
echo "Adding MemryX GPG key and repository..."
wget -qO- https://developer.memryx.com/deb/memryx.asc | sudo tee /etc/apt/trusted.gpg.d/memryx.asc >/dev/null
echo 'deb https://developer.memryx.com/deb stable main' | sudo tee /etc/apt/sources.list.d/memryx.list >/dev/null

# Update and install memx-drivers
echo "Installing memx-drivers..."
sudo apt update
sudo apt install -y memx-drivers

# ARM-specific board setup
if [[ "$arch" == "aarch64" || "$arch" == "arm64" ]]; then
    echo "Running ARM board setup..."
    sudo mx_arm_setup
fi

echo -e "\n\n\033[1;31mYOU MUST RESTART YOUR COMPUTER NOW\033[0m\n\n"

# Install other runtime packages
packages=("memx-accl" "mxa-manager")
for pkg in "${packages[@]}"; do
    echo "Installing $pkg..."
    sudo apt install -y "$pkg"
done

echo "MemryX installation complete!"