Following the https://github.com/jkjung-avt/tensorrt_demos#demo-5-yolov4


A build.sh file will convert pre-trained yolov3 and yolov4 models through ONNX to TensorRT engines. The implementation with a "yolo_layer" plugin has been updated to speed up inference time of the yolov3/yolov4 models.

Current "yolo_layer" plugin implementation is based on TensorRT's IPluginV2IOExt. It only works for TensorRT 6+. "yolo_layer" developed plugin by referencing similar plugin code by wang-xinyu and dongfangduoshou123. So big thanks to both of them.


Output will be copied to the ./model folder



## Available models

   | TensorRT engine         | mAP @<br>IoU=0.5:0.95 |  mAP @<br>IoU=0.5  | FPS on Nano |
   |:------------------------|:---------------------:|:------------------:|:-----------:|
   | yolov3-tiny-288 (FP16)  |         0.077         |        0.158       |     35.8    |
   | yolov3-tiny-416 (FP16)  |         0.096         |        0.202       |     25.5    |
   | yolov3-288 (FP16)       |         0.331         |        0.601       |     8.16    |
   | yolov3-416 (FP16)       |         0.373         |        0.664       |     4.93    |
   | yolov3-608 (FP16)       |         0.376         |        0.665       |     2.53    |
   | yolov3-spp-288 (FP16)   |         0.339         |        0.594       |     8.16    |
   | yolov3-spp-416 (FP16)   |         0.391         |        0.664       |     4.82    |
   | yolov3-spp-608 (FP16)   |         0.410         |        0.685       |     2.49    |
   | yolov4-tiny-288 (FP16)  |         0.179         |        0.344       |     36.6    |
   | yolov4-tiny-416 (FP16)  |         0.196         |        0.387       |     25.5    |
   | yolov4-288 (FP16)       |         0.376         |        0.591       |     7.93    |
   | yolov4-416 (FP16)       |         0.459         |        0.700       |     4.62    |
   | yolov4-608 (FP16)       |         0.488         |        0.736       |     2.35    |
   | yolov4-csp-256 (FP16)   |         0.336         |        0.502       |     12.8    |
   | yolov4-csp-512 (FP16)   |         0.436         |        0.630       |     4.26    |
   | yolov4x-mish-320 (FP16) |         0.400         |        0.581       |     4.79    |
   | yolov4x-mish-640 (FP16) |         0.470         |        0.668       |     1.46    |


Please update frigate/converters/yolo4/assets/run.sh to add necessary models

Note:

This will consume pretty significant amound of memory. You might consider extending swap on Jetson Nano

Usage:

cd ./frigate/converters/yolo4/
./build.sh