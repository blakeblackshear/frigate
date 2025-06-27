#!/usr/bin/env bash

set -e

VERSION=${VERSION}

python3 -m pip config set global.break-system-packages true
# if VERSION == "latest" or VERSION is empty, install the latest version
if [ "$VERSION" == "latest" ] || [ -z "$VERSION" ]; then
    python3 -m pip install onnxruntime-gpu
else
    python3 -m pip install onnxruntime-gpu==$VERSION
fi

echo "Done!"