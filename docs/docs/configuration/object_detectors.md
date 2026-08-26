---
id: object_detectors
title: Object Detectors
---

import CommunityBadge from '@site/src/components/CommunityBadge';
import ConfigTabs from '@site/src/components/ConfigTabs';
import TabItem from '@theme/TabItem';
import NavPath from '@site/src/components/NavPath';
import ModelConfigDropdown from '@site/src/components/ModelConfigDropdown';
import objectDetectorsModels from '@site/data/object_detectors_models.yaml';

### Supported hardware

Object detection is what allows Frigate to identify _what_ is in your camera's view (people, cars, animals, and more) rather than just reacting to pixel changes. When Frigate's motion detection finds activity in a frame, that region is sent to an **object detector**, which returns the objects it recognizes along with their location and a confidence score. These detections are what drive tracked objects, alerts, detections, and notifications.

Object detection is computationally intensive, so Frigate is designed to run it on a dedicated AI accelerator or GPU rather than the CPU. A **detector** is the specific hardware-and-model backend Frigate uses to run inference. Choosing a detector that matches your hardware is one of the most important steps in getting good performance, and the right choice depends on what device Frigate is running on.

:::info
Frigate supports multiple different detectors that work on different types of hardware:

**Most Hardware**

- [Coral EdgeTPU](#edge-tpu-detector): The Google Coral EdgeTPU is available in USB, Mini PCIe, and m.2 formats allowing for a wide range of compatibility with devices.
- [Hailo](#hailo-8): The Hailo8 and Hailo8L AI Acceleration module is available in m.2 format with a HAT for RPi devices, offering a wide range of compatibility with devices.
- <CommunityBadge /> [MemryX](#memryx-mx3): The MX3 Acceleration module is available in m.2 format, offering broad compatibility across various platforms.
- <CommunityBadge /> [DEEPX](#deepx-npu): The DEEPX NPU is available in m.2 format and as a HAT+ for the Raspberry Pi 5, offering broad compatibility across various platforms.

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

**AXERA** <CommunityBadge />

- [AXEngine](#axera): axmodels can run on AXERA AI acceleration.

**For Testing**

- [CPU Detector (not recommended for actual use](#cpu-detector-not-recommended): Use a CPU to run tflite model, this is not recommended and in most cases OpenVINO can be used in CPU mode with better results.

:::

:::note

A single model can not be spread across different detector types (ex: OpenVINO and Coral EdgeTPU can not run the same model at the same time). Configuring more than one model, each on its own detector type, is supported.

This does not affect using hardware for accelerating other tasks such as [semantic search](./semantic_search.md)

:::

### Configuring models and hardware

Object detection is configured with a `models` list. Each entry describes one model and the hardware it runs on:

```yaml
models:
  - devices:
      - openvino:GPU
    path: /config/model_cache/yolov9-s.onnx
    model_type: yolo-generic
    width: 320
    height: 320
```

Each entry in `devices` is a detector type, optionally followed by a colon and a device for that detector, such as `edgetpu:pci:0`, `openvino:NPU`, or `tensorrt:0`. The per-detector sections below document the device values each one accepts. Listing several devices runs the model on all of them, and listing the **same** device more than once runs additional inference processes against it, which can improve throughput on hardware that keeps up with more than one stream:

```yaml
models:
  - devices:
      - openvino:GPU
      - openvino:GPU
```

Coral EdgeTPU and MemryX accelerators can only be opened by one process, so those devices can not be repeated.

### Running more than one model

Cameras can be split across models by scene, which is useful when indoor and outdoor cameras benefit from differently trained models. Each model declares the `scene` it is for, and each camera picks one with `detect -> scene`:

```yaml
models:
  - scene: outdoor
    path: plus://your-outdoor-model
    devices:
      - edgetpu:pci:0
  - scene: indoor
    path: /config/model_cache/indoor.onnx
    model_type: yolo-generic
    devices:
      - openvino:GPU

cameras:
  driveway:
    detect:
      scene: outdoor
    ...
  hallway:
    detect:
      scene: indoor
    ...
```

Available scenes are `all`, `indoor`, `outdoor`, `indoor_thermal`, and `outdoor_thermal`. A model with a scene of `all` is used by every camera that does not set one, and `all` is the default when a model does not declare a scene. Changing a camera's scene requires a restart.

### Choosing a model size

Along with picking a detector for your hardware, you will choose a model's **input resolution** (such as `320x320` or `640x640`) and, for model families like YOLOv9, a **variant size** (`tiny`, `small`, etc.). Both affect the balance between accuracy and the inference time your hardware can sustain.

**Resolution (320x320 vs 640x640):** Frigate is optimized for `320x320` models, and `320x320` is the best choice for the vast majority of setups. Frigate is specifically designed to compensate for the smaller model by cropping a region of motion from the full frame and zooming into it before running detection, so a `320x320` model is actually _better_ at small and distant objects, not worse. A `640x640` model is slower and uses more resources, and its main benefit is fitting more objects into a single inference when many objects are spread across a large area. Recent versions of Frigate have improved support for `640x640` models, but `320x320` remains the recommended starting point for nearly all setups.

**Variant size (tiny/small/medium):** Larger variants are gradually more accurate but slower. Whether the difference is noticeable depends on your specific cameras and scenes. A good rule of thumb is to use the largest model your hardware can run without skipping detections, which you can monitor on the <NavPath path="Health and Metrics > Cameras" /> page in the UI. Better accuracy only helps if your detector keeps up with the detection load across all cameras.

**Acceptable inference time depends on your hardware.** Inference time alone does not tell the whole story, because different hardware has different capacity. A GPU can run multiple instances of the same model concurrently, so an inference time around 30ms can still keep up with several cameras. A Google Coral runs only a single instance of the model, so it needs a much lower inference time (around 10ms) to keep up.

:::tip

The best detection accuracy comes from a model trained on images that look like what Frigate actually sees: security camera footage cropped to regions of interest. You can train or fine-tune your own model on images like this and run it as a custom model (see the per-detector sections below), but [Frigate+](/plus) makes this much easier by handling the training for you on images submitted from your own cameras. For YOLOv9, the `s` (small) variant at `320x320` resolution is a good place to start.

:::

# Officially Supported Detectors

Frigate provides a number of builtin detector types. By default, Frigate will use a single CPU detector. Other detectors may require additional configuration as described below. Each of a model's devices runs in a dedicated process, and they pull from a common queue of detection requests from the cameras assigned to that model.

## Edge TPU Detector

The Edge TPU detector type runs TensorFlow Lite models utilizing the Google Coral delegate for hardware acceleration. To use it, prefix a model's device with `edgetpu`.

The Edge TPU device can be specified using the `"device"` attribute according to the [Documentation for the TensorFlow Lite Python API](https://coral.ai/docs/edgetpu/multiple-edgetpu/#using-the-tensorflow-lite-python-api). If not set, the delegate will use the first device it finds.

:::tip

See [common Edge TPU troubleshooting steps](/troubleshooting/edgetpu) if the Edge TPU is not detected.

:::

### Single USB Coral

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > System > Detection models" /> and select **Coral EdgeTPU (USB)** from the **Hardware** dropdown.

</TabItem>
<TabItem value="yaml">

```yaml
models:
  - devices:
      - edgetpu:usb
```

</TabItem>
</ConfigTabs>

### Multiple USB Corals

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > System > Detection models" /> and select **Coral EdgeTPU (USB)** from the **Hardware** dropdown and check each Coral the model should run on.

</TabItem>
<TabItem value="yaml">

```yaml
models:
  - devices:
      - edgetpu:usb:0
      - edgetpu:usb:1
```

</TabItem>
</ConfigTabs>

### Native Coral (Dev Board)

_warning: may have [compatibility issues](https://github.com/blakeblackshear/frigate/issues/1706) after `v0.9.x`_

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > System > Detection models" /> and select the **Coral EdgeTPU** entry from the **Hardware** dropdown.

</TabItem>
<TabItem value="yaml">

```yaml
models:
  - devices:
      - 'edgetpu:'
```

</TabItem>
</ConfigTabs>

### Single PCIE/M.2 Coral

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > System > Detection models" /> and select **Coral EdgeTPU (PCIe)** from the **Hardware** dropdown.

</TabItem>
<TabItem value="yaml">

```yaml
models:
  - devices:
      - edgetpu:pci
```

</TabItem>
</ConfigTabs>

### Multiple PCIE/M.2 Corals

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > System > Detection models" /> and select **Coral EdgeTPU (PCIe)** from the **Hardware** dropdown and check each Coral the model should run on.

</TabItem>
<TabItem value="yaml">

```yaml
models:
  - devices:
      - edgetpu:pci:0
      - edgetpu:pci:1
```

</TabItem>
</ConfigTabs>

### Mixing Corals

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > System > Detection models" /> and select **Coral EdgeTPU (USB)** from the **Hardware** dropdown. USB and PCIe Corals are listed as separate hardware, so mixing the two on one model has to be done in YAML.

</TabItem>
<TabItem value="yaml">

```yaml
models:
  - devices:
      - edgetpu:usb
      - edgetpu:pci
```

</TabItem>
</ConfigTabs>

### Configuration {#configuration-edgetpu}

<ModelConfigDropdown detectorTitle="EdgeTPU" models={objectDetectorsModels.edgeTPU.models} />

---

## Hailo-8

This detector is available for use with both Hailo-8 and Hailo-8L AI Acceleration Modules. The integration automatically detects your hardware architecture via the Hailo CLI and selects the appropriate default model if no custom model is specified.

See the [installation docs](../frigate/installation.md#hailo-8) for information on configuring the Hailo hardware.

:::info

If no custom model is provided, the Hailo detector downloads a default model from the Hailo Model Zoo on first startup. Once cached, the model works fully offline. See [Network Requirements](/frigate/network_requirements#hardware-specific-detector-models) for details.

:::

:::info

The HailoRT runtime is not part of the Frigate image. It is downloaded and installed into `/config/.local` the first time a Hailo detector is configured, verified against pinned checksums, and updated automatically when a Frigate release pins a new version. If the container has no internet access, see [Detector runtimes](/frigate/network_requirements#detector-runtimes) for how to provide the files yourself.

:::

### Configuration {#configuration-hailo}

When configuring the Hailo detector, you have two options to specify the model: a local **path** or a **URL**.
If both are provided, the detector will first check for the model at the given local path. If the file is not found, it will download the model from the specified URL. The model file is cached under `/config/model_cache/hailo`.

<ModelConfigDropdown detectorTitle="Hailo-8/Hailo-8L" models={objectDetectorsModels.hailo8l.models} />

For additional ready-to-use models, please visit: https://github.com/hailo-ai/hailo_model_zoo

Hailo8 supports all models in the Hailo Model Zoo that include HailoRT post-processing. You're welcome to choose any of these pre-configured models for your implementation.

> **Note:**
> The config.path parameter can accept either a local file path or a URL ending with .hef. When provided, the detector will first check if the path is a local file path. If the file exists locally, it will use it directly. If the file is not found locally or if a URL was provided, it will attempt to download the model from the specified URL.

---

## OpenVINO Detector

The OpenVINO detector type runs an OpenVINO IR model on AMD and Intel CPUs, Intel GPUs and Intel NPUs. To use it, prefix a model's device with `openvino`.

The OpenVINO device to be used is specified using the `"device"` attribute according to the naming conventions in the [Device Documentation](https://docs.openvino.ai/2025/openvino-workflow/running-inference/inference-devices-and-modes.html). The most common devices are `CPU`, `GPU`, or `NPU`.

OpenVINO is supported on 6th Gen Intel platforms (Skylake) and newer. It will also run on AMD CPUs despite having no official support for it. A supported Intel platform is required to use the `GPU` or `NPU` device with OpenVINO. For detailed system requirements, see [OpenVINO System Requirements](https://docs.openvino.ai/2025/about-openvino/release-notes-openvino/system-requirements.html)

:::tip

**NPU + GPU Systems:** If you have both NPU and GPU available (Intel Core Ultra processors), use NPU for object detection and GPU for enrichments (semantic search, face recognition, etc.) for best performance and compatibility.

When using many cameras one detector may not be enough to keep up. Multiple detectors can be defined assuming GPU resources are available. An example configuration would be:

```yaml
models:
  - devices:
      - openvino:GPU # or NPU
      - openvino:GPU # or NPU
```

:::

### Intel NPU host requirements {#intel-npu-requirements}

The NPU device must be passed into the container by adding `/dev/accel:/dev/accel` to the `devices` section of your compose file. Frigate grants the runtime user access to the device automatically; see [hardware device access](/configuration/non_root#hardware-device-access) if you manage device permissions yourself.

The NPU firmware is loaded by the host kernel and is not part of the Frigate image. Everything else the NPU needs is bundled in the container, so host NPU libraries should never be mounted in.

Frigate bundles a specific version of Intel's [linux-npu-driver](https://github.com/intel/linux-npu-driver/releases), and the host firmware must come from that release or a newer one. Firmware older than the bundled driver may fail with `MAPPED_INFERENCE_VERSION is NOT compatible with the ELF`, where `Expected` is the version the firmware supports and `received` is the version the bundled compiler produced. Distributions often package older firmware than the driver Frigate ships, so check the build date on the host with `sudo dmesg | grep -i vpu` and update it there if needed.

Intel NPUs cannot be used under Home Assistant OS, which does not include the NPU firmware.

### Configuration {#configuration-openvino}

<ModelConfigDropdown detectorTitle="OpenVINO" models={objectDetectorsModels.openvino.models} />

---

## Apple Silicon detector

:::warning

The network-based detectors (Deepstack and the Apple Silicon client) are being reworked. Their extra options no longer have a place in the config, so only the endpoint carried in the device string is honored right now: Deepstack ignores `api_key` and `api_timeout`, and the Apple Silicon client ignores `request_timeout_ms` and `linger_ms`. Anything else is dropped when your config is migrated.

:::

The NPU in Apple Silicon can't be accessed from within a container, so the [Apple Silicon detector client](https://github.com/frigate-nvr/apple-silicon-detector) must first be setup. It is recommended to use the Frigate docker image with `-standard-arm64` suffix, for example `ghcr.io/blakeblackshear/frigate:stable-standard-arm64`.

### Setup {#setup-apple-silicon}

1. Setup the [Apple Silicon detector client](https://github.com/frigate-nvr/apple-silicon-detector) and run the client
2. Configure the detector in Frigate and startup Frigate

### Configuration {#configuration-apple-silicon}

Using the detector config below will connect to the client:

<ModelConfigDropdown detectorTitle="Apple Silicon" models={objectDetectorsModels.appleSilicon.models} />

Note that the labelmap uses a subset of the complete COCO label set that has only 80 objects.

## AMD/ROCm GPU detector

### Setup {#setup-rocm}

Support for AMD GPUs is provided using the [ONNX detector](#onnx). In order to utilize the AMD GPU for object detection use a frigate docker image with `-rocm` suffix, for example `ghcr.io/blakeblackshear/frigate:stable-rocm`.

### Docker settings for GPU access

ROCm needs access to the `/dev/kfd` and `/dev/dri` devices. When docker or frigate is not run under root then also `video` (and possibly `render` and `ssl/_ssl`) groups should be added.

When running docker directly the following flags should be added for device access:

```bash
$ docker run --device=/dev/kfd --device=/dev/dri  \
    ...
```

When using Docker Compose:

```yaml {4-6}
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

```yaml {4-5}
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

### Configuration {#configuration-rocm}

:::tip

The AMD GPU kernel is known problematic especially when converting models to mxr format. The recommended approach is:

1. Disable object detection in the config.
2. Startup Frigate with the onnx detector configured, the main object detection model will be converted to mxr format and cached in the config directory.
3. Once this is finished as indicated by the logs, enable object detection in the UI and confirm that it is working correctly.
4. Re-enable object detection in the config.

:::

See [ONNX supported models](#onnx) for supported models, there are some caveats:

- D-FINE / DEIMv2 models are not supported
- YOLO-NAS models are known to not run well on integrated GPUs

<ModelConfigDropdown detectorTitle="AMD ROCm" models={objectDetectorsModels.onnx.models} />

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
models:
  - devices:
      - onnx
      - onnx
```

:::

### Configuration {#configuration-onnx}

<ModelConfigDropdown detectorTitle="ONNX" models={objectDetectorsModels.onnx.models} />

---

## CPU Detector (not recommended)

The CPU detector type runs a TensorFlow Lite model utilizing the CPU without hardware acceleration. It is recommended to use a hardware accelerated detector type instead for better performance. To use it, set a model's device to `cpu`.

:::danger

The CPU detector is not recommended for general use. If you do not have GPU or Edge TPU hardware, using the [OpenVINO Detector](#openvino-detector) in CPU mode is often more efficient than using the CPU detector.

:::

The number of threads used by the interpreter can be specified using the `"num_threads"` attribute, and defaults to `3.`

A TensorFlow Lite model is provided in the container at `/cpu_model.tflite` and is used by this detector type by default. To provide your own model, bind mount the file into the container and provide the path with the model's `path`.

### Configuration {#configuration-cpu}

<ModelConfigDropdown detectorTitle="CPU" models={objectDetectorsModels.cpu.models} />

When using CPU detectors, you can add one CPU detector per camera. Adding more detectors than the number of cameras should not improve performance.

## Deepstack / CodeProject.AI Server Detector

:::warning

The network-based detectors (Deepstack and the Apple Silicon client) are being reworked. Their extra options no longer have a place in the config, so only the endpoint carried in the device string is honored right now: Deepstack ignores `api_key` and `api_timeout`, and the Apple Silicon client ignores `request_timeout_ms` and `linger_ms`. Anything else is dropped when your config is migrated.

:::

The Deepstack / CodeProject.AI Server detector for Frigate allows you to integrate Deepstack and CodeProject.AI object detection capabilities into Frigate. CodeProject.AI and DeepStack are open-source AI platforms that can be run on various devices such as the Raspberry Pi, Nvidia Jetson, and other compatible hardware. It is important to note that the integration is performed over the network, so the inference times may not be as fast as native Frigate detectors, but it still provides an efficient and reliable solution for object detection and tracking.

### Setup {#setup-deepstack}

To get started with CodeProject.AI, visit their [official website](https://www.codeproject.com/Articles/5322557/CodeProject-AI-Server-AI-the-easy-way) to follow the instructions to download and install the AI server on your preferred device. Detailed setup instructions for CodeProject.AI are outside the scope of the Frigate documentation.

To integrate CodeProject.AI into Frigate, configure the detector as follows:

### Configuration {#configuration-deepstack}

<ModelConfigDropdown detectorTitle="DeepStack" models={objectDetectorsModels.deepstack.models} />

Replace `<your_codeproject_ai_server_ip>` and `<port>` with the IP address and port of your CodeProject.AI server.

To verify that the integration is working correctly, start Frigate and observe the logs for any error messages related to CodeProject.AI. Additionally, you can check the Frigate web interface to see if the objects detected by CodeProject.AI are being displayed and tracked properly.

# Community Supported Detectors

## MemryX MX3

This detector is available for use with the MemryX MX3 accelerator M.2 module. Frigate supports the MX3 on compatible hardware platforms, providing efficient and high-performance object detection.

See the [installation docs](../frigate/installation.md#memryx-mx3) for information on configuring the MemryX hardware.

To configure a MemryX detector, simply set the `type` attribute to `memryx` and follow the configuration guide below.

:::info

The MemryX SDK is not part of the Frigate image. It is downloaded and installed into `/config/.local` the first time a MemryX detector is configured, verified against pinned checksums, and updated automatically when a Frigate release pins a new version. If the container has no internet access, see [Detector runtimes](/frigate/network_requirements#detector-runtimes) for how to provide the files yourself.

:::

### Configuration {#configuration-memryx}

<ModelConfigDropdown detectorTitle="MemryX" models={objectDetectorsModels.memryx.models} />

#### Using a Custom Model

To use your own custom model, first compile it into a [.dfp](https://developer.memryx.com/2p1/specs/files.html#dataflow-program) file, which is the format used by MemryX.

#### Compile the Model

Custom models must be compiled using **MemryX SDK 2.1**.

Before compiling your model, install the MemryX Neural Compiler tools from the
[Install Tools](https://developer.memryx.com/2p1/get_started/install_tools.html) page on the **host**.

> **Note:** It is recommended to compile the model on the host machine, or on another separate machine, rather than inside the Frigate Docker container. Installing the compiler inside Docker may conflict with container packages. It is recommended to create a Python virtual environment and install the compiler there.

Once the SDK 2.1 environment is set up, follow the
[MemryX Compiler](https://developer.memryx.com/2p1/tools/neural_compiler.html#usage) documentation to compile your model.

Example:

```bash
mx_nc -m yolonas.onnx -c 4 --autocrop -v --dfp_fname yolonas.dfp
```

For detailed instructions on compiling models, refer to the [MemryX Compiler](https://developer.memryx.com/2p1/tools/neural_compiler.html#usage) docs and [Tutorials](https://developer.memryx.com/2p1/tutorials/tutorials.html).

#### Package the Compiled Model

1. Package your compiled model into a `.zip` file.

2. The `.zip` file must contain the compiled `.dfp` file.

3. Depending on the model, the compiler may also generate a cropped post-processing network. If present, it will be named with the suffix `_post.onnx`.

4. Bind-mount the `.zip` file into the container and specify its path using the model's `path` in your config.

5. Update `labelmap_path` to match your custom model's labels.

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

## DEEPX NPU

This detector is available for use with the DEEPX NPU, both the DX-M1 M.2 module and the DX-M1M on the Sixfab AI HAT+ for the Raspberry Pi 5. The configuration below applies unchanged to either form factor. DEEPX NPU support in Frigate is developed and maintained by [Sixfab](https://sixfab.com).

See the [installation docs](../frigate/installation.md#deepx-npu) for information on installing the DEEPX kernel driver and passing the NPU through to the container.

To configure a DEEPX detector, set the `type` attribute to `deepx` and follow the configuration guide below.

### Configuration {#configuration-deepx}

<ModelConfigDropdown detectorTitle="DEEPX" models={objectDetectorsModels.deepx.models} />

Frigate does not bundle a model for this detector. Models must be compiled to DEEPX's `.dxnn` format.

The quickest way to get one is the [DEEPX ModelZoo](https://developer.deepx.ai/modelzoo), which publishes pre-compiled `.dxnn` files for a range of YOLO variants alongside a JSON file describing how each was compiled. Pick a YOLO detection model, download the `.dxnn`, bind-mount it into the container, and point `model.path` at it. Note the variant you picked, as it determines the `model_format` value below.

Alternatively, compile your own model with the DX-COM compiler.

`model.width` and `model.height` must match the resolution the model was compiled for. Quantization parameters are baked into the `.dxnn` file at compile time, so no normalization is applied on the host and Frigate's default `input_tensor`, `input_pixel_format`, and `input_dtype` values do not need to be overridden.

#### Label maps

Models from the DEEPX ModelZoo are trained on the standard 80-class COCO label set, so `labelmap_path` must be set to `/labelmap/coco-80.txt`. Frigate's default label map uses an extended 91-class scheme, and leaving it in place will cause detections to be reported as the wrong object type.

#### Model formats

DX-COM preserves the detection head of the model it compiles, so the YOLO variant determines how the output has to be read. Set `model_format` to the variant your `.dxnn` file was compiled from:

```yaml
detectors:
  deepx:
    type: deepx
    model_format: yolov8
```

Supported values fall into three decode families:

| `model_format`                             | Output layout                                                            | PPU support |
| ------------------------------------------ | ------------------------------------------------------------------------ | ----------- |
| `yolov5`, `yolov7`                         | Anchor-based, with a separate objectness score                            | Yes         |
| `yolov8`, `yolov9`, `yolov11`, `yolov12`   | Anchor-free, no objectness, boxes already in pixels                       | Yes         |
| `yolov10`, `yolov26`                       | NMS runs in the detection head, output is final corner boxes              | No          |

Leaving `model_format` unset falls back to inferring the layout from the output shape. That inference cannot distinguish an anchor-based head from an anchor-free one, so it is only reliable for YOLOv8 and newer. Setting it explicitly is recommended.

Two mistakes this option prevents:

- Decoding an anchor-free model with the anchor formula squares the box dimensions, producing boxes hundreds of thousands of pixels wide that clip to the entire frame.
- Decoding an anchor-based model as anchor-free reads the objectness column as a class score, so confidences and class IDs are both wrong.

`yolov10` and `yolov26` run NMS inside the head, so `nms_threshold` does not apply to them.

#### PPU models

Models compiled with Post-Processing Unit (PPU) support perform candidate selection on the NPU itself and emit a list of surviving detections rather than raw feature maps. This leaves only the box decode and NMS for the host, which lowers CPU usage.

Set `ppu: true` on the detector when using such a model:

```yaml
detectors:
  deepx:
    type: deepx
    model_format: yolov8
    ppu: true
    score_threshold: 0.25
    nms_threshold: 0.45
```

`ppu` and `model_format` are independent: `ppu` says whether candidate selection already happened on the NPU, and `model_format` says how to read the boxes that come back. Both must match how the model was compiled.

`model_format` is required whenever `ppu: true` is set. A PPU record has the same fixed-width layout for every variant, so unlike the raw output path there is no shape to infer the layout from — leaving it unset is rejected at startup rather than risking a silent anchor-free/anchor-based mismatch.

DX-COM cannot compile `yolov10` or `yolov26` models with PPU support, since their heads already produce final detections. Combining either with `ppu: true` is rejected at startup.

#### Multiple NPUs

By default the detector binds to every NPU it can find. To pin a detector to specific devices, set `device_ids` to the indices you want it to use. This allows multiple detectors to be configured against separate modules:

```yaml
detectors:
  deepx_0:
    type: deepx
    device_ids: [0]
  deepx_1:
    type: deepx
    device_ids: [1]
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

<ModelConfigDropdown detectorTitle="TensorRT" models={objectDetectorsModels.tensorrt.models} />

## Synaptics

Hardware accelerated object detection is supported on the following SoCs:

- SL1680

This implementation uses the [Synaptics model conversion](https://synaptics-synap.github.io/doc/v/latest/docs/manual/introduction.html#offline-model-conversion), version v3.1.0.

This implementation is based on sdk `v1.5.0`.

See the [installation docs](../frigate/installation.md#synaptics) for information on configuring the SL-series NPU hardware.

### Configuration {#configuration-synaptics}

When configuring the Synap detector, you have to specify the model: a local **path**.

<ModelConfigDropdown detectorTitle="Synaptics" models={objectDetectorsModels.synaptics.models} />

## Rockchip platform

Hardware accelerated object detection is supported on the following SoCs:

- RK3562
- RK3566
- RK3568
- RK3576
- RK3588

This implementation uses the [Rockchip's RKNN-Toolkit2](https://github.com/airockchip/rknn-toolkit2/), version v2.3.2.

:::info

If no custom model is provided, the RKNN detector downloads a default model from GitHub on first startup. Once cached, the model works fully offline. See [Network Requirements](/frigate/network_requirements#hardware-specific-detector-models) for details.

:::

:::tip

When using many cameras one detector may not be enough to keep up. Multiple detectors can be defined assuming NPU resources are available. An example configuration would be:

```yaml
models:
  - devices:
      - rknn:0
      - rknn:0
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

<ModelConfigDropdown detectorTitle="RKNN" models={objectDetectorsModels.rknn.models} />

### Converting your own onnx model to rknn format

To convert a onnx model to the rknn format using the [rknn-toolkit2](https://github.com/airockchip/rknn-toolkit2/) you have to:

- Place one or more models in onnx format in the directory `config/model_cache/rknn_cache/onnx` on your docker host (this might require `sudo` privileges).
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

Explanation of the parameters:

- `soc`: A list of all SoCs you want to build the rknn model for. If you don't specify this parameter, the script tries to find out your SoC and builds the rknn model for this one.
- `quantization`: true: 8 bit integer (i8) quantization, false: 16 bit float (fp16). Default: false.
- `output_name`: The output name of the model. The following variables are available:
  - `quant`: "i8" or "fp16" depending on the config
  - `input_basename`: the basename of the input model (e.g. "my_model" if the input model is called "my_model.onnx")
  - `soc`: the SoC this model was build for (e.g. "rk3588")
  - `tk_version`: Version of `rknn-toolkit2` (e.g. "2.3.0")
  - **example**: Specifying `output_name = "frigate-{quant}-{input_basename}-{soc}-v{tk_version}"` could result in a model called `frigate-i8-my_model-rk3588-v2.3.0.rknn`.
- `config`: Configuration passed to `rknn-toolkit2` for model conversion. For an explanation of all available parameters have a look at section "2.2. Model configuration" of [this manual](https://github.com/MarcA711/rknn-toolkit2/releases/download/v2.3.2/03_Rockchip_RKNPU_API_Reference_RKNN_Toolkit2_V2.3.2_EN.pdf).

## AXERA

Hardware accelerated object detection is supported on the following SoCs:

- AX650N
- AX8850N

This implementation uses the [AXera Pulsar2 Toolchain](https://huggingface.co/AXERA-TECH/Pulsar2).

See the [installation docs](../frigate/installation.md#axera) for information on configuring the AXEngine hardware.

:::info

The AXEngine detector downloads its default model from HuggingFace on first startup. Once cached, the model works fully offline. See [Network Requirements](/frigate/network_requirements#hardware-specific-detector-models) for details.

:::

:::info

The AXEngine python package is not part of the Frigate image. It is downloaded and installed into `/config/.local` the first time an AXEngine detector is configured, verified against a pinned checksum, and updated automatically when a Frigate release pins a new version. If the container has no internet access, see [Detector runtimes](/frigate/network_requirements#detector-runtimes) for how to provide the file yourself.

:::

### Configuration {#configuration-axengine}

When configuring the AXEngine detector, you have to specify the model name.

<ModelConfigDropdown detectorTitle="AXEngine" models={objectDetectorsModels.axengine.models} />
