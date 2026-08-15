---
id: cpu
title: High CPU Usage
---

High CPU usage can impact Frigate's performance and responsiveness. This guide explains how to interpret the CPU values Frigate reports and outlines the most effective configuration changes to help reduce CPU consumption and optimize resource usage.

## Understanding Frigate's Reported CPU Usage

Frigate's CPU percentages often look much higher than what the host reports. Usually both numbers are correct and are simply measured against different denominators, so confirm you actually have a problem before tuning anything.

### Per-process values are relative to a single core

The values Frigate reports for FFmpeg, capture, detect, detector, and other processes follow the same convention as `top`: 100% means one CPU core is fully saturated, not that the whole system is saturated. A multithreaded process such as FFmpeg can legitimately report well over 100%.

Host and hypervisor tools instead report a percentage of the machine's total capacity across all cores. This includes `docker stats`, the `htop` summary, the Proxmox summary graph, the Unraid dashboard, Synology Resource Monitor, and Home Assistant's system monitor sensors. To reconcile the two:

```
host percentage ≈ (sum of Frigate's process percentages) / (number of cores)
```

On a 4 core system, an FFmpeg process reporting 100% is consuming one quarter of the machine, so the host will show roughly 25 to 30% once the remaining Frigate processes are included. That same 100% on a 16 core system is about 6%. Frigate's own warning thresholds use the per-core convention as well, so an FFmpeg process is flagged at 20% of a single core, not 20% of the system.

### Instantaneous samples and averages measure different things

Frigate collects stats every 15 seconds, and the `cpu` value covers only the interval since the previous collection. The `cpu_average` value in the stats API and MQTT payload is the average across the entire life of the process, and it is what the high CPU usage warnings are based on. Host dashboards generally plot data averaged over a longer window, so a single Frigate sample can show a peak that a host graph never displays. A process that has just started, such as FFmpeg after a camera reconnect, reports 0 until it has been sampled twice.

### The system-wide value depends on what the container can see

The system CPU value is read from `/proc/stat`. Under Docker that file belongs to the host, so the value covers the entire machine including workloads unrelated to Frigate, and it will not match `docker stats` for the Frigate container. Under an LXC container, lxcfs virtualizes `/proc/stat` and the value reflects only the cores assigned to the container. In a virtual machine, the guest sees only its assigned vCPUs while the hypervisor divides by every physical thread on the node, so guest and host percentages will not agree even when both are accurate.

## 1. Hardware Acceleration for Video Decoding

**Priority: Critical**

Video decoding is one of the most CPU-intensive tasks in Frigate. While an AI accelerator handles object detection, it does not assist with decoding video streams. Hardware acceleration (hwaccel) offloads this work to your GPU or specialized video decode hardware, significantly reducing CPU usage and enabling you to support more cameras on the same hardware.

### Key Concepts

**Resolution & FPS Impact:** The decoding burden grows exponentially with resolution and frame rate. A 4K stream at 30 FPS requires roughly 4 times the processing power of a 1080p stream at the same frame rate, and doubling the frame rate doubles the decode workload. This is why hardware acceleration becomes critical when working with multiple high-resolution cameras.

**Hardware Acceleration Benefits:** By using dedicated video decode hardware, you can:

- Significantly reduce CPU usage per camera stream
- Support 2-3x more cameras on the same hardware
- Free up CPU resources for motion detection and other Frigate processes
- Reduce system heat and power consumption

### Configuration

Frigate provides preset configurations for common hardware acceleration scenarios. Set up `hwaccel_args` based on your hardware in your [configuration](../configuration/advanced/reference) as described in the [getting started guide](../guides/getting_started).

### Troubleshooting Hardware Acceleration

If hardware acceleration isn't working:

1. Check Frigate logs for FFmpeg errors related to hwaccel
2. Verify the hardware device is accessible inside the container
3. Ensure your camera streams use H.264 or H.265 codecs (most common)
4. Try different presets if the automatic detection fails
5. Check that your GPU drivers are properly installed on the host system

## 2. Detector Selection and Configuration

**Priority: Critical**

Choosing the right detector for your hardware is the single most important factor for detection performance. The detector is responsible for running the AI model that identifies objects in video frames. Different detector types have vastly different performance characteristics and hardware requirements, as detailed in the [hardware documentation](../frigate/hardware).

### Understanding Detector Performance

Frigate uses motion detection as a first-line check before running expensive object detection, as explained in the [motion detection documentation](../configuration/motion_detection). When motion is detected, Frigate creates a "region" (the green boxes in the [debug viewer](/usage/live#the-single-camera-view)) and sends it to the detector. The detector's inference speed determines how many detections per second your system can handle.

**Calculating Detector Capacity:** Your detector has a finite capacity measured in detections per second. With an inference speed of 10ms, your detector can handle approximately 100 detections per second (1000ms / 10ms = 100).If your cameras collectively require more than this capacity, you'll experience delays, missed detections, or the system will fall behind.

### Choosing the Right Detector

Different detectors have vastly different performance characteristics, see the expected performance for object detectors in [the hardware docs](../frigate/hardware)

### Multiple Detector Instances

When a single detector cannot keep up with your camera count, some detector types (`openvino`, `onnx`) allow you to define multiple detector instances to share the workload. This is particularly useful with GPU-based detectors that have sufficient VRAM to run multiple inference processes.

For detailed instructions on configuring multiple detectors, see the [Object Detectors documentation](../configuration/object_detectors).

**When to add a second detector:**

- Skipped FPS is consistently > 0 even during normal activity

### Model Selection and Optimization

The model you use significantly impacts detector performance. Frigate provides default models optimized for each detector type, but you can customize them as described in the [detector documentation](../configuration/object_detectors).

**Model Size Trade-offs:**

- Smaller models (320x320): Faster inference, Frigate is specifically optimized for a 320x320 size model.
- Larger models (640x640): Slower inference, can sometimes have higher accuracy on very large objects that take up a majority of the frame.

For more detail on picking the right size, see [Choosing a model size](../configuration/object_detectors.md#choosing-a-model-size).

## 3. Reducing Detector CPU Usage

**Priority: High**

The **Detector CPU Usage** metric measures the CPU spent converting frames into the tensor format the model expects and post-processing the model's output. It does not include inference, so this value can be high even when you've configured a GPU, NPU, or Coral for object detection.

This metric scales with how many detections per second Frigate runs and how expensive each one is to prepare. Tuning [motion detection](../configuration/motion_detection) is usually the first recommendation to reduce the number of detections. Additionally, you can:

- **Lower `detect -> fps`.** 5 is the recommended value for nearly all cameras. Running at 10 doubles the frames eligible for detection and is one of the largest contributors to this metric.
- **Use a 320x320 model.** A 640x640 model has 4 times as many pixels to transpose, convert, and copy on every inference.
- **Prefer a model that takes integer input.** Models configured with `input_dtype: float` require each frame to be converted to float32 and normalized on the CPU first. Models taking `int` input, such as the tflite models used by the Edge TPU, skip that step.
- **Do not match the detect resolution to the model resolution.** The detect stream should match your camera's aspect ratio, for example `1280x720`, not the model's input size. Frigate crops and scales regions of motion itself, so an oversized detect stream only adds work.
- **Tune stationary object behavior.** Objects that never settle into a stationary state are re-detected continuously. Raising `detect -> stationary -> interval` reduces how often detection runs on objects that are already parked. See [stationary objects](../configuration/stationary_objects).

Adding [more detector instances](#multiple-detector-instances) spreads this work across more CPU cores, but does not reduce the total CPU used.
