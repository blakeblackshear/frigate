#!/bin/bash

mkdir -p $(pwd)/model

docker build --tag models.ssd_v2_coco  --file ./Dockerfile.l4t.tf15 ./assets/

sudo docker run --rm -it --name models.ssd_v2_coco \
    --mount type=tmpfs,target=/tmp/cache,tmpfs-size=1000000000 \
    -v $(pwd)/model:/model:rw \
    -v /tmp/argus_socket:/tmp/argus_socket \
    -e NVIDIA_VISIBLE_DEVICES=all \
    -e NVIDIA_DRIVER_CAPABILITIES=compute,utility,video \
    --runtime=nvidia \
    --privileged \
    models.ssd_v2_coco /run.sh
