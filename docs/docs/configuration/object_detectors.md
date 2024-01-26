---
id: object_detectors
title: Object Detectors
---

# Officially Supported Detectors

Frigate provides the following builtin detector types: `cpu`, `edgetpu`, `openvino`, `tensorrt`, and `rknn`. By default, Frigate will use a single CPU detector. Other detectors may require additional configuration as described below. When using multiple detectors they will run in dedicated processes, but pull from a common queue of detection requests from across all cameras.

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

:::tip

See [common Edge-TPU troubleshooting steps](/troubleshooting/edgetpu) if the EdgeTPu is not detected.

:::

### Single USB Coral

```yaml
detectors:
  coral:
    type: edgetpu
    device: usb
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

An OpenVINO model is provided in the container at `/openvino-model/ssdlite_mobilenet_v2.xml` and is used by this detector type by default. The model comes from Intel's Open Model Zoo [SSDLite MobileNet V2](https://github.com/openvinotoolkit/open_model_zoo/tree/master/models/public/ssdlite_mobilenet_v2) and is converted to an FP16 precision IR model. Use the model configuration shown below when using the OpenVINO detector with the default model.

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

This detector also supports some YOLO variants: YOLOX, YOLOv5, and YOLOv8 specifically. Other YOLO variants are not officially supported/tested. Frigate does not come with any yolo models preloaded, so you will need to supply your own models. This detector has been verified to work with the [yolox_tiny](https://github.com/openvinotoolkit/open_model_zoo/tree/master/models/public/yolox-tiny) model from Intel's Open Model Zoo. You can follow [these instructions](https://github.com/openvinotoolkit/open_model_zoo/tree/master/models/public/yolox-tiny#download-a-model-and-convert-it-into-openvino-ir-format) to retrieve the OpenVINO-compatible `yolox_tiny` model. Make sure that the model input dimensions match the `width` and `height` parameters, and `model_type` is set accordingly. See [Full Configuration Reference](/configuration/index.md#full-configuration-reference) for a list of possible `model_type` options. Below is an example of how `yolox_tiny` can be used in Frigate:

```yaml
detectors:
  ov:
    type: openvino
    device: AUTO
    model:
      path: /path/to/yolox_tiny.xml

model:
  width: 416
  height: 416
  input_tensor: nchw
  input_pixel_format: bgr
  model_type: yolox
  labelmap_path: /path/to/coco_80cl.txt
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

NVidia GPUs may be used for object detection using the TensorRT libraries. Due to the size of the additional libraries, this detector is only provided in images with the `-tensorrt` tag suffix, e.g. `ghcr.io/blakeblackshear/frigate:stable-tensorrt`. This detector is designed to work with Yolo models for object detection.

### Minimum Hardware Support

The TensorRT detector uses the 12.x series of CUDA libraries which have minor version compatibility. The minimum driver version on the host system must be `>=530`. Also the GPU must support a Compute Capability of `5.0` or greater. This generally correlates to a Maxwell-era GPU or newer, check the NVIDIA GPU Compute Capability table linked below.

To use the TensorRT detector, make sure your host system has the [nvidia-container-runtime](https://docs.docker.com/config/containers/resource_constraints/#access-an-nvidia-gpu) installed to pass through the GPU to the container and the host system has a compatible driver installed for your GPU.

There are improved capabilities in newer GPU architectures that TensorRT can benefit from, such as INT8 operations and Tensor cores. The features compatible with your hardware will be optimized when the model is converted to a trt file. Currently the script provided for generating the model provides a switch to enable/disable FP16 operations. If you wish to use newer features such as INT8 optimization, more work is required.

#### Compatibility References:

[NVIDIA TensorRT Support Matrix](https://docs.nvidia.com/deeplearning/tensorrt/archives/tensorrt-841/support-matrix/index.html)

[NVIDIA CUDA Compatibility](https://docs.nvidia.com/deploy/cuda-compatibility/index.html)

[NVIDIA GPU Compute Capability](https://developer.nvidia.com/cuda-gpus)

### Generate Models

The model used for TensorRT must be preprocessed on the same hardware platform that they will run on. This means that each user must run additional setup to generate a model file for the TensorRT library. A script is included that will build several common models.

The Frigate image will generate model files during startup if the specified model is not found. Processed models are stored in the `/config/model_cache` folder. Typically the `/config` path is mapped to a directory on the host already and the `model_cache` does not need to be mapped separately unless the user wants to store it in a different location on the host.

By default, the `yolov7-320` model will be generated, but this can be overridden by specifying the `YOLO_MODELS` environment variable in Docker. One or more models may be listed in a comma-separated format, and each one will be generated. To select no model generation, set the variable to an empty string, `YOLO_MODELS=""`. Models will only be generated if the corresponding `{model}.trt` file is not present in the `model_cache` folder, so you can force a model to be regenerated by deleting it from your Frigate data folder.

If you have a Jetson device with DLAs (Xavier or Orin), you can generate a model that will run on the DLA by appending `-dla` to your model name, e.g. specify `YOLO_MODELS=yolov7-320-dla`. The model will run on DLA0 (Frigate does not currently support DLA1). DLA-incompatible layers will fall back to running on the GPU.

If your GPU does not support FP16 operations, you can pass the environment variable `USE_FP16=False` to disable it.

Specific models can be selected by passing an environment variable to the `docker run` command or in your `docker-compose.yml` file. Use the form `-e YOLO_MODELS=yolov4-416,yolov4-tiny-416` to select one or more model names. The models available are shown below.

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
yolov7-640
yolov7-320
yolov7x-640
yolov7x-320
```

An example `docker-compose.yml` fragment that converts the `yolov4-608` and `yolov7x-640` models for a Pascal card would look something like this:

```yml
frigate:
  environment:
    - YOLO_MODELS=yolov4-608,yolov7x-640
    - USE_FP16=false
```

If you have multiple GPUs passed through to Frigate, you can specify which one to use for the model conversion. The conversion script will use the first visible GPU, however in systems with mixed GPU models you may not want to use the default index for object detection. Add the `TRT_MODEL_PREP_DEVICE` environment variable to select a specific GPU.

```yml
frigate:
  environment:
    - TRT_MODEL_PREP_DEVICE=0 # Optionally, select which GPU is used for  model optimization
```

### Configuration Parameters

The TensorRT detector can be selected by specifying `tensorrt` as the model type. The GPU will need to be passed through to the docker container using the same methods described in the [Hardware Acceleration](hardware_acceleration.md#nvidia-gpu) section. If you pass through multiple GPUs, you can select which GPU is used for a detector with the `device` configuration parameter. The `device` parameter is an integer value of the GPU index, as shown by `nvidia-smi` within the container.

The TensorRT detector uses `.trt` model files that are located in `/config/model_cache/tensorrt` by default. These model path and dimensions used will depend on which model you have generated.

```yaml
detectors:
  tensorrt:
    type: tensorrt
    device: 0 #This is the default, select the first GPU

model:
  path: /config/model_cache/tensorrt/yolov7-320.trt
  input_tensor: nchw
  input_pixel_format: rgb
  width: 320
  height: 320
```

## Deepstack / CodeProject.AI Server Detector

The Deepstack / CodeProject.AI Server detector for Frigate allows you to integrate Deepstack and CodeProject.AI object detection capabilities into Frigate. CodeProject.AI and DeepStack are open-source AI platforms that can be run on various devices such as the Raspberry Pi, Nvidia Jetson, and other compatible hardware. It is important to note that the integration is performed over the network, so the inference times may not be as fast as native Frigate detectors, but it still provides an efficient and reliable solution for object detection and tracking.

### Setup

To get started with CodeProject.AI, visit their [official website](https://www.codeproject.com/Articles/5322557/CodeProject-AI-Server-AI-the-easy-way) to follow the instructions to download and install the AI server on your preferred device. Detailed setup instructions for CodeProject.AI are outside the scope of the Frigate documentation.

To integrate CodeProject.AI into Frigate, you'll need to make the following changes to your Frigate configuration file:

```yaml
detectors:
  deepstack:
    api_url: http://<your_codeproject_ai_server_ip>:<port>/v1/vision/detection
    type: deepstack
    api_timeout: 0.1 # seconds
```

Replace `<your_codeproject_ai_server_ip>` and `<port>` with the IP address and port of your CodeProject.AI server.

To verify that the integration is working correctly, start Frigate and observe the logs for any error messages related to CodeProject.AI. Additionally, you can check the Frigate web interface to see if the objects detected by CodeProject.AI are being displayed and tracked properly.

# Community Supported Detectors

## Rockchip RKNN-Toolkit-Lite2

This detector is only available if one of the following Rockchip SoCs is used:

- RK3588/RK3588S
- RK3568
- RK3566
- RK3562

These SoCs come with a NPU that will highly speed up detection.

### Setup

Use a frigate docker image with `-rk` suffix and enable privileged mode by adding the `--privileged` flag to your docker run command or `privileged: true` to your `docker-compose.yml` file.

### Configuration

This `config.yml` shows all relevant options to configure the detector and explains them. All values shown are the default values (except for one). Lines that are required at least to use the detector are labeled as required, all other lines are optional.

```yaml
detectors: # required
  rknn: # required
    type: rknn # required
    # core mask for npu
    core_mask: 0

model: # required
  # name of yolov8 model or path to your own .rknn model file
  # possible values are:
  # - default-yolov8n
  # - default-yolov8s
  # - default-yolov8m
  # - default-yolov8l
  # - default-yolov8x
  # - /config/model_cache/rknn/your_custom_model.rknn
  path: default-yolov8n
  # width and height of detection frames
  width: 320
  height: 320
  # pixel format of detection frame
  # default value is rgb but yolov models usually use bgr format
  input_pixel_format: bgr # required
  # shape of detection frame
  input_tensor: nhwc
```

Explanation for rknn specific options:

- **core mask** controls which cores of your NPU should be used. This option applies only to SoCs with a multicore NPU (at the time of writing this in only the RK3588/S). The easiest way is to pass the value as a binary number. To do so, use the prefix `0b` and write a `0` to disable a core and a `1` to enable a core, whereas the last digit coresponds to core0, the second last to core1, etc. You also have to use the cores in ascending order (so you can't use core0 and core2; but you can use core0 and core1). Enabling more cores can reduce the inference speed, especially when using bigger models (see section below). Examples:
  - `core_mask: 0b000` or just `core_mask: 0` let the NPU decide which cores should be used. Default and recommended value.
  - `core_mask: 0b001` use only core0.
  - `core_mask: 0b011` use core0 and core1.
  - `core_mask: 0b110` use core1 and core2. **This does not** work, since core0 is disabled.

### Choosing a model

There are 5 default yolov8 models that differ in size and therefore load the NPU more or less. In ascending order, with the top one being the smallest and least computationally intensive model:

| Model   | Size in mb |
| ------- | ---------- |
| yolov8n | 9          |
| yolov8s | 25         |
| yolov8m | 54         |
| yolov8l | 90         |
| yolov8x | 136        |

:::tip

You can get the load of your NPU with the following command:

```bash
$ cat /sys/kernel/debug/rknpu/load
>> NPU load:  Core0:  0%, Core1:  0%, Core2:  0%,
```

:::

- By default the rknn detector uses the yolov8n model (`model: path: default-yolov8n`). This model comes with the image, so no further steps than those mentioned above are necessary.
- If you want to use a more precise model, you can pass `default-yolov8s`, `default-yolov8m`, `default-yolov8l` or `default-yolov8x` as `model: path:` option.
  - If the model does not exist, it will be automatically downloaded to `/config/model_cache/rknn`.
  - If your server has no internet connection, you can download the model from [this Github repository](https://github.com/MarcA711/rknn-models/releases) using another device and place it in the `config/model_cache/rknn` on your system.
- Finally, you can also provide your own model. Note that only yolov8 models are currently supported. Moreover, you will need to convert your model to the rknn format using `rknn-toolkit2` on a x86 machine. Afterwards, you can place your `.rknn` model file in the `config/model_cache/rknn` directory on your system. Then you need to pass the path to your model using the `path` option of your `model` block like this:

```yaml
model:
  path: /config/model_cache/rknn/my-rknn-model.rknn
```

:::tip

When you have a multicore NPU, you can enable all cores to reduce inference times. You should consider activating all cores if you use a larger model like yolov8l. If your NPU has 3 cores (like rk3588/S SoCs), you can enable all 3 cores using:

```yaml
detectors:
  rknn:
    type: rknn
    core_mask: 0b111
```

:::
