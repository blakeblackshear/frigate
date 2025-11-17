#!/bin/bash
set -e

# Download the MxAccl for Frigate github release
wget https://github.com/memryx/mx_accl_frigate/archive/refs/tags/v2.1.0.zip -O /tmp/mxaccl.zip
unzip /tmp/mxaccl.zip -d /tmp
mv /tmp/mx_accl_frigate-2.1.0 /opt/mx_accl_frigate
rm /tmp/mxaccl.zip

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
