#!/bin/bash
set -xe
cd /tensorrt_demos/ssd
./install.sh
python3 build_engine.py ssd_mobilenet_v2_coco
cp /tensorrt_demos/ssd/TRT_ssd_mobilenet_v2_coco.bin /model/TRT_ssd_mobilenet_v2_coco.bin