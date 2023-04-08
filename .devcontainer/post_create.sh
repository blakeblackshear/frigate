#!/bin/bash

set -euxo pipefail

# Frigate normal container runs as root, so it have permission to create
# the folders. But the devcontainer runs as the host user, so we need to
# create the folders and give the host user permission to write to them.
sudo mkdir -p /media/frigate
sudo chown -R "$(id -u):$(id -g)" /media/frigate

make version

cd web

npm install

npm run build
