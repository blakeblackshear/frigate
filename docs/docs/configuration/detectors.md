---
id: detectors
title: Detectors
---

Frigate provides the following builtin detector types: `cpu`, `edgetpu`, `openvino`, and `tensorrt`. By default, Frigate will use a single CPU detector. Other detectors may require additional configuration as described below. When using multiple detectors they will run in dedicated processes, but pull from a common queue of detection requests from across all cameras.

## CPU Detector (not recommended)

The CPU detector type runs a TensorFlow Lite model utilizing the CPU without hardware acceleration. It is recommended to use a hardware accelerated detector type instead for better performance. To configure a CPU based detector, set the `"type"` attribute to `"cpu"`.

The number of threads used by the interpreter can be specified using the `"num_threads"` attribute, and defaults to `3.`

A TensorFlow Lite model is provided in the container at `/cpu_model.tflite` and is used by this detector type by default. To provide your own model, bind mount the file into the container and provide the path with `model.path`.

```yaml
detectors:
  cpu1:
    type: cpu
    num_threads: 3
    model:
      path: "/custom_model.tflite"
  cpu2:
    type: cpu
    num_threads: 3
```

When using CPU detectors, you can add one CPU detector per camera. Adding more detectors than the number of cameras should not improve performance.

## Edge-TPU Detector

The EdgeTPU detector type runs a TensorFlow Lite model utilizing the Google Coral delegate for hardware acceleration. To configure an EdgeTPU detector, set the `"type"` attribute to `"edgetpu"`.

The EdgeTPU device can be specified using the `"device"` attribute according to the [Documentation for the TensorFlow Lite Python API](https://coral.ai/docs/edgetpu/multiple-edgetpu/#using-the-tensorflow-lite-python-api). If not set, the delegate will use the first device it finds.

A TensorFlow Lite model is provided in the container at `/edgetpu_model.tflite` and is used by this detector type by default. To provide your own model, bind mount the file into the container and provide the path with `model.path`.

### Single USB Coral

```yaml
detectors:
  coral:
    type: edgetpu
    device: usb
    model:
      path: "/custom_model.tflite"
```

### Multiple USB Corals

```yaml
detectors:
  coral1:
    type: edgetpu
    device: usb:0
  coral2:
    type: edgetpu
    device: usb:1
```

### Native Coral (Dev Board)

_warning: may have [compatibility issues](https://github.com/blakeblackshear/frigate/issues/1706) after `v0.9.x`_

```yaml
detectors:
  coral:
    type: edgetpu
    device: ""
```

### Multiple PCIE/M.2 Corals

```yaml
detectors:
  coral1:
    type: edgetpu
    device: pci:0
  coral2:
    type: edgetpu
    device: pci:1
```

### Mixing Corals

```yaml
detectors:
  coral_usb:
    type: edgetpu
    device: usb
  coral_pci:
    type: edgetpu
    device: pci
```

## OpenVINO Detector

The OpenVINO detector type runs an OpenVINO IR model on Intel CPU, GPU and VPU hardware. To configure an OpenVINO detector, set the `"type"` attribute to `"openvino"`.

The OpenVINO device to be used is specified using the `"device"` attribute according to the naming conventions in the [Device Documentation](https://docs.openvino.ai/latest/openvino_docs_OV_UG_Working_with_devices.html). Other supported devices could be `AUTO`, `CPU`, `GPU`, `MYRIAD`, etc. If not specified, the default OpenVINO device will be selected by the `AUTO` plugin.

OpenVINO is supported on 6th Gen Intel platforms (Skylake) and newer. A supported Intel platform is required to use the `GPU` device with OpenVINO. The `MYRIAD` device may be run on any platform, including Arm devices. For detailed system requirements, see [OpenVINO System Requirements](https://www.intel.com/content/www/us/en/developer/tools/openvino-toolkit/system-requirements.html)

An OpenVINO model is provided in the container at `/openvino-model/ssdlite_mobilenet_v2.xml` and is used by this detector type by default. The model comes from Intel's Open Model Zoo [SSDLite MobileNet V2](https://github.com/openvinotoolkit/open_model_zoo/tree/master/models/public/ssdlite_mobilenet_v2) and is converted to an FP16 precision IR model. Use the model configuration shown below when using the OpenVINO detector.

```yaml
detectors:
  ov:
    type: openvino
    device: AUTO
    model:
      path: /openvino-model/ssdlite_mobilenet_v2.xml

model:
  width: 300
  height: 300
  input_tensor: nhwc
  input_pixel_format: bgr
  labelmap_path: /openvino-model/coco_91cl_bkgr.txt
```

### Intel NCS2 VPU and Myriad X Setup

Intel produces a neural net inference accelleration chip called Myriad X. This chip was sold in their Neural Compute Stick 2 (NCS2) which has been discontinued. If intending to use the MYRIAD device for accelleration, additional setup is required to pass through the USB device. The host needs a udev rule installed to handle the NCS2 device.

```bash
sudo usermod -a -G users "$(whoami)"
cat <<EOF > 97-myriad-usbboot.rules
SUBSYSTEM=="usb", ATTRS{idProduct}=="2485", ATTRS{idVendor}=="03e7", GROUP="users", MODE="0666", ENV{ID_MM_DEVICE_IGNORE}="1"
SUBSYSTEM=="usb", ATTRS{idProduct}=="f63b", ATTRS{idVendor}=="03e7", GROUP="users", MODE="0666", ENV{ID_MM_DEVICE_IGNORE}="1"
EOF
sudo cp 97-myriad-usbboot.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules
sudo udevadm trigger
```

Additionally, the Frigate docker container needs to run with the following configuration:

```bash
--device-cgroup-rule='c 189:\* rmw' -v /dev/bus/usb:/dev/bus/usb
```

or in your compose file:

```yml
device_cgroup_rules:
  - "c 189:* rmw"
volumes:
  - /dev/bus/usb:/dev/bus/usb
```

## NVidia TensorRT Detector

NVidia GPUs may be used for object detection using the TensorRT libraries.

### Minimum Hardware Support

**TODO**

### Generate Models

The models used for TensorRT must be preprocessed on the same hardware platform that they will run on. This means that each user must run additional setup to generate these model files for the TensorRT library. A script is provided that will build several common models.

To generate the model files, create a new folder to save the models, download the script, and launch a docker container that will run the script.

```bash
mkdir trt-models
wget https://github.com/blakeblackshear/frigate/raw/master/docker/tensorrt_models.sh
docker run --gpus=all --rm -it -v `pwd`/trt-models:/tensorrt_models -v `pwd`/tensorrt_models.sh:/tensorrt_models.sh nvcr.io/nvidia/tensorrt:22.07-py3 /tensorrt_models.sh
```

The `trt-models` folder can then be mapped into your frigate container as `trt-models` and the models referenced from the config.

If your GPU does not support FP16 operations, you can pass the environment variable `-e USE_FP16=False` to the `docker run` command to disable it.

Specific models can be selected by passing an environment variable to the `docker run` command. Use the form `-e YOLO_MODELS=yolov4-416,yolov4-tiny-416` to select one or more model names. The models available are shown below.

```
yolov3-288
yolov3-416
yolov3-608
yolov3-spp-288
yolov3-spp-416
yolov3-spp-608
yolov3-tiny-288
yolov3-tiny-416
yolov4-288
yolov4-416
yolov4-608
yolov4-csp-256
yolov4-csp-512
yolov4-p5-448
yolov4-p5-896
yolov4-tiny-288
yolov4-tiny-416
yolov4x-mish-320
yolov4x-mish-640
yolov7-tiny-288
yolov7-tiny-416
```

### Configuration Parameters

**TODO**

Sample:

```yaml
detectors:
  tensorrt:
    type: tensorrt

model:
  path: /trt-models/yolov7-tiny-416.trt
  labelmap_path: /trt-models/coco_91cl.txt
  input_tensor: nchw
  width: 416
  height: 416
```
