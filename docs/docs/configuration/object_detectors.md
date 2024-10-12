---
id: object_detectors
title: Object Detectors
---

# Supported Hardware

:::info

Frigate supports multiple different detectors that work on different types of hardware:

**Most Hardware**
- [Coral EdgeTPU](#edge-tpu-detector): The Google Coral EdgeTPU is available in USB and m.2 format allowing for a wide range of compatibility with devices.
- [Hailo](#hailo-8l): The Hailo8 AI Acceleration module is available in m.2 format with a HAT for RPi devices, offering a wide range of compatibility with devices.

**AMD**
- [ROCm](#amdrocm-gpu-detector): ROCm can run on AMD Discrete GPUs to provide efficient object detection.
- [ONNX](#onnx): ROCm will automatically be detected and used as a detector in the `-rocm` Frigate image when a supported ONNX model is configured.

**Intel**
- [OpenVino](#openvino-detector): OpenVino can run on Intel Arc GPUs, Intel integrated GPUs, and Intel CPUs to provide efficient object detection.
- [ONNX](#onnx): OpenVINO will automatically be detected and used as a detector in the default Frigate image when a supported ONNX model is configured.

**Nvidia**
- [TensortRT](#nvidia-tensorrt-detector): TensorRT can run on Nvidia GPUs, using one of many default models.
- [ONNX](#onnx): TensorRT will automatically be detected and used as a detector in the `-tensorrt` Frigate image when a supported ONNX model is configured.

**Rockchip**
- [RKNN](#rockchip-platform): RKNN models can run on Rockchip devices with included NPUs.

**For Testing**
- [CPU Detector (not recommended for actual use](#cpu-detector-not-recommended): Use a CPU to run tflite model, this is not recommended and in most cases OpenVINO can be used in CPU mode with better results. 

:::

# Officially Supported Detectors

Frigate provides the following builtin detector types: `cpu`, `edgetpu`, `hailo8l`, `onnx`, `openvino`, `rknn`, `rocm`, and `tensorrt`. By default, Frigate will use a single CPU detector. Other detectors may require additional configuration as described below. When using multiple detectors they will run in dedicated processes, but pull from a common queue of detection requests from across all cameras.

## Edge TPU Detector

The Edge TPU detector type runs a TensorFlow Lite model utilizing the Google Coral delegate for hardware acceleration. To configure an Edge TPU detector, set the `"type"` attribute to `"edgetpu"`.

The Edge TPU device can be specified using the `"device"` attribute according to the [Documentation for the TensorFlow Lite Python API](https://coral.ai/docs/edgetpu/multiple-edgetpu/#using-the-tensorflow-lite-python-api). If not set, the delegate will use the first device it finds.

A TensorFlow Lite model is provided in the container at `/edgetpu_model.tflite` and is used by this detector type by default. To provide your own model, bind mount the file into the container and provide the path with `model.path`.

:::tip

See [common Edge TPU troubleshooting steps](/troubleshooting/edgetpu) if the Edge TPU is not detected.

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

### Single PCIE/M.2 Coral

```yaml
detectors:
  coral:
    type: edgetpu
    device: pci
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

The OpenVINO detector type runs an OpenVINO IR model on AMD and Intel CPUs, Intel GPUs and Intel VPU hardware. To configure an OpenVINO detector, set the `"type"` attribute to `"openvino"`.

The OpenVINO device to be used is specified using the `"device"` attribute according to the naming conventions in the [Device Documentation](https://docs.openvino.ai/2024/openvino-workflow/running-inference/inference-devices-and-modes.html). The most common devices are `CPU` and `GPU`. Currently, there is a known issue with using `AUTO`. For backwards compatibility, Frigate will attempt to use `GPU` if `AUTO` is set in your configuration.

OpenVINO is supported on 6th Gen Intel platforms (Skylake) and newer. It will also run on AMD CPUs despite having no official support for it. A supported Intel platform is required to use the `GPU` device with OpenVINO. For detailed system requirements, see [OpenVINO System Requirements](https://docs.openvino.ai/2024/about-openvino/release-notes-openvino/system-requirements.html)

:::tip

When using many cameras one detector may not be enough to keep up. Multiple detectors can be defined assuming GPU resources are available. An example configuration would be:

```yaml
detectors:
  ov_0:
    type: openvino
    device: GPU
  ov_1:
    type: openvino
    device: GPU
```

:::

### Supported Models

#### SSDLite MobileNet v2

An OpenVINO model is provided in the container at `/openvino-model/ssdlite_mobilenet_v2.xml` and is used by this detector type by default. The model comes from Intel's Open Model Zoo [SSDLite MobileNet V2](https://github.com/openvinotoolkit/open_model_zoo/tree/master/models/public/ssdlite_mobilenet_v2) and is converted to an FP16 precision IR model. Use the model configuration shown below when using the OpenVINO detector with the default model.

```yaml
detectors:
  ov:
    type: openvino
    device: GPU

model:
  width: 300
  height: 300
  input_tensor: nhwc
  input_pixel_format: bgr
  path: /openvino-model/ssdlite_mobilenet_v2.xml
  labelmap_path: /openvino-model/coco_91cl_bkgr.txt
```

#### YOLOX

This detector also supports YOLOX. Frigate does not come with any YOLOX models preloaded, so you will need to supply your own models.

#### YOLO-NAS

[YOLO-NAS](https://github.com/Deci-AI/super-gradients/blob/master/YOLONAS.md) models are supported, but not included by default. You can build and download a compatible model with pre-trained weights using [this notebook](https://github.com/blakeblackshear/frigate/blob/dev/notebooks/YOLO_NAS_Pretrained_Export.ipynb) [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/blakeblackshear/frigate/blob/dev/notebooks/YOLO_NAS_Pretrained_Export.ipynb).

:::warning

The pre-trained YOLO-NAS weights from DeciAI are subject to their license and can't be used commercially. For more information, see: https://docs.deci.ai/super-gradients/latest/LICENSE.YOLONAS.html

:::

The input image size in this notebook is set to 320x320. This results in lower CPU usage and faster inference times without impacting performance in most cases due to the way Frigate crops video frames to areas of interest before running detection. The notebook and config can be updated to 640x640 if desired.

After placing the downloaded onnx model in your config folder, you can use the following configuration:

```yaml
detectors:
  ov:
    type: openvino
    device: GPU

model:
  model_type: yolonas
  width: 320 # <--- should match whatever was set in notebook
  height: 320 # <--- should match whatever was set in notebook
  input_tensor: nchw
  input_pixel_format: bgr
  path: /config/yolo_nas_s.onnx
  labelmap_path: /labelmap/coco-80.txt
```

Note that the labelmap uses a subset of the complete COCO label set that has only 80 objects.

## NVidia TensorRT Detector

Nvidia GPUs may be used for object detection using the TensorRT libraries. Due to the size of the additional libraries, this detector is only provided in images with the `-tensorrt` tag suffix, e.g. `ghcr.io/blakeblackshear/frigate:stable-tensorrt`. This detector is designed to work with Yolo models for object detection.

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

The TensorRT detector can be selected by specifying `tensorrt` as the model type. The GPU will need to be passed through to the docker container using the same methods described in the [Hardware Acceleration](hardware_acceleration.md#nvidia-gpus) section. If you pass through multiple GPUs, you can select which GPU is used for a detector with the `device` configuration parameter. The `device` parameter is an integer value of the GPU index, as shown by `nvidia-smi` within the container.

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

## AMD/ROCm GPU detector

### Setup

The `rocm` detector supports running YOLO-NAS models on AMD GPUs. Use a frigate docker image with `-rocm` suffix, for example `ghcr.io/blakeblackshear/frigate:stable-rocm`.

### Docker settings for GPU access

ROCm needs access to the `/dev/kfd` and `/dev/dri` devices. When docker or frigate is not run under root then also `video` (and possibly `render` and `ssl/_ssl`) groups should be added.

When running docker directly the following flags should be added for device access:

```bash
$ docker run --device=/dev/kfd --device=/dev/dri  \
    ...
```

When using docker compose:

```yaml
services:
  frigate:
---
devices:
  - /dev/dri
  - /dev/kfd
```

For reference on recommended settings see [running ROCm/pytorch in Docker](https://rocm.docs.amd.com/projects/install-on-linux/en/develop/how-to/3rd-party/pytorch-install.html#using-docker-with-pytorch-pre-installed).

### Docker settings for overriding the GPU chipset

Your GPU might work just fine without any special configuration but in many cases they need manual settings. AMD/ROCm software stack comes with a limited set of GPU drivers and for newer or missing models you will have to override the chipset version to an older/generic version to get things working.

Also AMD/ROCm does not "officially" support integrated GPUs. It still does work with most of them just fine but requires special settings. One has to configure the `HSA_OVERRIDE_GFX_VERSION` environment variable. See the [ROCm bug report](https://github.com/ROCm/ROCm/issues/1743) for context and examples.

For the rocm frigate build there is some automatic detection:

- gfx90c -> 9.0.0
- gfx1031 -> 10.3.0
- gfx1103 -> 11.0.0

If you have something else you might need to override the `HSA_OVERRIDE_GFX_VERSION` at Docker launch. Suppose the version you want is `9.0.0`, then you should configure it from command line as:

```bash
$ docker run -e HSA_OVERRIDE_GFX_VERSION=9.0.0 \
    ...
```

When using docker compose:

```yaml
services:
  frigate:
...
environment:
  HSA_OVERRIDE_GFX_VERSION: "9.0.0"
```

Figuring out what version you need can be complicated as you can't tell the chipset name and driver from the AMD brand name.

- first make sure that rocm environment is running properly by running `/opt/rocm/bin/rocminfo` in the frigate container -- it should list both the CPU and the GPU with their properties
- find the chipset version you have (gfxNNN) from the output of the `rocminfo` (see below)
- use a search engine to query what `HSA_OVERRIDE_GFX_VERSION` you need for the given gfx name ("gfxNNN ROCm HSA_OVERRIDE_GFX_VERSION")
- override the `HSA_OVERRIDE_GFX_VERSION` with relevant value
- if things are not working check the frigate docker logs

#### Figuring out if AMD/ROCm is working and found your GPU

```bash
$ docker exec -it frigate /opt/rocm/bin/rocminfo
```

#### Figuring out your AMD GPU chipset version:

We unset the `HSA_OVERRIDE_GFX_VERSION` to prevent an existing override from messing up the result:

```bash
$ docker exec -it frigate /bin/bash -c '(unset HSA_OVERRIDE_GFX_VERSION && /opt/rocm/bin/rocminfo |grep gfx)'
```

### Supported Models

There is no default model provided, the following formats are supported:

#### YOLO-NAS

[YOLO-NAS](https://github.com/Deci-AI/super-gradients/blob/master/YOLONAS.md) models are supported, but not included by default. You can build and download a compatible model with pre-trained weights using [this notebook](https://github.com/frigate/blob/dev/notebooks/YOLO_NAS_Pretrained_Export.ipynb) [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/blakeblackshear/frigate/blob/dev/notebooks/YOLO_NAS_Pretrained_Export.ipynb).

:::warning

The pre-trained YOLO-NAS weights from DeciAI are subject to their license and can't be used commercially. For more information, see: https://docs.deci.ai/super-gradients/latest/LICENSE.YOLONAS.html

:::

The input image size in this notebook is set to 320x320. This results in lower CPU usage and faster inference times without impacting performance in most cases due to the way Frigate crops video frames to areas of interest before running detection. The notebook and config can be updated to 640x640 if desired.

After placing the downloaded onnx model in your config folder, you can use the following configuration:

```yaml
detectors:
  rocm:
    type: rocm

model:
  model_type: yolonas
  width: 320 # <--- should match whatever was set in notebook
  height: 320 # <--- should match whatever was set in notebook
  input_pixel_format: bgr
  path: /config/yolo_nas_s.onnx
  labelmap_path: /labelmap/coco-80.txt
```

Note that the labelmap uses a subset of the complete COCO label set that has only 80 objects.

## ONNX

ONNX is an open format for building machine learning models, Frigate supports running ONNX models on CPU, OpenVINO, and TensorRT. On startup Frigate will automatically try to use a GPU if one is available.

:::tip

When using many cameras one detector may not be enough to keep up. Multiple detectors can be defined assuming GPU resources are available. An example configuration would be:

```yaml
detectors:
  onnx_0:
    type: onnx
  onnx_1:
    type: onnx
```

:::

### Supported Models

There is no default model provided, the following formats are supported:

#### YOLO-NAS

[YOLO-NAS](https://github.com/Deci-AI/super-gradients/blob/master/YOLONAS.md) models are supported, but not included by default. You can build and download a compatible model with pre-trained weights using [this notebook](https://github.com/frigate/blob/dev/notebooks/YOLO_NAS_Pretrained_Export.ipynb) [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/blakeblackshear/frigate/blob/dev/notebooks/YOLO_NAS_Pretrained_Export.ipynb).

:::warning

The pre-trained YOLO-NAS weights from DeciAI are subject to their license and can't be used commercially. For more information, see: https://docs.deci.ai/super-gradients/latest/LICENSE.YOLONAS.html

:::

The input image size in this notebook is set to 320x320. This results in lower CPU usage and faster inference times without impacting performance in most cases due to the way Frigate crops video frames to areas of interest before running detection. The notebook and config can be updated to 640x640 if desired.

After placing the downloaded onnx model in your config folder, you can use the following configuration:

```yaml
detectors:
  onnx:
    type: onnx

model:
  model_type: yolonas
  width: 320 # <--- should match whatever was set in notebook
  height: 320 # <--- should match whatever was set in notebook
  input_pixel_format: bgr
  path: /config/yolo_nas_s.onnx
  labelmap_path: /labelmap/coco-80.txt
```

Note that the labelmap uses a subset of the complete COCO label set that has only 80 objects.

## CPU Detector (not recommended)

The CPU detector type runs a TensorFlow Lite model utilizing the CPU without hardware acceleration. It is recommended to use a hardware accelerated detector type instead for better performance. To configure a CPU based detector, set the `"type"` attribute to `"cpu"`.

:::danger

The CPU detector is not recommended for general use. If you do not have GPU or Edge TPU hardware, using the [OpenVINO Detector](#openvino-detector) in CPU mode is often more efficient than using the CPU detector.

:::

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

## Rockchip platform

Hardware accelerated object detection is supported on the following SoCs:

- RK3562
- RK3566
- RK3568
- RK3576
- RK3588

This implementation uses the [Rockchip's RKNN-Toolkit2](https://github.com/airockchip/rknn-toolkit2/), version v2.0.0.beta0. Currently, only [Yolo-NAS](https://github.com/Deci-AI/super-gradients/blob/master/YOLONAS.md) is supported as object detection model.

### Prerequisites

Make sure to follow the [Rockchip specific installation instrucitions](/frigate/installation#rockchip-platform).

### Configuration

This `config.yml` shows all relevant options to configure the detector and explains them. All values shown are the default values (except for two). Lines that are required at least to use the detector are labeled as required, all other lines are optional.

```yaml
detectors: # required
  rknn: # required
    type: rknn # required
    # number of NPU cores to use
    # 0 means choose automatically
    # increase for better performance if you have a multicore NPU e.g. set to 3 on rk3588
    num_cores: 0

model: # required
  # name of model (will be automatically downloaded) or path to your own .rknn model file
  # possible values are:
  # - deci-fp16-yolonas_s
  # - deci-fp16-yolonas_m
  # - deci-fp16-yolonas_l
  # - /config/model_cache/your_custom_model.rknn
  path: deci-fp16-yolonas_s
  # width and height of detection frames
  width: 320
  height: 320
  # pixel format of detection frame
  # default value is rgb but yolo models usually use bgr format
  input_pixel_format: bgr # required
  # shape of detection frame
  input_tensor: nhwc
  # needs to be adjusted to model, see below
  labelmap_path: /labelmap.txt # required
```

The correct labelmap must be loaded for each model. If you use a custom model (see notes below), you must make sure to provide the correct labelmap. The table below lists the correct paths for the bundled models:

| `path`                | `labelmap_path`       |
| --------------------- | --------------------- |
| deci-fp16-yolonas\_\* | /labelmap/coco-80.txt |

### Choosing a model

:::warning

The pre-trained YOLO-NAS weights from DeciAI are subject to their license and can't be used commercially. For more information, see: https://docs.deci.ai/super-gradients/latest/LICENSE.YOLONAS.html

:::

The inference time was determined on a rk3588 with 3 NPU cores.

| Model               | Size in mb | Inference time in ms |
| ------------------- | ---------- | -------------------- |
| deci-fp16-yolonas_s | 24         | 25                   |
| deci-fp16-yolonas_m | 62         | 35                   |
| deci-fp16-yolonas_l | 81         | 45                   |

:::tip

You can get the load of your NPU with the following command:

```bash
$ cat /sys/kernel/debug/rknpu/load
>> NPU load:  Core0:  0%, Core1:  0%, Core2:  0%,
```

:::

- All models are automatically downloaded and stored in the folder `config/model_cache/rknn_cache`. After upgrading Frigate, you should remove older models to free up space.
- You can also provide your own `.rknn` model. You should not save your own models in the `rknn_cache` folder, store them directly in the `model_cache` folder or another subfolder. To convert a model to `.rknn` format see the `rknn-toolkit2` (requires a x86 machine). Note, that there is only post-processing for the supported models.

## Hailo-8l

This detector is available for use with Hailo-8 AI Acceleration Module.

See the [installation docs](../frigate/installation.md#hailo-8l) for information on configuring the hailo8.

### Configuration

```yaml
detectors:
  hailo8l:
    type: hailo8l
    device: PCIe
    model:
      path: /config/model_cache/h8l_cache/ssd_mobilenet_v1.hef

model:
  width: 300
  height: 300
  input_tensor: nhwc
  input_pixel_format: bgr
  model_type: ssd
```
