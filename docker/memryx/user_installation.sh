#!/bin/bash
set -e  # Exit immediately if any command fails
set -o pipefail

#############################################
# Function to install a specific package version (latest in the 1.2 series)
# and mark it as held.
install_and_hold() {
    local package="$1"
    echo "Processing package: $package..."

    # Retrieve versions from apt-cache policy that match the 1.2 series.
    # This grep pattern handles lines that begin with optional whitespace,
    # and optionally a '***' marker (with whitespace before and after),
    # followed by a version number starting with "1.2".
    local versions
    versions=$(apt-cache policy "$package" | grep -E '^\s*(\*{3}\s*)?1\.2' | awk '{if($1=="***") print $2; else print $1}')

    # Check if any 1.2 versions were found.
    if [ -z "$versions" ]; then
        echo "No 1.2 versions found for package $package" >&2
        return 1
    fi

    # Sort versions in a version-aware manner and pick the latest one.
    local latest
    latest=$(echo "$versions" | sort -V | tail -n 1)
    echo "Latest 1.2.x version of $package is: $latest"

    # Install the specific version.
    echo "Installing $package version $latest... "
    sudo apt install -y "${package}=${latest}" || { echo "Installation of ${package} version ${latest} failed." >&2; return 1; }

    # Mark the package on hold so it is not automatically upgraded.
    echo "Marking $package at version $latest as held..."
    sudo apt-mark hold "$package" || { echo "Failed to hold package $package." >&2; return 1; }

    echo "Package $package installed and pinned at version $latest successfully."
    echo "-------------------------------------------"
}
#############################################

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

# Update and install memx-drivers using install_and_hold function.
echo "Installing memx-drivers..."
sudo apt update
install_and_hold "memx-drivers"

# ARM-specific board setup
if [[ "$arch" == "aarch64" || "$arch" == "arm64" ]]; then
    echo " Running ARM board setup..."
    sudo mx_arm_setup
fi

echo -e "\n\n\033[1;31mYOU MUST RESTART YOUR COMPUTER NOW\033[0m\n\n"

# Install mxa-manager and memx-accl using install_and_hold
# List of packages to process.
packages=("memx-accl" "mxa-manager")
for pkg in "${packages[@]}"; do
    install_and_hold "$pkg"
done

# Update the configuration file to set the listen address to 0.0.0.0
# This is easier containers to connect to the host's manager daemon,
# since the default addr is 127.0.0.1 and some users might not
# have docker-host networking allowed
echo "Configuring mxa_manager.conf to listen on 0.0.0.0..."
sudo sed -i 's/^LISTEN_ADDRESS=.*/LISTEN_ADDRESS="0.0.0.0"/' /etc/memryx/mxa_manager.conf

# Restart mxa-manager service to apply configuration changes
echo "Restarting mxa-manager service..."
sudo service mxa-manager restart

echo "MemryX installation complete!"
