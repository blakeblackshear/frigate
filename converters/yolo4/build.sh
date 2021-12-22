#!/bin/bash

mkdir -p $(pwd)/model

docker build --tag models.yolo4  --file ./Dockerfile.l4t.tf15 ./assets/

sudo docker run --rm -it --name models.yolo4 \
    --mount type=tmpfs,target=/tmp/cache,tmpfs-size=1000000000 \
    -v $(pwd)/model:/model:rw \
    -v /tmp/argus_socket:/tmp/argus_socket \
    -e NVIDIA_VISIBLE_DEVICES=all \
    -e NVIDIA_DRIVER_CAPABILITIES=compute,utility,video \
    --runtime=nvidia \
    --privileged \
    models.yolo4 /run.sh
