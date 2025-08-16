#!/bin/bash
set -e

# Update and install required system packages
apt-get update && apt-get install -y git libgomp1

# Clone the MemryX runtime repo
git clone https://github.com/memryx/mx_accl_frigate.git /opt/mx_accl_frigate

# Install Python dependencies
pip3 install -r /opt/mx_accl_frigate/freeze

# Link the Python package dynamically
SITE_PACKAGES=$(python3 -c "import site; print(site.getsitepackages()[0])")
ln -s /opt/mx_accl_frigate/memryx "$SITE_PACKAGES/memryx"

# Copy architecture-specific shared libraries
ARCH=$(uname -m)
if [[ "$ARCH" == "x86_64" ]]; then
    cp /opt/mx_accl_frigate/memryx/x86/libmemx.so* /usr/lib/x86_64-linux-gnu/
    cp /opt/mx_accl_frigate/memryx/x86/libmx_accl.so* /usr/lib/x86_64-linux-gnu/
elif [[ "$ARCH" == "aarch64" ]]; then
    cp /opt/mx_accl_frigate/memryx/arm/libmemx.so* /usr/lib/aarch64-linux-gnu/
    cp /opt/mx_accl_frigate/memryx/arm/libmx_accl.so* /usr/lib/aarch64-linux-gnu/
else
    echo "Unsupported architecture: $ARCH"
    exit 1
fi

# Refresh linker cache
ldconfig
