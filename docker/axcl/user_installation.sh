#!/bin/bash

# Update package list and install dependencies
sudo apt-get update
sudo apt-get install -y build-essential cmake git wget pciutils kmod udev

# Check if gcc-12 is needed
current_gcc_version=$(gcc --version | head -n1 | awk '{print $NF}')
gcc_major_version=$(echo $current_gcc_version | cut -d'.' -f1)

if [[ $gcc_major_version -lt 12 ]]; then
    echo "Current GCC version ($current_gcc_version) is lower than 12, installing gcc-12..."
    sudo apt-get install -y gcc-12
    sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-12 12
    echo "GCC-12 installed and set as default"
else
    echo "Current GCC version ($current_gcc_version) is sufficient, skipping GCC installation"
fi

# Determine architecture
arch=$(uname -m)
download_url=""

if [[ $arch == "x86_64" ]]; then
    download_url="https://github.com/ivanshi1108/assets/releases/download/v0.16.2/axcl_host_x86_64_V3.6.5_20250908154509_NO4973.deb"
    deb_file="axcl_host_x86_64_V3.6.5_20250908154509_NO4973.deb"
elif [[ $arch == "aarch64" ]]; then
    download_url="https://github.com/ivanshi1108/assets/releases/download/v0.16.2/axcl_host_aarch64_V3.6.5_20250908154509_NO4973.deb"
    deb_file="axcl_host_aarch64_V3.6.5_20250908154509_NO4973.deb"
else
    echo "Unsupported architecture: $arch"
    exit 1
fi

# Download AXCL driver
echo "Downloading AXCL driver for $arch..."
wget "$download_url" -O "$deb_file"

if [ $? -ne 0 ]; then
    echo "Failed to download AXCL driver"
    exit 1
fi

# Install AXCL driver
echo "Installing AXCL driver..."
sudo dpkg -i "$deb_file"

if [ $? -ne 0 ]; then
    echo "Failed to install AXCL driver, attempting to fix dependencies..."
    sudo apt-get install -f -y
    sudo dpkg -i "$deb_file"

    if [ $? -ne 0 ]; then
        echo "AXCL driver installation failed"
        exit 1
    fi
fi

# Update environment
echo "Updating environment..."
source /etc/profile

# Verify installation
echo "Verifying AXCL installation..."
if command -v axcl-smi &> /dev/null; then
    echo "AXCL driver detected, checking AI accelerator status..."

    axcl_output=$(axcl-smi 2>&1)
    axcl_exit_code=$?

    echo "$axcl_output"

    if [ $axcl_exit_code -eq 0 ]; then
        echo "AXCL driver installation completed successfully!"
    else
        echo "AXCL driver installed but no AI accelerator detected or communication failed."
        echo "Please check if the AI accelerator is properly connected and powered on."
        exit 1
    fi
else
    echo "axcl-smi command not found. AXCL driver installation may have failed."
    exit 1
fi