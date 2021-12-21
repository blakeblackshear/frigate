
A build.sh file will convert pre-trained tensorflow Single-Shot Multibox Detector (SSD) models through UFF to TensorRT engine to do real-time object detection with the TensorRT engine.

Output will be copied to the ./model folder


Note:

This will consume pretty significant amound of memory. You might consider extending swap on Jetson Nano

Usage:

cd ./frigate/converters/ssd_mobilenet_v2_coco/
./build.sh