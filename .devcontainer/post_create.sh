#!/bin/bash

set -euxo pipefail

# Cleanup the old github host key
sed -i -e '/AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A7hRGmdnm9tUDbO9IDSwBK6TbQa+PXYPCPy6rbTrTtw7PHkccKrpp0yVhp5HdEIcKr6pLlVDBfOLX9QUsyCOV0wzfjIJNlGEYsdlLJizHhbn2mUjvSAHQqZETYP81eFzLQNnPHt4EVVUh7VfDESU84KezmD5QlWpXLmvU31\/yMf+Se8xhHTvKSCZIFImWwoG6mbUoWf9nzpIoaSjB+weqqUUmpaaasXVal72J+UX2B+2RPW3RcT0eOzQgqlJL3RKrTJvdsjE3JEAvGq3lGHSZXy28G3skua2SmVi\/w4yCE6gbODqnTWlg7+wC604ydGXA8VJiS5ap43JXiUFFAaQ==/d' ~/.ssh/known_hosts
# Add new github host key
curl -L https://api.github.com/meta | jq -r '.ssh_keys | .[]' | \
  sed -e 's/^/github.com /' >> ~/.ssh/known_hosts

# Frigate normal container runs as root, so it have permission to create
# the folders. But the devcontainer runs as the host user, so we need to
# create the folders and give the host user permission to write to them.
sudo mkdir -p /media/frigate
sudo chown -R "$(id -u):$(id -g)" /media/frigate

make version

cd web

npm install

npm run build
