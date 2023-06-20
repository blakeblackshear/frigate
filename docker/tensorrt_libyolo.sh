#!/bin/bash

set -euxo pipefail

# Clone tensorrt_demos repo
git clone --depth 1 https://github.com/yeahme49/tensorrt_demos.git

# Build libyolo
cd ./tensorrt_demos/plugins && make all
cp libyolo_layer.so /usr/local/lib/libyolo_layer.so