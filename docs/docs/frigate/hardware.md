---
id: hardware
title: Recommended hardware
---

## Cameras

Cameras that output H.264 video and AAC audio will offer the most compatibility with all features of Frigate and Home Assistant. It is also helpful if your camera supports multiple substreams to allow different resolutions to be used for detection, streaming, and recordings without re-encoding.

I recommend Dahua, Hikvision, and Amcrest in that order. Dahua edges out Hikvision because they are easier to find and order, not because they are better cameras. I personally use Dahua cameras because they are easier to purchase directly. In my experience Dahua and Hikvision both have multiple streams with configurable resolutions and frame rates and rock solid streams. They also both have models with large sensors well known for excellent image quality at night. Not all the models are equal. Larger sensors are better than higher resolutions; especially at night. Amcrest is the fallback recommendation because they are rebranded Dahuas. They are rebranding the lower end models with smaller sensors or less configuration options.

WiFi cameras are not recommended as [their streams are less reliable and cause connection loss and/or lost video data](https://ipcamtalk.com/threads/camera-conflicts.68142/#post-738821), especially when more than a few WiFi cameras will be used at the same time.

Many users have reported various issues with 4K-plus Reolink cameras, it is best to stick with 5MP and lower for Reolink cameras. If you are using Reolink, I suggest the [Reolink specific configuration](../configuration/camera_specific.md#reolink-cameras).

Here are some of the cameras I recommend:

- <a href="https://amzn.to/4fwoNWA" target="_blank" rel="nofollow noopener sponsored">Loryta(Dahua) IPC-T549M-ALED-S3</a> (affiliate link)
- <a href="https://amzn.to/3YXpcMw" target="_blank" rel="nofollow noopener sponsored">Loryta(Dahua) IPC-T54IR-AS</a> (affiliate link)
- <a href="https://amzn.to/3AvBHoY" target="_blank" rel="nofollow noopener sponsored">Amcrest IP5M-T1179EW-AI-V3</a> (affiliate link)
- <a href="https://amzn.to/4ltOpaC" target="_blank" rel="nofollow noopener sponsored">HIKVISION DS-2CD2387G2P-LSU/SL ColorVu 8MP Panoramic Turret IP Camera</a> (affiliate link)

I may earn a small commission for my endorsement, recommendation, testimonial, or link to any products or services from this website.

## Server

My current favorite is the Beelink EQ13 because of the efficient N100 CPU and dual NICs that allow you to setup a dedicated private network for your cameras where they can be blocked from accessing the internet. There are many used workstation options on eBay that work very well. Anything with an Intel CPU and capable of running Debian should work fine. As a bonus, you may want to look for devices with a M.2 or PCIe express slot that is compatible with the Google Coral, Hailo, or other AI accelerators.

Note that many of these mini PCs come with Windows pre-installed, and you will need to install Linux according to the [getting started guide](../guides/getting_started.md).

I may earn a small commission for my endorsement, recommendation, testimonial, or link to any products or services from this website.

:::warning

If the EQ13 is out of stock, the link below may take you to a suggested alternative on Amazon. The Beelink EQ14 has some known compatibility issues, so you should avoid that model for now.

:::

| Name                                                                                                          | Coral Inference Speed | Coral Compatibility | Notes                                                                                     |
| ------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------- | ----------------------------------------------------------------------------------------- |
| Beelink EQ13 (<a href="https://amzn.to/4jn2qVr" target="_blank" rel="nofollow noopener sponsored">Amazon</a>) | 5-10ms                | USB                 | Dual gigabit NICs for easy isolated camera network. Easily handles several 1080p cameras. |

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

**AMD**

- [ROCm](#rocm---amd-gpu): ROCm can run on AMD Discrete GPUs to provide efficient object detection
  - [Supports limited model architectures](../../configuration/object_detectors#supported-models-1)
  - Runs best on discrete AMD GPUs

**Intel**

- [OpenVino](#openvino---intel): OpenVino can run on Intel Arc GPUs, Intel integrated GPUs, and Intel CPUs to provide efficient object detection.
  - [Supports majority of model architectures](../../configuration/object_detectors#supported-models)
  - Runs best with tiny, small, or medium models

**Nvidia**

- [TensortRT](#tensorrt---nvidia-gpu): TensorRT can run on Nvidia GPUs and Jetson devices.
  - [Supports majority of model architectures via ONNX](../../configuration/object_detectors#supported-models-2)
  - Runs well with any size models including large

**Rockchip**

- [RKNN](#rockchip-platform): RKNN models can run on Rockchip devices with included NPUs to provide efficient object detection.
  - [Supports limited model architectures](../../configuration/object_detectors#choosing-a-model)
  - Runs best with tiny or small size models
  - Runs efficiently on low power hardware

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
| yolov6n          | ~ 7 ms                 | ~ 11 ms                 |

### Google Coral TPU

Frigate supports both the USB and M.2 versions of the Google Coral.

- The USB version is compatible with the widest variety of hardware and does not require a driver on the host machine. However, it does lack the automatic throttling features of the other versions.
- The PCIe and M.2 versions require installation of a driver on the host. Follow the instructions for your version from https://coral.ai

A single Coral can handle many cameras using the default model and will be sufficient for the majority of users. You can calculate the maximum performance of your Coral based on the inference speed reported by Frigate. With an inference speed of 10, your Coral will top out at `1000/10=100`, or 100 frames per second. If your detection fps is regularly getting close to that, you should first consider tuning motion masks. If those are already properly configured, a second Coral may be needed.

### OpenVINO - Intel

The OpenVINO detector type is able to run on:

- 6th Gen Intel Platforms and newer that have an iGPU
- x86 hosts with an Intel Arc GPU
- Most modern AMD CPUs (though this is officially not supported by Intel)
- x86 & Arm64 hosts via CPU (generally not recommended)

:::note

Intel NPUs have seen [limited success in community deployments](https://github.com/blakeblackshear/frigate/discussions/13248#discussioncomment-12347357), although they remain officially unsupported.

In testing, the NPU delivered performance that was only comparable to — or in some cases worse than — the integrated GPU.

:::

More information is available [in the detector docs](/configuration/object_detectors#openvino-detector)

Inference speeds vary greatly depending on the CPU or GPU used, some known examples of GPU inference times are below:

| Name           | MobileNetV2 Inference Time | YOLO-NAS Inference Time   | RF-DETR Inference Time | Notes                              |
| -------------- | -------------------------- | ------------------------- | ---------------------- | ---------------------------------- |
| Intel HD 530   | 15 - 35 ms                 |                           |                        | Can only run one detector instance |
| Intel HD 620   | 15 - 25 ms                 | 320: ~ 35 ms              |                        |                                    |
| Intel HD 630   | ~ 15 ms                    | 320: ~ 30 ms              |                        |                                    |
| Intel UHD 730  | ~ 10 ms                    | 320: ~ 19 ms 640: ~ 54 ms |                        |                                    |
| Intel UHD 770  | ~ 15 ms                    | 320: ~ 20 ms 640: ~ 46 ms |                        |                                    |
| Intel N100     | ~ 15 ms                    | 320: ~ 25 ms              |                        | Can only run one detector instance |
| Intel Iris XE  | ~ 10 ms                    | 320: ~ 18 ms 640: ~ 50 ms |                        |                                    |
| Intel Arc A380 | ~ 6 ms                     | 320: ~ 10 ms 640: ~ 22 ms | 336: 20 ms 448: 27 ms  |                                    |
| Intel Arc A750 | ~ 4 ms                     | 320: ~ 8 ms               |                        |                                    |

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
`tiny` variants are faster than the equivalent non-tiny model, some known examples are below:

| Name            | YOLOv7 Inference Time | YOLO-NAS Inference Time   | RF-DETR Inference Time    |
| --------------- | --------------------- | ------------------------- | ------------------------- |
| GTX 1060 6GB    | ~ 7 ms                |                           |                           |
| GTX 1070        | ~ 6 ms                |                           |                           |
| GTX 1660 SUPER  | ~ 4 ms                |                           |                           |
| RTX 3050        | 5 - 7 ms              | 320: ~ 10 ms 640: ~ 16 ms | 336: ~ 16 ms 560: ~ 40 ms |
| RTX 3070 Mobile | ~ 5 ms                |                           |                           |
| RTX 3070        | 4 - 6 ms              | 320: ~ 6 ms 640: ~ 12 ms  | 336: ~ 14 ms 560: ~ 36 ms |
| Quadro P400 2GB | 20 - 25 ms            |                           |                           |
| Quadro P2000    | ~ 12 ms               |                           |                           |

### ROCm - AMD GPU

With the [rocm](../configuration/object_detectors.md#amdrocm-gpu-detector) detector Frigate can take advantage of many discrete AMD GPUs.

| Name      | YOLOv9 Inference Time | YOLO-NAS Inference Time   |
| --------- | --------------------- | ------------------------- |
| AMD 780M  | ~ 14 ms               | 320: ~ 25 ms 640: ~ 50 ms |
| AMD 8700G |                       | 320: ~ 20 ms 640: ~ 40 ms |

## Community Supported Detectors

### Nvidia Jetson

Frigate supports all Jetson boards, from the inexpensive Jetson Nano to the powerful Jetson Orin AGX. It will [make use of the Jetson's hardware media engine](/configuration/hardware_acceleration_video#nvidia-jetson-orin-agx-orin-nx-orin-nano-xavier-agx-xavier-nx-tx2-tx1-nano) when configured with the [appropriate presets](/configuration/ffmpeg_presets#hwaccel-presets), and will make use of the Jetson's GPU and DLA for object detection when configured with the [TensorRT detector](/configuration/object_detectors#nvidia-tensorrt-detector).

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
