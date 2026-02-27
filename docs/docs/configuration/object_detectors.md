---
id: object_detectors
title: Object Detectors
---

import CommunityBadge from '@site/src/components/CommunityBadge';

# Supported Hardware

:::info

Frigate supports multiple different detectors that work on different types of hardware:

**Most Hardware**

- [Coral EdgeTPU](#edge-tpu-detector): The Google Coral EdgeTPU is available in USB, Mini PCIe, and m.2 formats allowing for a wide range of compatibility with devices.
- [Hailo](#hailo-8): The Hailo8 and Hailo8L AI Acceleration module is available in m.2 format with a HAT for RPi devices, offering a wide range of compatibility with devices.
- <CommunityBadge /> [MemryX](#memryx-mx3): The MX3 Acceleration module is available in m.2 format, offering broad compatibility across various platforms.
- <CommunityBadge /> [DeGirum](#degirum): Service for using hardware devices in the cloud or locally. Hardware and models provided on the cloud on [their website](https://hub.degirum.com).

**AMD**

- [ROCm](#amdrocm-gpu-detector): ROCm can run on AMD Discrete GPUs to provide efficient object detection.
- [ONNX](#onnx): ROCm will automatically be detected and used as a detector in the `-rocm` Frigate image when a supported ONNX model is configured.

**Apple Silicon**

- [Apple Silicon](#apple-silicon-detector): Apple Silicon can run on M1 and newer Apple Silicon devices.

**Intel**

- [OpenVino](#openvino-detector): OpenVino can run on Intel Arc GPUs, Intel integrated GPUs, and Intel CPUs to provide efficient object detection.
- [ONNX](#onnx): OpenVINO will automatically be detected and used as a detector in the default Frigate image when a supported ONNX model is configured.

**Nvidia GPU**

- [ONNX](#onnx): Nvidia GPUs will automatically be detected and used as a detector in the `-tensorrt` Frigate image when a supported ONNX model is configured.

**Nvidia Jetson** <CommunityBadge />

- [TensortRT](#nvidia-tensorrt-detector): TensorRT can run on Jetson devices, using one of many default models.
- [ONNX](#onnx): TensorRT will automatically be detected and used as a detector in the `-tensorrt-jp6` Frigate image when a supported ONNX model is configured.

**Rockchip** <CommunityBadge />

- [RKNN](#rockchip-platform): RKNN models can run on Rockchip devices with included NPUs.

**Synaptics** <CommunityBadge />

- [Synaptics](#synaptics): synap models can run on Synaptics devices(e.g astra machina) with included NPUs.

**For Testing**

- [CPU Detector (not recommended for actual use](#cpu-detector-not-recommended): Use a CPU to run tflite model, this is not recommended and in most cases OpenVINO can be used in CPU mode with better results.

:::

:::note

Multiple detectors can not be mixed for object detection (ex: OpenVINO and Coral EdgeTPU can not be used for object detection at the same time).

This does not affect using hardware for accelerating other tasks such as [semantic search](./semantic_search.md)

:::

# Officially Supported Detectors

Frigate provides a number of builtin detector types. By default, Frigate will use a single CPU detector. Other detectors may require additional configuration as described below. When using multiple detectors they will run in dedicated processes, but pull from a common queue of detection requests from across all cameras.

## Edge TPU Detector

The Edge TPU detector type runs TensorFlow Lite models utilizing the Google Coral delegate for hardware acceleration. To configure an Edge TPU detector, set the `"type"` attribute to `"edgetpu"`.

The Edge TPU device can be specified using the `"device"` attribute according to the [Documentation for the TensorFlow Lite Python API](https://coral.ai/docs/edgetpu/multiple-edgetpu/#using-the-tensorflow-lite-python-api). If not set, the delegate will use the first device it finds.

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

### EdgeTPU Supported Models

| Model                   | Notes                                       |
| ----------------------- | ------------------------------------------- |
| [Mobiledet](#mobiledet) | Default model                               |
| [YOLOv9](#yolov9)       | More accurate but slower than default model |

#### Mobiledet

A TensorFlow Lite model is provided in the container at `/edgetpu_model.tflite` and is used by this detector type by default. To provide your own model, bind mount the file into the container and provide the path with `model.path`.

#### YOLOv9

YOLOv9 models that are compiled for TensorFlow Lite and properly quantized are supported, but not included by default. [Instructions](#yolov9-for-google-coral-support) for downloading a model with support for the Google Coral.

:::tip

**Frigate+ Users:** Follow the [instructions](../integrations/plus#use-models) to set a model ID in your config file.

:::

<details>
  <summary>YOLOv9 Setup & Config</summary>

After placing the downloaded files for the tflite model and labels in your config folder, you can use the following configuration:

```yaml
detectors:
  coral:
    type: edgetpu
    device: usb

model:
  model_type: yolo-generic
  width: 320 # <--- should match the imgsize of the model, typically 320
  height: 320 # <--- should match the imgsize of the model, typically 320
  path: /config/model_cache/yolov9-s-relu6-best_320_int8_edgetpu.tflite
  labelmap_path: /config/labels-coco17.txt
```

Note that due to hardware limitations of the Coral, the labelmap is a subset of the COCO labels and includes only 17 object classes.

</details>

---

## Hailo-8

This detector is available for use with both Hailo-8 and Hailo-8L AI Acceleration Modules. The integration automatically detects your hardware architecture via the Hailo CLI and selects the appropriate default model if no custom model is specified.

See the [installation docs](../frigate/installation.md#hailo-8l) for information on configuring the Hailo hardware.

### Configuration

When configuring the Hailo detector, you have two options to specify the model: a local **path** or a **URL**.
If both are provided, the detector will first check for the model at the given local path. If the file is not found, it will download the model from the specified URL. The model file is cached under `/config/model_cache/hailo`.

#### YOLO

Use this configuration for YOLO-based models. When no custom model path or URL is provided, the detector automatically downloads the default model based on the detected hardware:

- **Hailo-8 hardware:** Uses **YOLOv6n** (default: `yolov6n.hef`)
- **Hailo-8L hardware:** Uses **YOLOv6n** (default: `yolov6n.hef`)

```yaml
detectors:
  hailo:
    type: hailo8l
    device: PCIe

model:
  width: 320
  height: 320
  input_tensor: nhwc
  input_pixel_format: rgb
  input_dtype: int
  model_type: yolo-generic
  labelmap_path: /labelmap/coco-80.txt

  # The detector automatically selects the default model based on your hardware:
  # - For Hailo-8 hardware: YOLOv6n (default: yolov6n.hef)
  # - For Hailo-8L hardware: YOLOv6n (default: yolov6n.hef)
  #
  # Optionally, you can specify a local model path to override the default.
  # If a local path is provided and the file exists, it will be used instead of downloading.
  # Example:
  # path: /config/model_cache/hailo/yolov6n.hef
  #
  # You can also override using a custom URL:
  # path: https://hailo-model-zoo.s3.eu-west-2.amazonaws.com/ModelZoo/Compiled/v2.14.0/hailo8/yolov6n.hef
  # just make sure to give it the write configuration based on the model
```

#### SSD

For SSD-based models, provide either a model path or URL to your compiled SSD model. The integration will first check the local path before downloading if necessary.

```yaml
detectors:
  hailo:
    type: hailo8l
    device: PCIe

model:
  width: 300
  height: 300
  input_tensor: nhwc
  input_pixel_format: rgb
  model_type: ssd
  # Specify the local model path (if available) or URL for SSD MobileNet v1.
  # Example with a local path:
  # path: /config/model_cache/h8l_cache/ssd_mobilenet_v1.hef
  #
  # Or override using a custom URL:
  # path: https://hailo-model-zoo.s3.eu-west-2.amazonaws.com/ModelZoo/Compiled/v2.14.0/hailo8l/ssd_mobilenet_v1.hef
```

#### Custom Models

The Hailo detector supports all YOLO models compiled for Hailo hardware that include post-processing. You can specify a custom URL or a local path to download or use your model directly. If both are provided, the detector checks the local path first.

```yaml
detectors:
  hailo:
    type: hailo8l
    device: PCIe

model:
  width: 640
  height: 640
  input_tensor: nhwc
  input_pixel_format: rgb
  input_dtype: int
  model_type: yolo-generic
  labelmap_path: /labelmap/coco-80.txt
  # Optional: Specify a local model path.
  # path: /config/model_cache/hailo/custom_model.hef
  #
  # Alternatively, or as a fallback, provide a custom URL:
  # path: https://custom-model-url.com/path/to/model.hef
```

For additional ready-to-use models, please visit: https://github.com/hailo-ai/hailo_model_zoo

Hailo8 supports all models in the Hailo Model Zoo that include HailoRT post-processing. You're welcome to choose any of these pre-configured models for your implementation.

> **Note:**
> The config.path parameter can accept either a local file path or a URL ending with .hef. When provided, the detector will first check if the path is a local file path. If the file exists locally, it will use it directly. If the file is not found locally or if a URL was provided, it will attempt to download the model from the specified URL.

---

## OpenVINO Detector

The OpenVINO detector type runs an OpenVINO IR model on AMD and Intel CPUs, Intel GPUs and Intel NPUs. To configure an OpenVINO detector, set the `"type"` attribute to `"openvino"`.

The OpenVINO device to be used is specified using the `"device"` attribute according to the naming conventions in the [Device Documentation](https://docs.openvino.ai/2025/openvino-workflow/running-inference/inference-devices-and-modes.html). The most common devices are `CPU`, `GPU`, or `NPU`.

OpenVINO is supported on 6th Gen Intel platforms (Skylake) and newer. It will also run on AMD CPUs despite having no official support for it. A supported Intel platform is required to use the `GPU` or `NPU` device with OpenVINO. For detailed system requirements, see [OpenVINO System Requirements](https://docs.openvino.ai/2025/about-openvino/release-notes-openvino/system-requirements.html)

:::tip

**NPU + GPU Systems:** If you have both NPU and GPU available (Intel Core Ultra processors), use NPU for object detection and GPU for enrichments (semantic search, face recognition, etc.) for best performance and compatibility.

When using many cameras one detector may not be enough to keep up. Multiple detectors can be defined assuming GPU resources are available. An example configuration would be:

```yaml
detectors:
  ov_0:
    type: openvino
    device: GPU # or NPU
  ov_1:
    type: openvino
    device: GPU # or NPU
```

:::

### OpenVINO Supported Models

| Model                                 | GPU | NPU | Notes                                                        |
| ------------------------------------- | --- | --- | ------------------------------------------------------------ |
| [YOLOv9](#yolo-v3-v4-v7-v9)           | ✅  | ✅  | Recommended for GPU & NPU                                    |
| [RF-DETR](#rf-detr)                   | ✅  | ✅  | Requires XE iGPU or Arc                                      |
| [YOLO-NAS](#yolo-nas)                 | ✅  | ✅  |                                                              |
| [MobileNet v2](#ssdlite-mobilenet-v2) | ✅  | ✅  | Fast and lightweight model, less accurate than larger models |
| [YOLOX](#yolox)                       | ✅  | ?   |                                                              |
| [D-FINE](#d-fine)                     | ❌  | ❌  |                                                              |

#### SSDLite MobileNet v2

An OpenVINO model is provided in the container at `/openvino-model/ssdlite_mobilenet_v2.xml` and is used by this detector type by default. The model comes from Intel's Open Model Zoo [SSDLite MobileNet V2](https://github.com/openvinotoolkit/open_model_zoo/tree/master/models/public/ssdlite_mobilenet_v2) and is converted to an FP16 precision IR model.

<details>
  <summary>MobileNet v2 Config</summary>

Use the model configuration shown below when using the OpenVINO detector with the default OpenVINO model:

```yaml
detectors:
  ov:
    type: openvino
    device: GPU # Or NPU

model:
  width: 300
  height: 300
  input_tensor: nhwc
  input_pixel_format: bgr
  path: /openvino-model/ssdlite_mobilenet_v2.xml
  labelmap_path: /openvino-model/coco_91cl_bkgr.txt
```

</details>

#### YOLOX

This detector also supports YOLOX. Frigate does not come with any YOLOX models preloaded, so you will need to supply your own models.

#### YOLO-NAS

[YOLO-NAS](https://github.com/Deci-AI/super-gradients/blob/master/YOLONAS.md) models are supported, but not included by default. See [the models section](#downloading-yolo-nas-model) for more information on downloading the YOLO-NAS model for use in Frigate.

<details>
  <summary>YOLO-NAS Setup & Config</summary>

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

</details>

#### YOLO (v3, v4, v7, v9)

YOLOv3, YOLOv4, YOLOv7, and [YOLOv9](https://github.com/WongKinYiu/yolov9) models are supported, but not included by default.

:::tip

The YOLO detector has been designed to support YOLOv3, YOLOv4, YOLOv7, and YOLOv9 models, but may support other YOLO model architectures as well.

:::

<details>
  <summary>YOLOv Setup & Config</summary>

:::warning

If you are using a Frigate+ model, you should not define any of the below `model` parameters in your config except for `path`. See [the Frigate+ model docs](/plus/first_model#step-3-set-your-model-id-in-the-config) for more information on setting up your model.

:::

After placing the downloaded onnx model in your config folder, you can use the following configuration:

```yaml
detectors:
  ov:
    type: openvino
    device: GPU # or NPU

model:
  model_type: yolo-generic
  width: 320 # <--- should match the imgsize set during model export
  height: 320 # <--- should match the imgsize set during model export
  input_tensor: nchw
  input_dtype: float
  path: /config/model_cache/yolo.onnx
  labelmap_path: /labelmap/coco-80.txt
```

Note that the labelmap uses a subset of the complete COCO label set that has only 80 objects.

</details>

#### RF-DETR

[RF-DETR](https://github.com/roboflow/rf-detr) is a DETR based model. The ONNX exported models are supported, but not included by default. See [the models section](#downloading-rf-detr-model) for more informatoin on downloading the RF-DETR model for use in Frigate.

:::warning

Due to the size and complexity of the RF-DETR model, it is only recommended to be run with discrete Arc Graphics Cards.

:::

<details>
  <summary>RF-DETR Setup & Config</summary>

After placing the downloaded onnx model in your `config/model_cache` folder, you can use the following configuration:

```yaml
detectors:
  ov:
    type: openvino
    device: GPU

model:
  model_type: rfdetr
  width: 320
  height: 320
  input_tensor: nchw
  input_dtype: float
  path: /config/model_cache/rfdetr.onnx
```

</details>

#### D-FINE

[D-FINE](https://github.com/Peterande/D-FINE) is a DETR based model. The ONNX exported models are supported, but not included by default. See [the models section](#downloading-d-fine-model) for more information on downloading the D-FINE model for use in Frigate.

:::warning

Currently D-FINE models only run on OpenVINO in CPU mode, GPUs currently fail to compile the model

:::

<details>
  <summary>D-FINE Setup & Config</summary>

After placing the downloaded onnx model in your config/model_cache folder, you can use the following configuration:

```yaml
detectors:
  ov:
    type: openvino
    device: CPU

model:
  model_type: dfine
  width: 640
  height: 640
  input_tensor: nchw
  input_dtype: float
  path: /config/model_cache/dfine-s.onnx
  labelmap_path: /labelmap/coco-80.txt
```

Note that the labelmap uses a subset of the complete COCO label set that has only 80 objects.

</details>

## Apple Silicon detector

The NPU in Apple Silicon can't be accessed from within a container, so the [Apple Silicon detector client](https://github.com/frigate-nvr/apple-silicon-detector) must first be setup. It is recommended to use the Frigate docker image with `-standard-arm64` suffix, for example `ghcr.io/blakeblackshear/frigate:stable-standard-arm64`.

### Setup

1. Setup the [Apple Silicon detector client](https://github.com/frigate-nvr/apple-silicon-detector) and run the client
2. Configure the detector in Frigate and startup Frigate

### Configuration

Using the detector config below will connect to the client:

```yaml
detectors:
  apple-silicon:
    type: zmq
    endpoint: tcp://host.docker.internal:5555
```

### Apple Silicon Supported Models

There is no default model provided, the following formats are supported:

#### YOLO (v3, v4, v7, v9)

YOLOv3, YOLOv4, YOLOv7, and [YOLOv9](https://github.com/WongKinYiu/yolov9) models are supported, but not included by default.

:::tip

The YOLO detector has been designed to support YOLOv3, YOLOv4, YOLOv7, and YOLOv9 models, but may support other YOLO model architectures as well. See [the models section](#downloading-yolo-models) for more information on downloading YOLO models for use in Frigate.

:::

When Frigate is started with the following config it will connect to the detector client and transfer the model automatically:

```yaml
detectors:
  apple-silicon:
    type: zmq
    endpoint: tcp://host.docker.internal:5555

model:
  model_type: yolo-generic
  width: 320 # <--- should match the imgsize set during model export
  height: 320 # <--- should match the imgsize set during model export
  input_tensor: nchw
  input_dtype: float
  path: /config/model_cache/yolo.onnx
  labelmap_path: /labelmap/coco-80.txt
```

Note that the labelmap uses a subset of the complete COCO label set that has only 80 objects.

## AMD/ROCm GPU detector

### Setup

Support for AMD GPUs is provided using the [ONNX detector](#ONNX). In order to utilize the AMD GPU for object detection use a frigate docker image with `-rocm` suffix, for example `ghcr.io/blakeblackshear/frigate:stable-rocm`.

### Docker settings for GPU access

ROCm needs access to the `/dev/kfd` and `/dev/dri` devices. When docker or frigate is not run under root then also `video` (and possibly `render` and `ssl/_ssl`) groups should be added.

When running docker directly the following flags should be added for device access:

```bash
$ docker run --device=/dev/kfd --device=/dev/dri  \
    ...
```

When using Docker Compose:

```yaml
services:
  frigate:
    ...
    devices:
      - /dev/dri
      - /dev/kfd
```

For reference on recommended settings see [running ROCm/pytorch in Docker](https://rocm.docs.amd.com/projects/install-on-linux/en/develop/how-to/3rd-party/pytorch-install.html#using-docker-with-pytorch-pre-installed).

### Docker settings for overriding the GPU chipset

Your GPU might work just fine without any special configuration but in many cases they need manual settings. AMD/ROCm software stack comes with a limited set of GPU drivers and for newer or missing models you will have to override the chipset version to an older/generic version to get things working.

Also AMD/ROCm does not "officially" support integrated GPUs. It still does work with most of them just fine but requires special settings. One has to configure the `HSA_OVERRIDE_GFX_VERSION` environment variable. See the [ROCm bug report](https://github.com/ROCm/ROCm/issues/1743) for context and examples.

For the rocm frigate build there is some automatic detection:

- gfx1031 -> 10.3.0
- gfx1103 -> 11.0.0

If you have something else you might need to override the `HSA_OVERRIDE_GFX_VERSION` at Docker launch. Suppose the version you want is `10.0.0`, then you should configure it from command line as:

```bash
$ docker run -e HSA_OVERRIDE_GFX_VERSION=10.0.0 \
    ...
```

When using Docker Compose:

```yaml
services:
  frigate:
    ...
    environment:
      HSA_OVERRIDE_GFX_VERSION: "10.0.0"
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

### ROCm Supported Models

:::tip

The AMD GPU kernel is known problematic especially when converting models to mxr format. The recommended approach is:

1. Disable object detection in the config.
2. Startup Frigate with the onnx detector configured, the main object detection model will be converted to mxr format and cached in the config directory.
3. Once this is finished as indicated by the logs, enable object detection in the UI and confirm that it is working correctly.
4. Re-enable object detection in the config.

:::

See [ONNX supported models](#supported-models) for supported models, there are some caveats:

- D-FINE models are not supported
- YOLO-NAS models are known to not run well on integrated GPUs

## ONNX

ONNX is an open format for building machine learning models, Frigate supports running ONNX models on CPU, OpenVINO, ROCm, and TensorRT. On startup Frigate will automatically try to use a GPU if one is available.

:::info

If the correct build is used for your GPU then the GPU will be detected and used automatically.

- **AMD**
  - ROCm will automatically be detected and used with the ONNX detector in the `-rocm` Frigate image.

- **Intel**
  - OpenVINO will automatically be detected and used with the ONNX detector in the default Frigate image.

- **Nvidia**
  - Nvidia GPUs will automatically be detected and used with the ONNX detector in the `-tensorrt` Frigate image.
  - Jetson devices will automatically be detected and used with the ONNX detector in the `-tensorrt-jp6` Frigate image.

:::

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

### ONNX Supported Models

| Model                         | Nvidia GPU | AMD GPU | Notes                                               |
| ----------------------------- | ---------- | ------- | --------------------------------------------------- |
| [YOLOv9](#yolo-v3-v4-v7-v9-2) | ✅         | ✅      | Supports CUDA Graphs for optimal Nvidia performance |
| [RF-DETR](#rf-detr)           | ✅         | ❌      | Supports CUDA Graphs for optimal Nvidia performance |
| [YOLO-NAS](#yolo-nas-1)       | ⚠️         | ⚠️      | Not supported by CUDA Graphs                        |
| [YOLOX](#yolox-1)             | ✅         | ✅      | Supports CUDA Graphs for optimal Nvidia performance |
| [D-FINE](#d-fine)             | ⚠️         | ❌      | Not supported by CUDA Graphs                        |

There is no default model provided, the following formats are supported:

#### YOLO-NAS

[YOLO-NAS](https://github.com/Deci-AI/super-gradients/blob/master/YOLONAS.md) models are supported, but not included by default. See [the models section](#downloading-yolo-nas-model) for more information on downloading the YOLO-NAS model for use in Frigate.

<details>
  <summary>YOLO-NAS Setup & Config</summary>

:::warning

If you are using a Frigate+ YOLO-NAS model, you should not define any of the below `model` parameters in your config except for `path`. See [the Frigate+ model docs](/plus/first_model#step-3-set-your-model-id-in-the-config) for more information on setting up your model.

:::

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
  input_tensor: nchw
  path: /config/yolo_nas_s.onnx
  labelmap_path: /labelmap/coco-80.txt
```

</details>

#### YOLO (v3, v4, v7, v9)

YOLOv3, YOLOv4, YOLOv7, and [YOLOv9](https://github.com/WongKinYiu/yolov9) models are supported, but not included by default.

:::tip

The YOLO detector has been designed to support YOLOv3, YOLOv4, YOLOv7, and YOLOv9 models, but may support other YOLO model architectures as well. See [the models section](#downloading-yolo-models) for more information on downloading YOLO models for use in Frigate.

:::

<details>
  <summary>YOLOv Setup & Config</summary>

:::warning

If you are using a Frigate+ model, you should not define any of the below `model` parameters in your config except for `path`. See [the Frigate+ model docs](/plus/first_model#step-3-set-your-model-id-in-the-config) for more information on setting up your model.

:::

After placing the downloaded onnx model in your config folder, you can use the following configuration:

```yaml
detectors:
  onnx:
    type: onnx

model:
  model_type: yolo-generic
  width: 320 # <--- should match the imgsize set during model export
  height: 320 # <--- should match the imgsize set during model export
  input_tensor: nchw
  input_dtype: float
  path: /config/model_cache/yolo.onnx
  labelmap_path: /labelmap/coco-80.txt
```

</details>

Note that the labelmap uses a subset of the complete COCO label set that has only 80 objects.

#### YOLOx

[YOLOx](https://github.com/Megvii-BaseDetection/YOLOX) models are supported, but not included by default. See [the models section](#downloading-yolo-models) for more information on downloading the YOLOx model for use in Frigate.

<details>
  <summary>YOLOx Setup & Config</summary>

After placing the downloaded onnx model in your config folder, you can use the following configuration:

```yaml
detectors:
  onnx:
    type: onnx

model:
  model_type: yolox
  width: 416 # <--- should match the imgsize set during model export
  height: 416 # <--- should match the imgsize set during model export
  input_tensor: nchw
  input_dtype: float_denorm
  path: /config/model_cache/yolox_tiny.onnx
  labelmap_path: /labelmap/coco-80.txt
```

Note that the labelmap uses a subset of the complete COCO label set that has only 80 objects.

</details>

#### RF-DETR

[RF-DETR](https://github.com/roboflow/rf-detr) is a DETR based model. The ONNX exported models are supported, but not included by default. See [the models section](#downloading-rf-detr-model) for more information on downloading the RF-DETR model for use in Frigate.

<details>
  <summary>RF-DETR Setup & Config</summary>

After placing the downloaded onnx model in your `config/model_cache` folder, you can use the following configuration:

```yaml
detectors:
  onnx:
    type: onnx

model:
  model_type: rfdetr
  width: 320
  height: 320
  input_tensor: nchw
  input_dtype: float
  path: /config/model_cache/rfdetr.onnx
```

</details>

#### D-FINE

[D-FINE](https://github.com/Peterande/D-FINE) is a DETR based model. The ONNX exported models are supported, but not included by default. See [the models section](#downloading-d-fine-model) for more information on downloading the D-FINE model for use in Frigate.

<details>
  <summary>D-FINE Setup & Config</summary>

After placing the downloaded onnx model in your `config/model_cache` folder, you can use the following configuration:

```yaml
detectors:
  onnx:
    type: onnx

model:
  model_type: dfine
  width: 640
  height: 640
  input_tensor: nchw
  input_dtype: float
  path: /config/model_cache/dfine_m_obj2coco.onnx
  labelmap_path: /labelmap/coco-80.txt
```

</details>

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
  cpu2:
    type: cpu
    num_threads: 3

model:
  path: "/custom_model.tflite"
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

## MemryX MX3

This detector is available for use with the MemryX MX3 accelerator M.2 module. Frigate supports the MX3 on compatible hardware platforms, providing efficient and high-performance object detection.

See the [installation docs](../frigate/installation.md#memryx-mx3) for information on configuring the MemryX hardware.

To configure a MemryX detector, simply set the `type` attribute to `memryx` and follow the configuration guide below.

### Configuration

To configure the MemryX detector, use the following example configuration:

#### Single PCIe MemryX MX3

```yaml
detectors:
  memx0:
    type: memryx
    device: PCIe:0
```

#### Multiple PCIe MemryX MX3 Modules

```yaml
detectors:
  memx0:
    type: memryx
    device: PCIe:0

  memx1:
    type: memryx
    device: PCIe:1

  memx2:
    type: memryx
    device: PCIe:2
```

### Supported Models

MemryX `.dfp` models are automatically downloaded at runtime, if enabled, to the container at `/memryx_models/model_folder/`.

#### YOLO-NAS

The [YOLO-NAS](https://github.com/Deci-AI/super-gradients/blob/master/YOLONAS.md) model included in this detector is downloaded from the [Models Section](#downloading-yolo-nas-model) and compiled to DFP with [mx_nc](https://developer.memryx.com/tools/neural_compiler.html#usage).

**Note:** The default model for the MemryX detector is YOLO-NAS 320x320.

The input size for **YOLO-NAS** can be set to either **320x320** (default) or **640x640**.

- The default size of **320x320** is optimized for lower CPU usage and faster inference times.

##### Configuration

Below is the recommended configuration for using the **YOLO-NAS** (small) model with the MemryX detector:

```yaml
detectors:
  memx0:
    type: memryx
    device: PCIe:0

model:
  model_type: yolonas
  width: 320 # (Can be set to 640 for higher resolution)
  height: 320 # (Can be set to 640 for higher resolution)
  input_tensor: nchw
  input_dtype: float
  labelmap_path: /labelmap/coco-80.txt
  # Optional: The model is normally fetched through the runtime, so 'path' can be omitted unless you want to use a custom or local model.
  # path: /config/yolonas.zip
  # The .zip file must contain:
  # ├── yolonas.dfp          (a file ending with .dfp)
  # └── yolonas_post.onnx    (optional; only if the model includes a cropped post-processing network)
```

#### YOLOv9

The YOLOv9s model included in this detector is downloaded from [the original GitHub](https://github.com/WongKinYiu/yolov9) like in the [Models Section](#yolov9-1) and compiled to DFP with [mx_nc](https://developer.memryx.com/tools/neural_compiler.html#usage).

##### Configuration

Below is the recommended configuration for using the **YOLOv9** (small) model with the MemryX detector:

```yaml
detectors:
  memx0:
    type: memryx
    device: PCIe:0

model:
  model_type: yolo-generic
  width: 320 # (Can be set to 640 for higher resolution)
  height: 320 # (Can be set to 640 for higher resolution)
  input_tensor: nchw
  input_dtype: float
  labelmap_path: /labelmap/coco-80.txt
  # Optional: The model is normally fetched through the runtime, so 'path' can be omitted unless you want to use a custom or local model.
  # path: /config/yolov9.zip
  # The .zip file must contain:
  # ├── yolov9.dfp          (a file ending with .dfp)
```

#### YOLOX

The model is sourced from the [OpenCV Model Zoo](https://github.com/opencv/opencv_zoo) and precompiled to DFP.

##### Configuration

Below is the recommended configuration for using the **YOLOX** (small) model with the MemryX detector:

```yaml
detectors:
  memx0:
    type: memryx
    device: PCIe:0

model:
  model_type: yolox
  width: 640
  height: 640
  input_tensor: nchw
  input_dtype: float_denorm
  labelmap_path: /labelmap/coco-80.txt
  # Optional: The model is normally fetched through the runtime, so 'path' can be omitted unless you want to use a custom or local model.
  # path: /config/yolox.zip
  # The .zip file must contain:
  # ├── yolox.dfp          (a file ending with .dfp)
```

#### SSDLite MobileNet v2

The model is sourced from the [OpenMMLab Model Zoo](https://mmdeploy-oss.openmmlab.com/model/mmdet-det/ssdlite-e8679f.onnx) and has been converted to DFP.

##### Configuration

Below is the recommended configuration for using the **SSDLite MobileNet v2** model with the MemryX detector:

```yaml
detectors:
  memx0:
    type: memryx
    device: PCIe:0

model:
  model_type: ssd
  width: 320
  height: 320
  input_tensor: nchw
  input_dtype: float
  labelmap_path: /labelmap/coco-80.txt
  # Optional: The model is normally fetched through the runtime, so 'path' can be omitted unless you want to use a custom or local model.
  # path: /config/ssdlite_mobilenet.zip
  # The .zip file must contain:
  # ├── ssdlite_mobilenet.dfp          (a file ending with .dfp)
  # └── ssdlite_mobilenet_post.onnx    (optional; only if the model includes a cropped post-processing network)
```

#### Using a Custom Model

To use your own model:

1.  Package your compiled model into a `.zip` file.

2.  The `.zip` must contain the compiled `.dfp` file.

3.  Depending on the model, the compiler may also generate a cropped post-processing network. If present, it will be named with the suffix `_post.onnx`.

4.  Bind-mount the `.zip` file into the container and specify its path using `model.path` in your config.

5.  Update the `labelmap_path` to match your custom model's labels.

For detailed instructions on compiling models, refer to the [MemryX Compiler](https://developer.memryx.com/tools/neural_compiler.html#usage) docs and [Tutorials](https://developer.memryx.com/tutorials/tutorials.html).

```yaml
# The detector automatically selects the default model if nothing is provided in the config.
#
# Optionally, you can specify a local model path as a .zip file to override the default.
# If a local path is provided and the file exists, it will be used instead of downloading.
#
# Example:
# path: /config/yolonas.zip
#
# The .zip file must contain:
# ├── yolonas.dfp          (a file ending with .dfp)
# └── yolonas_post.onnx    (optional; only if the model includes a cropped post-processing network)
```

---

## NVidia TensorRT Detector

Nvidia Jetson devices may be used for object detection using the TensorRT libraries. Due to the size of the additional libraries, this detector is only provided in images with the `-tensorrt-jp6` tag suffix, e.g. `ghcr.io/blakeblackshear/frigate:stable-tensorrt-jp6`. This detector is designed to work with Yolo models for object detection.

### Generate Models

The model used for TensorRT must be preprocessed on the same hardware platform that they will run on. This means that each user must run additional setup to generate a model file for the TensorRT library. A script is included that will build several common models.

The Frigate image will generate model files during startup if the specified model is not found. Processed models are stored in the `/config/model_cache` folder. Typically the `/config` path is mapped to a directory on the host already and the `model_cache` does not need to be mapped separately unless the user wants to store it in a different location on the host.

By default, no models will be generated, but this can be overridden by specifying the `YOLO_MODELS` environment variable in Docker. One or more models may be listed in a comma-separated format, and each one will be generated. Models will only be generated if the corresponding `{model}.trt` file is not present in the `model_cache` folder, so you can force a model to be regenerated by deleting it from your Frigate data folder.

If you have a Jetson device with DLAs (Xavier or Orin), you can generate a model that will run on the DLA by appending `-dla` to your model name, e.g. specify `YOLO_MODELS=yolov7-320-dla`. The model will run on DLA0 (Frigate does not currently support DLA1). DLA-incompatible layers will fall back to running on the GPU.

If your GPU does not support FP16 operations, you can pass the environment variable `USE_FP16=False` to disable it.

Specific models can be selected by passing an environment variable to the `docker run` command or in your `docker-compose.yml` file. Use the form `-e YOLO_MODELS=yolov4-416,yolov4-tiny-416` to select one or more model names. The models available are shown below.

<details>
<summary>Available Models</summary>
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
yolov7-416
yolov7-320
yolov7x-640
yolov7x-320
```
</details>

An example `docker-compose.yml` fragment that converts the `yolov4-608` and `yolov7x-640` models would look something like this:

```yml
frigate:
  environment:
    - YOLO_MODELS=yolov7-320,yolov7x-640
    - USE_FP16=false
```

### Configuration Parameters

The TensorRT detector can be selected by specifying `tensorrt` as the model type. The GPU will need to be passed through to the docker container using the same methods described in the [Hardware Acceleration](hardware_acceleration_video.md#nvidia-gpus) section. If you pass through multiple GPUs, you can select which GPU is used for a detector with the `device` configuration parameter. The `device` parameter is an integer value of the GPU index, as shown by `nvidia-smi` within the container.

The TensorRT detector uses `.trt` model files that are located in `/config/model_cache/tensorrt` by default. These model path and dimensions used will depend on which model you have generated.

Use the config below to work with generated TRT models:

```yaml
detectors:
  tensorrt:
    type: tensorrt
    device: 0 #This is the default, select the first GPU

model:
  path: /config/model_cache/tensorrt/yolov7-320.trt
  labelmap_path: /labelmap/coco-80.txt
  input_tensor: nchw
  input_pixel_format: rgb
  width: 320 # MUST match the chosen model i.e yolov7-320 -> 320, yolov4-416 -> 416
  height: 320 # MUST match the chosen model i.e yolov7-320 -> 320 yolov4-416 -> 416
```

## Synaptics

Hardware accelerated object detection is supported on the following SoCs:

- SL1680

This implementation uses the [Synaptics model conversion](https://synaptics-synap.github.io/doc/v/latest/docs/manual/introduction.html#offline-model-conversion), version v3.1.0.

This implementation is based on sdk `v1.5.0`.

See the [installation docs](../frigate/installation.md#synaptics) for information on configuring the SL-series NPU hardware.

### Configuration

When configuring the Synap detector, you have to specify the model: a local **path**.

#### SSD Mobilenet

A synap model is provided in the container at /mobilenet.synap and is used by this detector type by default. The model comes from [Synap-release Github](https://github.com/synaptics-astra/synap-release/tree/v1.5.0/models/dolphin/object_detection/coco/model/mobilenet224_full80).

Use the model configuration shown below when using the synaptics detector with the default synap model:

```yaml
detectors: # required
  synap_npu: # required
    type: synaptics # required

model: # required
  path: /synaptics/mobilenet.synap # required
  width: 224 # required
  height: 224 # required
  tensor_format: nhwc # default value (optional. If you change the model, it is required)
  labelmap_path: /labelmap/coco-80.txt # required
```

## Rockchip platform

Hardware accelerated object detection is supported on the following SoCs:

- RK3562
- RK3566
- RK3568
- RK3576
- RK3588

This implementation uses the [Rockchip's RKNN-Toolkit2](https://github.com/airockchip/rknn-toolkit2/), version v2.3.2.

:::tip

When using many cameras one detector may not be enough to keep up. Multiple detectors can be defined assuming NPU resources are available. An example configuration would be:

```yaml
detectors:
  rknn_0:
    type: rknn
    num_cores: 0
  rknn_1:
    type: rknn
    num_cores: 0
```

:::

### Prerequisites

Make sure to follow the [Rockchip specific installation instructions](/frigate/installation#rockchip-platform).

:::tip

You can get the load of your NPU with the following command:

```bash
$ cat /sys/kernel/debug/rknpu/load
>> NPU load:  Core0:  0%, Core1:  0%, Core2:  0%,
```

:::

### RockChip Supported Models

This `config.yml` shows all relevant options to configure the detector and explains them. All values shown are the default values (except for two). Lines that are required at least to use the detector are labeled as required, all other lines are optional.

```yaml
detectors: # required
  rknn: # required
    type: rknn # required
    # number of NPU cores to use
    # 0 means choose automatically
    # increase for better performance if you have a multicore NPU e.g. set to 3 on rk3588
    num_cores: 0
```

The inference time was determined on a rk3588 with 3 NPU cores.

| Model                 | Size in mb | Inference time in ms |
| --------------------- | ---------- | -------------------- |
| deci-fp16-yolonas_s   | 24         | 25                   |
| deci-fp16-yolonas_m   | 62         | 35                   |
| deci-fp16-yolonas_l   | 81         | 45                   |
| frigate-fp16-yolov9-t | 6          | 35                   |
| rock-i8-yolox_nano    | 3          | 14                   |
| rock-i8_yolox_tiny    | 6          | 18                   |

- All models are automatically downloaded and stored in the folder `config/model_cache/rknn_cache`. After upgrading Frigate, you should remove older models to free up space.
- You can also provide your own `.rknn` model. You should not save your own models in the `rknn_cache` folder, store them directly in the `model_cache` folder or another subfolder. To convert a model to `.rknn` format see the `rknn-toolkit2` (requires a x86 machine). Note, that there is only post-processing for the supported models.

#### YOLO-NAS

```yaml
model: # required
  # name of model (will be automatically downloaded) or path to your own .rknn model file
  # possible values are:
  # - deci-fp16-yolonas_s
  # - deci-fp16-yolonas_m
  # - deci-fp16-yolonas_l
  # your yolonas_model.rknn
  path: deci-fp16-yolonas_s
  model_type: yolonas
  width: 320
  height: 320
  input_pixel_format: bgr
  input_tensor: nhwc
  labelmap_path: /labelmap/coco-80.txt
```

:::warning

The pre-trained YOLO-NAS weights from DeciAI are subject to their license and can't be used commercially. For more information, see: https://docs.deci.ai/super-gradients/latest/LICENSE.YOLONAS.html

:::

#### YOLO (v9)

```yaml
model: # required
  # name of model (will be automatically downloaded) or path to your own .rknn model file
  # possible values are:
  # - frigate-fp16-yolov9-t
  # - frigate-fp16-yolov9-s
  # - frigate-fp16-yolov9-m
  # - frigate-fp16-yolov9-c
  # - frigate-fp16-yolov9-e
  # your yolo_model.rknn
  path: frigate-fp16-yolov9-t
  model_type: yolo-generic
  width: 320
  height: 320
  input_tensor: nhwc
  labelmap_path: /labelmap/coco-80.txt
```

#### YOLOx

```yaml
model: # required
  # name of model (will be automatically downloaded) or path to your own .rknn model file
  # possible values are:
  # - rock-i8-yolox_nano
  # - rock-i8-yolox_tiny
  # - rock-fp16-yolox_nano
  # - rock-fp16-yolox_tiny
  # your yolox_model.rknn
  path: rock-i8-yolox_nano
  model_type: yolox
  width: 416
  height: 416
  input_tensor: nhwc
  labelmap_path: /labelmap/coco-80.txt
```

### Converting your own onnx model to rknn format

To convert a onnx model to the rknn format using the [rknn-toolkit2](https://github.com/airockchip/rknn-toolkit2/) you have to:

- Place one ore more models in onnx format in the directory `config/model_cache/rknn_cache/onnx` on your docker host (this might require `sudo` privileges).
- Save the configuration file under `config/conv2rknn.yaml` (see below for details).
- Run `docker exec <frigate_container_id> python3 /opt/conv2rknn.py`. If the conversion was successful, the rknn models will be placed in `config/model_cache/rknn_cache`.

This is an example configuration file that you need to adjust to your specific onnx model:

```yaml
soc: ["rk3562", "rk3566", "rk3568", "rk3576", "rk3588"]
quantization: false

output_name: "{input_basename}"

config:
  mean_values: [[0, 0, 0]]
  std_values: [[255, 255, 255]]
  quant_img_RGB2BGR: true
```

Explanation of the paramters:

- `soc`: A list of all SoCs you want to build the rknn model for. If you don't specify this parameter, the script tries to find out your SoC and builds the rknn model for this one.
- `quantization`: true: 8 bit integer (i8) quantization, false: 16 bit float (fp16). Default: false.
- `output_name`: The output name of the model. The following variables are available:
  - `quant`: "i8" or "fp16" depending on the config
  - `input_basename`: the basename of the input model (e.g. "my_model" if the input model is calles "my_model.onnx")
  - `soc`: the SoC this model was build for (e.g. "rk3588")
  - `tk_version`: Version of `rknn-toolkit2` (e.g. "2.3.0")
  - **example**: Specifying `output_name = "frigate-{quant}-{input_basename}-{soc}-v{tk_version}"` could result in a model called `frigate-i8-my_model-rk3588-v2.3.0.rknn`.
- `config`: Configuration passed to `rknn-toolkit2` for model conversion. For an explanation of all available parameters have a look at section "2.2. Model configuration" of [this manual](https://github.com/MarcA711/rknn-toolkit2/releases/download/v2.3.2/03_Rockchip_RKNPU_API_Reference_RKNN_Toolkit2_V2.3.2_EN.pdf).

## DeGirum

DeGirum is a detector that can use any type of hardware listed on [their website](https://hub.degirum.com). DeGirum can be used with local hardware through a DeGirum AI Server, or through the use of `@local`. You can also connect directly to DeGirum's AI Hub to run inferences. **Please Note:** This detector _cannot_ be used for commercial purposes.

### Configuration

#### AI Server Inference

Before starting with the config file for this section, you must first launch an AI server. DeGirum has an AI server ready to use as a docker container. Add this to your `docker-compose.yml` to get started:

```yaml
degirum_detector:
  container_name: degirum
  image: degirum/aiserver:latest
  privileged: true
  ports:
    - "8778:8778"
```

All supported hardware will automatically be found on your AI server host as long as relevant runtimes and drivers are properly installed on your machine. Refer to [DeGirum's docs site](https://docs.degirum.com/pysdk/runtimes-and-drivers) if you have any trouble.

Once completed, changing the `config.yml` file is simple.

```yaml
degirum_detector:
  type: degirum
  location: degirum # Set to service name (degirum_detector), container_name (degirum), or a host:port (192.168.29.4:8778)
  zoo: degirum/public # DeGirum's public model zoo. Zoo name should be in format "workspace/zoo_name". degirum/public is available to everyone, so feel free to use it if you don't know where to start. If you aren't pulling a model from the AI Hub, leave this and 'token' blank.
  token: dg_example_token # For authentication with the AI Hub. Get this token through the "tokens" section on the main page of the [AI Hub](https://hub.degirum.com). This can be left blank if you're pulling a model from the public zoo and running inferences on your local hardware using @local or a local DeGirum AI Server
```

Setting up a model in the `config.yml` is similar to setting up an AI server.
You can set it to:

- A model listed on the [AI Hub](https://hub.degirum.com), given that the correct zoo name is listed in your detector
  - If this is what you choose to do, the correct model will be downloaded onto your machine before running.
- A local directory acting as a zoo. See DeGirum's docs site [for more information](https://docs.degirum.com/pysdk/user-guide-pysdk/organizing-models#model-zoo-directory-structure).
- A path to some model.json.

```yaml
model:
  path: ./mobilenet_v2_ssd_coco--300x300_quant_n2x_orca1_1 # directory to model .json and file
  width: 300 # width is in the model name as the first number in the "int"x"int" section
  height: 300 # height is in the model name as the second number in the "int"x"int" section
  input_pixel_format: rgb/bgr # look at the model.json to figure out which to put here
```

#### Local Inference

It is also possible to eliminate the need for an AI server and run the hardware directly. The benefit of this approach is that you eliminate any bottlenecks that occur when transferring prediction results from the AI server docker container to the frigate one. However, the method of implementing local inference is different for every device and hardware combination, so it's usually more trouble than it's worth. A general guideline to achieve this would be:

1. Ensuring that the frigate docker container has the runtime you want to use. So for instance, running `@local` for Hailo means making sure the container you're using has the Hailo runtime installed.
2. To double check the runtime is detected by the DeGirum detector, make sure the `degirum sys-info` command properly shows whatever runtimes you mean to install.
3. Create a DeGirum detector in your `config.yml` file.

```yaml
degirum_detector:
  type: degirum
  location: "@local" # For accessing AI Hub devices and models
  zoo: degirum/public # DeGirum's public model zoo. Zoo name should be in format "workspace/zoo_name". degirum/public is available to everyone, so feel free to use it if you don't know where to start.
  token: dg_example_token # For authentication with the AI Hub. Get this token through the "tokens" section on the main page of the [AI Hub](https://hub.degirum.com). This can be left blank if you're pulling a model from the public zoo and running inferences on your local hardware using @local or a local DeGirum AI Server
```

Once `degirum_detector` is setup, you can choose a model through 'model' section in the `config.yml` file.

```yaml
model:
  path: mobilenet_v2_ssd_coco--300x300_quant_n2x_orca1_1
  width: 300 # width is in the model name as the first number in the "int"x"int" section
  height: 300 # height is in the model name as the second number in the "int"x"int" section
  input_pixel_format: rgb/bgr # look at the model.json to figure out which to put here
```

#### AI Hub Cloud Inference

If you do not possess whatever hardware you want to run, there's also the option to run cloud inferences. Do note that your detection fps might need to be lowered as network latency does significantly slow down this method of detection. For use with Frigate, we highly recommend using a local AI server as described above. To set up cloud inferences,

1. Sign up at [DeGirum's AI Hub](https://hub.degirum.com).
2. Get an access token.
3. Create a DeGirum detector in your `config.yml` file.

```yaml
degirum_detector:
  type: degirum
  location: "@cloud" # For accessing AI Hub devices and models
  zoo: degirum/public # DeGirum's public model zoo. Zoo name should be in format "workspace/zoo_name". degirum/public is available to everyone, so feel free to use it if you don't know where to start.
  token: dg_example_token # For authentication with the AI Hub. Get this token through the "tokens" section on the main page of the (AI Hub)[https://hub.degirum.com).
```

Once `degirum_detector` is setup, you can choose a model through 'model' section in the `config.yml` file.

```yaml
model:
  path: mobilenet_v2_ssd_coco--300x300_quant_n2x_orca1_1
  width: 300 # width is in the model name as the first number in the "int"x"int" section
  height: 300 # height is in the model name as the second number in the "int"x"int" section
  input_pixel_format: rgb/bgr # look at the model.json to figure out which to put here
```

# Models

Some model types are not included in Frigate by default.

## Downloading Models

Here are some tips for getting different model types

### Downloading D-FINE Model

D-FINE can be exported as ONNX by running the command below. You can copy and paste the whole thing to your terminal and execute, altering `MODEL_SIZE=s` in the first line to `s`, `m`, or `l` size.

```sh
docker build . --build-arg MODEL_SIZE=s --output . -f- <<'EOF'
FROM python:3.11 AS build
RUN apt-get update && apt-get install --no-install-recommends -y libgl1 && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.8.0 /uv /bin/
WORKDIR /dfine
RUN git clone https://github.com/Peterande/D-FINE.git .
RUN uv pip install --system -r requirements.txt
RUN uv pip install --system onnx onnxruntime onnxsim onnxscript
# Create output directory and download checkpoint
RUN mkdir -p output
ARG MODEL_SIZE
RUN wget https://github.com/Peterande/storage/releases/download/dfinev1.0/dfine_${MODEL_SIZE}_obj2coco.pth -O output/dfine_${MODEL_SIZE}_obj2coco.pth
# Modify line 58 of export_onnx.py to change batch size to 1
RUN sed -i '58s/data = torch.rand(.*)/data = torch.rand(1, 3, 640, 640)/' tools/deployment/export_onnx.py
RUN python3 tools/deployment/export_onnx.py -c configs/dfine/objects365/dfine_hgnetv2_${MODEL_SIZE}_obj2coco.yml -r output/dfine_${MODEL_SIZE}_obj2coco.pth
FROM scratch
ARG MODEL_SIZE
COPY --from=build /dfine/output/dfine_${MODEL_SIZE}_obj2coco.onnx /dfine-${MODEL_SIZE}.onnx
EOF
```

### Downloading RF-DETR Model

RF-DETR can be exported as ONNX by running the command below. You can copy and paste the whole thing to your terminal and execute, altering `MODEL_SIZE=Nano` in the first line to `Nano`, `Small`, or `Medium` size.

```sh
docker build . --build-arg MODEL_SIZE=Nano --rm --output . -f- <<'EOF'
FROM python:3.12 AS build
RUN apt-get update && apt-get install --no-install-recommends -y libgl1 && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.10.4 /uv /bin/
WORKDIR /rfdetr
RUN uv pip install --system rfdetr[onnxexport] torch==2.8.0 onnx==1.19.1 transformers==4.57.6 onnxscript
ARG MODEL_SIZE
RUN python3 -c "from rfdetr import RFDETR${MODEL_SIZE}; x = RFDETR${MODEL_SIZE}(resolution=320); x.export(simplify=True)"
FROM scratch
ARG MODEL_SIZE
COPY --from=build /rfdetr/output/inference_model.onnx /rfdetr-${MODEL_SIZE}.onnx
EOF
```

### Downloading YOLO-NAS Model

You can build and download a compatible model with pre-trained weights using [this notebook](https://github.com/blakeblackshear/frigate/blob/dev/notebooks/YOLO_NAS_Pretrained_Export.ipynb) [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/blakeblackshear/frigate/blob/dev/notebooks/YOLO_NAS_Pretrained_Export.ipynb) which can be run directly in [Google Colab](https://colab.research.google.com/github/blakeblackshear/frigate/blob/dev/notebooks/YOLO_NAS_Pretrained_Export.ipynb).

:::warning

The pre-trained YOLO-NAS weights from DeciAI are subject to their license and can't be used commercially. For more information, see: https://docs.deci.ai/super-gradients/latest/LICENSE.YOLONAS.html

:::

The input image size in this notebook is set to 320x320. This results in lower CPU usage and faster inference times without impacting performance in most cases due to the way Frigate crops video frames to areas of interest before running detection. The notebook and config can be updated to 640x640 if desired.

### Downloading YOLO Models

#### YOLOx

YOLOx models can be downloaded [from the YOLOx repo](https://github.com/Megvii-BaseDetection/YOLOX/tree/main/demo/ONNXRuntime).

#### YOLOv3, YOLOv4, and YOLOv7

To export as ONNX:

```sh
git clone https://github.com/NateMeyer/tensorrt_demos
cd tensorrt_demos/yolo
./download_yolo.sh
python3 yolo_to_onnx.py -m yolov7-320
```

#### YOLOv9 for Google Coral Support

[Download the model](https://github.com/dbro/frigate-detector-edgetpu-yolo9/releases/download/v1.0/yolov9-s-relu6-best_320_int8_edgetpu.tflite), bind mount the file into the container, and provide the path with `model.path`. Note that the linked model requires a 17-label [labelmap file](https://raw.githubusercontent.com/dbro/frigate-detector-edgetpu-yolo9/refs/heads/main/labels-coco17.txt) that includes only 17 COCO classes.

#### YOLOv9 for other detectors

YOLOv9 model can be exported as ONNX using the command below. You can copy and paste the whole thing to your terminal and execute, altering `MODEL_SIZE=t` and `IMG_SIZE=320` in the first line to the [model size](https://github.com/WongKinYiu/yolov9#performance) you would like to convert (available model sizes are `t`, `s`, `m`, `c`, and `e`, common image sizes are `320` and `640`).

```sh
docker build . --build-arg MODEL_SIZE=t --build-arg IMG_SIZE=320 --output . -f- <<'EOF'
FROM python:3.11 AS build
RUN apt-get update && apt-get install --no-install-recommends -y libgl1 && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.8.0 /uv /bin/
WORKDIR /yolov9
ADD https://github.com/WongKinYiu/yolov9.git .
RUN uv pip install --system -r requirements.txt
RUN uv pip install --system onnx==1.18.0 onnxruntime onnx-simplifier>=0.4.1 onnxscript
ARG MODEL_SIZE
ARG IMG_SIZE
ADD https://github.com/WongKinYiu/yolov9/releases/download/v0.1/yolov9-${MODEL_SIZE}-converted.pt yolov9-${MODEL_SIZE}.pt
RUN sed -i "s/ckpt = torch.load(attempt_download(w), map_location='cpu')/ckpt = torch.load(attempt_download(w), map_location='cpu', weights_only=False)/g" models/experimental.py
RUN python3 export.py --weights ./yolov9-${MODEL_SIZE}.pt --imgsz ${IMG_SIZE} --simplify --include onnx
FROM scratch
ARG MODEL_SIZE
ARG IMG_SIZE
COPY --from=build /yolov9/yolov9-${MODEL_SIZE}.onnx /yolov9-${MODEL_SIZE}-${IMG_SIZE}.onnx
EOF
```
