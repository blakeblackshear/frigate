---
id: hardware
title: Recommended hardware
---

import CommunityBadge from '@site/src/components/CommunityBadge';

## Cameras

Cameras that output H.264 video and AAC audio will offer the most compatibility with all features of Frigate and Home Assistant. It is also helpful if your camera supports multiple substreams to allow different resolutions to be used for detection, streaming, and recordings without re-encoding.

I recommend Dahua, Hikvision, and Amcrest in that order. Dahua edges out Hikvision because they are easier to find and order, not because they are better cameras. I personally use Dahua cameras because they are easier to purchase directly. In my experience Dahua and Hikvision both have multiple streams with configurable resolutions and frame rates and rock solid streams. They also both have models with large sensors well known for excellent image quality at night. Not all the models are equal. Larger sensors are better than higher resolutions; especially at night. Amcrest is the fallback recommendation because they are rebranded Dahuas. They are rebranding the lower end models with smaller sensors or less configuration options.

WiFi cameras are not recommended as [their streams are less reliable and cause connection loss and/or lost video data](https://ipcamtalk.com/threads/camera-conflicts.68142/#post-738821), especially when more than a few WiFi cameras will be used at the same time.

Many users have reported various issues with 4K-plus Reolink cameras, it is best to stick with 5MP and lower for Reolink cameras. If you are using Reolink, I suggest the [Reolink specific configuration](../configuration/camera_specific.md#reolink-cameras).

Here are some of the cameras I recommend:

- <a href="https://amzn.to/4fwoNWA" target="_blank" rel="nofollow noopener sponsored">Loryta(Dahua) IPC-T549M-ALED-S3</a> (affiliate link)
- <a href="https://amzn.to/3YXpcMw" target="_blank" rel="nofollow noopener sponsored">Loryta(Dahua) IPC-T54IR-AS</a> (affiliate link)
- <a href="https://amzn.to/3AvBHoY" target="_blank" rel="nofollow noopener sponsored">Amcrest IP5M-T1179EW-AI-V3</a> (affiliate link)
- <a href="https://www.bhphotovideo.com/c/product/1705511-REG/hikvision_colorvu_ds_2cd2387g2p_lsu_sl_8mp_network.html" target="_blank" rel="nofollow noopener">HIKVISION DS-2CD2387G2P-LSU/SL ColorVu 8MP Panoramic Turret IP Camera</a> (affiliate link)

I may earn a small commission for my endorsement, recommendation, testimonial, or link to any products or services from this website.

## Server

My current favorite is the Beelink EQ13 because of the efficient N100 CPU and dual NICs that allow you to setup a dedicated private network for your cameras where they can be blocked from accessing the internet. There are many used workstation options on eBay that work very well. Anything with an Intel CPU and capable of running Debian should work fine. As a bonus, you may want to look for devices with a M.2 or PCIe express slot that is compatible with the Google Coral, Hailo, or other AI accelerators.

Note that many of these mini PCs come with Windows pre-installed, and you will need to install Linux according to the [getting started guide](../guides/getting_started.md).

I may earn a small commission for my endorsement, recommendation, testimonial, or link to any products or services from this website.

:::warning

If the EQ13 is out of stock, the link below may take you to a suggested alternative on Amazon. The Beelink EQ14 has some known compatibility issues, so you should avoid that model for now.

:::

| Name                                                                                                          | Capabilities                                                               | Notes                                               |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| Beelink EQ13 (<a href="https://amzn.to/4jn2qVr" target="_blank" rel="nofollow noopener sponsored">Amazon</a>) | Can run object detection on several 1080p cameras with low-medium activity | Dual gigabit NICs for easy isolated camera network. |
| Intel 1120p ([Amazon](https://www.amazon.com/Beelink-i3-1220P-Computer-Display-Gigabit/dp/B0DDCKT9YP)         | Can handle a large number of 1080p cameras with high activity              |                                                     |
| Intel 125H ([Amazon](https://www.amazon.com/MINISFORUM-Pro-125H-Barebone-Computer-HDMI2-1/dp/B0FH21FSZM)      | Can handle a significant number of 1080p cameras with high activity        | Includes NPU for more efficient detection in 0.17+  |

## Detectors

A detector is a device which is optimized for running inferences efficiently to detect objects. Using a recommended detector means there will be less latency between detections and more detections can be run per second. Frigate is designed around the expectation that a detector is used to achieve very low inference speeds. Offloading TensorFlow to a detector is an order of magnitude faster and will reduce your CPU load dramatically.

:::info

Frigate supports multiple different detectors that work on different types of hardware:

**Most Hardware**

- [Hailo](#hailo-8): The Hailo8 and Hailo8L AI Acceleration module is available in m.2 format with a HAT for RPi devices offering a wide range of compatibility with devices.
  - [Supports many model architectures](../../configuration/object_detectors#configuration)
  - Runs best with tiny or small size models

- [Google Coral EdgeTPU](#google-coral-tpu): The Google Coral EdgeTPU is available in USB and m.2 format allowing for a wide range of compatibility with devices.
  - [Supports primarily ssdlite and mobilenet model architectures](../../configuration/object_detectors#edge-tpu-detector)

- <CommunityBadge /> [MemryX](#memryx-mx3): The MX3 M.2 accelerator module is available in m.2 format allowing for a wide range of compatibility with devices.
  - [Supports many model architectures](../../configuration/object_detectors#memryx-mx3)
  - Runs best with tiny, small, or medium-size models

**AMD**

- [ROCm](#rocm---amd-gpu): ROCm can run on AMD Discrete GPUs to provide efficient object detection
  - [Supports limited model architectures](../../configuration/object_detectors#rocm-supported-models)
  - Runs best on discrete AMD GPUs

**Apple Silicon**

- [Apple Silicon](#apple-silicon): Apple Silicon is usable on all M1 and newer Apple Silicon devices to provide efficient and fast object detection
  - [Supports primarily ssdlite and mobilenet model architectures](../../configuration/object_detectors#apple-silicon-supported-models)
  - Runs well with any size models including large
  - Runs via ZMQ proxy which adds some latency, only recommended for local connection

**Intel**

- [OpenVino](#openvino---intel): OpenVino can run on Intel Arc GPUs, Intel integrated GPUs, and Intel NPUs to provide efficient object detection.
  - [Supports majority of model architectures](../../configuration/object_detectors#openvino-supported-models)
  - Runs best with tiny, small, or medium models

**Nvidia**

- [TensortRT](#tensorrt---nvidia-gpu): TensorRT can run on Nvidia GPUs to provide efficient object detection.
  - [Supports majority of model architectures via ONNX](../../configuration/object_detectors#onnx-supported-models)
  - Runs well with any size models including large

- <CommunityBadge /> [Jetson](#nvidia-jetson): Jetson devices are supported via the TensorRT or ONNX detectors when running Jetpack 6.

**Rockchip** <CommunityBadge />

- [RKNN](#rockchip-platform): RKNN models can run on Rockchip devices with included NPUs to provide efficient object detection.
  - [Supports limited model architectures](../../configuration/object_detectors#choosing-a-model)
  - Runs best with tiny or small size models
  - Runs efficiently on low power hardware

**Synaptics** <CommunityBadge />

- [Synaptics](#synaptics): synap models can run on Synaptics devices(e.g astra machina) with included NPUs to provide efficient object detection.

:::

### Hailo-8

Frigate supports both the Hailo-8 and Hailo-8L AI Acceleration Modules on compatible hardware platforms—including the Raspberry Pi 5 with the PCIe hat from the AI kit. The Hailo detector integration in Frigate automatically identifies your hardware type and selects the appropriate default model when a custom model isn’t provided.

**Default Model Configuration:**

- **Hailo-8L:** Default model is **YOLOv6n**.
- **Hailo-8:** Default model is **YOLOv6n**.

In real-world deployments, even with multiple cameras running concurrently, Frigate has demonstrated consistent performance. Testing on x86 platforms—with dual PCIe lanes—yields further improvements in FPS, throughput, and latency compared to the Raspberry Pi setup.

| Name             | Hailo‑8 Inference Time | Hailo‑8L Inference Time |
| ---------------- | ---------------------- | ----------------------- |
| ssd mobilenet v1 | ~ 6 ms                 | ~ 10 ms                 |
| yolov9-tiny      |                        | 320: 18ms               |
| yolov6n          | ~ 7 ms                 | ~ 11 ms                 |

### Google Coral TPU

:::warning

The Coral is no longer recommended for new Frigate installations, except in deployments with particularly low power requirements or hardware incapable of utilizing alternative AI accelerators for object detection. Instead, we suggest using one of the numerous other supported object detectors. Frigate will continue to provide support for the Coral TPU for as long as practicably possible given its still one of the most power-efficient devices for executing object detection models.

:::

Frigate supports both the USB and M.2 versions of the Google Coral.

- The USB version is compatible with the widest variety of hardware and does not require a driver on the host machine. However, it does lack the automatic throttling features of the other versions.
- The PCIe and M.2 versions require installation of a driver on the host. https://github.com/jnicolson/gasket-builder should be used.

A single Coral can handle many cameras using the default model and will be sufficient for the majority of users. You can calculate the maximum performance of your Coral based on the inference speed reported by Frigate. With an inference speed of 10, your Coral will top out at `1000/10=100`, or 100 frames per second. If your detection fps is regularly getting close to that, you should first consider tuning motion masks. If those are already properly configured, a second Coral may be needed.

### OpenVINO - Intel

The OpenVINO detector type is able to run on:

- 6th Gen Intel Platforms and newer that have an iGPU
- x86 hosts with an Intel Arc GPU
- Intel NPUs
- Most modern AMD CPUs (though this is officially not supported by Intel)
- x86 & Arm64 hosts via CPU (generally not recommended)

:::note

Intel B-series (Battlemage) GPUs are not officially supported with Frigate 0.17, though a user has [provided steps to rebuild the Frigate container](https://github.com/blakeblackshear/frigate/discussions/21257) with support for them.

:::

More information is available [in the detector docs](/configuration/object_detectors#openvino-detector)

Inference speeds vary greatly depending on the CPU or GPU used, some known examples of GPU inference times are below:

| Name           | MobileNetV2 Inference Time | YOLOv9                                            | YOLO-NAS Inference Time   | RF-DETR Inference Time | Notes                              |
| -------------- | -------------------------- | ------------------------------------------------- | ------------------------- | ---------------------- | ---------------------------------- |
| Intel HD 530   | 15 - 35 ms                 |                                                   |                           |                        | Can only run one detector instance |
| Intel HD 620   | 15 - 25 ms                 |                                                   | 320: ~ 35 ms              |                        |                                    |
| Intel HD 630   | ~ 15 ms                    |                                                   | 320: ~ 30 ms              |                        |                                    |
| Intel UHD 730  | ~ 10 ms                    | t-320: 14ms s-320: 24ms t-640: 34ms s-640: 65ms   | 320: ~ 19 ms 640: ~ 54 ms |                        |                                    |
| Intel UHD 770  | ~ 15 ms                    | t-320: ~ 16 ms s-320: ~ 20 ms s-640: ~ 40 ms      | 320: ~ 20 ms 640: ~ 46 ms |                        |                                    |
| Intel N100     | ~ 15 ms                    | s-320: 30 ms                                      | 320: ~ 25 ms              |                        | Can only run one detector instance |
| Intel N150     | ~ 15 ms                    | t-320: 16 ms s-320: 24 ms                         |                           |                        |                                    |
| Intel Iris XE  | ~ 10 ms                    | t-320: 6 ms t-640: 14 ms s-320: 8 ms s-640: 16 ms | 320: ~ 10 ms 640: ~ 20 ms | 320-n: 33 ms           |                                    |
| Intel NPU      | ~ 6 ms                     | s-320: 11 ms                                      | 320: ~ 14 ms 640: ~ 34 ms | 320-n: 40 ms           |                                    |
| Intel Arc A310 | ~ 5 ms                     | t-320: 7 ms t-640: 11 ms s-320: 8 ms s-640: 15 ms | 320: ~ 8 ms 640: ~ 14 ms  |                        |                                    |
| Intel Arc A380 | ~ 6 ms                     |                                                   | 320: ~ 10 ms 640: ~ 22 ms | 336: 20 ms 448: 27 ms  |                                    |
| Intel Arc A750 | ~ 4 ms                     |                                                   | 320: ~ 8 ms               |                        |                                    |

### TensorRT - Nvidia GPU

Frigate is able to utilize an Nvidia GPU which supports the 12.x series of CUDA libraries.

#### Minimum Hardware Support

12.x series of CUDA libraries are used which have minor version compatibility. The minimum driver version on the host system must be `>=545`. Also the GPU must support a Compute Capability of `5.0` or greater. This generally correlates to a Maxwell-era GPU or newer, check the NVIDIA GPU Compute Capability table linked below.

Make sure your host system has the [nvidia-container-runtime](https://docs.docker.com/config/containers/resource_constraints/#access-an-nvidia-gpu) installed to pass through the GPU to the container and the host system has a compatible driver installed for your GPU.

There are improved capabilities in newer GPU architectures that TensorRT can benefit from, such as INT8 operations and Tensor cores. The features compatible with your hardware will be optimized when the model is converted to a trt file. Currently the script provided for generating the model provides a switch to enable/disable FP16 operations. If you wish to use newer features such as INT8 optimization, more work is required.

#### Compatibility References:

[NVIDIA TensorRT Support Matrix](https://docs.nvidia.com/deeplearning/tensorrt/archives/tensorrt-841/support-matrix/index.html)

[NVIDIA CUDA Compatibility](https://docs.nvidia.com/deploy/cuda-compatibility/index.html)

[NVIDIA GPU Compute Capability](https://developer.nvidia.com/cuda-gpus)

Inference speeds will vary greatly depending on the GPU and the model used.
`tiny (t)` variants are faster than the equivalent non-tiny model, some known examples are below:

✅ - Accelerated with CUDA Graphs
❌ - Not accelerated with CUDA Graphs

| Name      | ✅ YOLOv9 Inference Time              | ✅ RF-DETR Inference Time | ❌ YOLO-NAS Inference Time |
| --------- | ------------------------------------- | ------------------------- | -------------------------- |
| GTX 1070  | s-320: 16 ms                          |                           | 320: 14 ms                 |
| RTX 3050  | t-320: 8 ms s-320: 10 ms s-640: 28 ms | Nano-320: ~ 12 ms         | 320: ~ 10 ms 640: ~ 16 ms  |
| RTX 3070  | t-320: 6 ms s-320: 8 ms s-640: 25 ms  | Nano-320: ~ 9 ms          | 320: ~ 8 ms 640: ~ 14 ms   |
| RTX A4000 |                                       |                           | 320: ~ 15 ms               |
| Tesla P40 |                                       |                           | 320: ~ 105 ms              |

### Apple Silicon

With the [Apple Silicon](../configuration/object_detectors.md#apple-silicon-detector) detector Frigate can take advantage of the NPU in M1 and newer Apple Silicon.

:::warning

Apple Silicon can not run within a container, so a ZMQ proxy is utilized to communicate with [the Apple Silicon Frigate detector](https://github.com/frigate-nvr/apple-silicon-detector) which runs on the host. This should add minimal latency when run on the same device.

:::

| Name   | YOLOv9 Inference Time                |
| ------ | ------------------------------------ |
| M4     | s-320: 10 ms                         |
| M3 Pro | t-320: 6 ms s-320: 8 ms s-640: 20 ms |
| M1     | s-320: 9ms                           |

### ROCm - AMD GPU

With the [ROCm](../configuration/object_detectors.md#amdrocm-gpu-detector) detector Frigate can take advantage of many discrete AMD GPUs.

| Name      | YOLOv9 Inference Time       | YOLO-NAS Inference Time   |
| --------- | --------------------------- | ------------------------- |
| AMD 780M  | t-320: ~ 14 ms s-320: 20 ms | 320: ~ 25 ms 640: ~ 50 ms |
| AMD 8700G |                             | 320: ~ 20 ms 640: ~ 40 ms |

## Community Supported Detectors

### MemryX MX3

Frigate supports the MemryX MX3 M.2 AI Acceleration Module on compatible hardware platforms, including both x86 (Intel/AMD) and ARM-based SBCs such as Raspberry Pi 5.

A single MemryX MX3 module is capable of handling multiple camera streams using the default models, making it sufficient for most users. For larger deployments with more cameras or bigger models, multiple MX3 modules can be used. Frigate supports multi-detector configurations, allowing you to connect multiple MX3 modules to scale inference capacity.

Detailed information is available [in the detector docs](/configuration/object_detectors#memryx-mx3).

**Default Model Configuration:**

- Default model is **YOLO-NAS-Small**.

The MX3 is a pipelined architecture, where the maximum frames per second supported (and thus supported number of cameras) cannot be calculated as `1/latency` (1/"Inference Time") and is measured separately. When estimating how many camera streams you may support with your configuration, use the **MX3 Total FPS** column to approximate of the detector's limit, not the Inference Time.

| Model                | Input Size | MX3 Inference Time | MX3 Total FPS |
| -------------------- | ---------- | ------------------ | ------------- |
| YOLO-NAS-Small       | 320        | ~ 9 ms             | ~ 378         |
| YOLO-NAS-Small       | 640        | ~ 21 ms            | ~ 138         |
| YOLOv9s              | 320        | ~ 16 ms            | ~ 382         |
| YOLOv9s              | 640        | ~ 41 ms            | ~ 110         |
| YOLOX-Small          | 640        | ~ 16 ms            | ~ 263         |
| SSDlite MobileNet v2 | 320        | ~ 5 ms             | ~ 1056        |

Inference speeds may vary depending on the host platform. The above data was measured on an **Intel 13700 CPU**. Platforms like Raspberry Pi, Orange Pi, and other ARM-based SBCs have different levels of processing capability, which may limit total FPS.

### Nvidia Jetson

Jetson devices are supported via the TensorRT or ONNX detectors when running Jetpack 6. It will [make use of the Jetson's hardware media engine](/configuration/hardware_acceleration_video#nvidia-jetson-orin-agx-orin-nx-orin-nano-xavier-agx-xavier-nx-tx2-tx1-nano) when configured with the [appropriate presets](/configuration/ffmpeg_presets#hwaccel-presets), and will make use of the Jetson's GPU and DLA for object detection when configured with the [TensorRT detector](/configuration/object_detectors#nvidia-tensorrt-detector).

Inference speed will vary depending on the YOLO model, jetson platform and jetson nvpmodel (GPU/DLA/EMC clock speed). It is typically 20-40 ms for most models. The DLA is more efficient than the GPU, but not faster, so using the DLA will reduce power consumption but will slightly increase inference time.

### Rockchip platform

Frigate supports hardware video processing on all Rockchip boards. However, hardware object detection is only supported on these boards:

- RK3562
- RK3566
- RK3568
- RK3576
- RK3588

| Name           | YOLOv9 Inference Time | YOLO-NAS Inference Time     | YOLOx Inference Time    |
| -------------- | --------------------- | --------------------------- | ----------------------- |
| rk3588 3 cores | tiny: ~ 35 ms         | small: ~ 20 ms med: ~ 30 ms | nano: 14 ms tiny: 18 ms |
| rk3566 1 core  |                       | small: ~ 96 ms              |                         |

The inference time of a rk3588 with all 3 cores enabled is typically 25-30 ms for yolo-nas s.

### Synaptics

- **Synaptics** Default model is **mobilenet**

| Name          | Synaptics SL1680 Inference Time |
| ------------- | ------------------------------- |
| ssd mobilenet | ~ 25 ms                         |
| yolov5m       | ~ 118 ms                        |

## What does Frigate use the CPU for and what does it use a detector for? (ELI5 Version)

This is taken from a [user question on reddit](https://www.reddit.com/r/homeassistant/comments/q8mgau/comment/hgqbxh5/?utm_source=share&utm_medium=web2x&context=3). Modified slightly for clarity.

CPU Usage: I am a CPU, Mendel is a Google Coral

My buddy Mendel and I have been tasked with keeping the neighbor's red footed booby off my parent's yard. Now I'm really bad at identifying birds. It takes me forever, but my buddy Mendel is incredible at it.

Mendel however, struggles at pretty much anything else. So we make an agreement. I wait till I see something that moves, and snap a picture of it for Mendel. I then show him the picture and he tells me what it is. Most of the time it isn't anything. But eventually I see some movement and Mendel tells me it is the Booby. Score!

_What happens when I increase the resolution of my camera?_

However we realize that there is a problem. There is still booby poop all over the yard. How could we miss that! I've been watching all day! My parents check the window and realize its dirty and a bit small to see the entire yard so they clean it and put a bigger one in there. Now there is so much more to see! However I now have a much bigger area to scan for movement and have to work a lot harder! Even my buddy Mendel has to work harder, as now the pictures have a lot more detail in them that he has to look at to see if it is our sneaky booby.

Basically - When you increase the resolution and/or the frame rate of the stream there is now significantly more data for the CPU to parse. That takes additional computing power. The Google Coral is really good at doing object detection, but it doesn't have time to look everywhere all the time (especially when there are many windows to check). To balance it, Frigate uses the CPU to look for movement, then sends those frames to the Coral to do object detection. This allows the Coral to be available to a large number of cameras and not overload it.

## Do hwaccel args help if I am using a Coral?

YES! The Coral does not help with decoding video streams.

Decompressing video streams takes a significant amount of CPU power. Video compression uses key frames (also known as I-frames) to send a full frame in the video stream. The following frames only include the difference from the key frame, and the CPU has to compile each frame by merging the differences with the key frame. [More detailed explanation](https://support.video.ibm.com/hc/en-us/articles/18106203580316-Keyframes-InterFrame-Video-Compression). Higher resolutions and frame rates mean more processing power is needed to decode the video stream, so try and set them on the camera to avoid unnecessary decoding work.
