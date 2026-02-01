---
id: cpu
title: High CPU Usage
---

High CPU usage can impact Frigate's performance and responsiveness. This guide outlines the most effective configuration changes to help reduce CPU consumption and optimize resource usage.

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

Frigate provides preset configurations for common hardware acceleration scenarios. Set up `hwaccel_args` based on your hardware in your [configuration](../configuration/reference) as described in the [getting started guide](../guides/getting_started).

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

Frigate uses motion detection as a first-line check before running expensive object detection, as explained in the [motion detection documentation](../configuration/motion_detection). When motion is detected, Frigate creates a "region" (the green boxes in the debug viewer) and sends it to the detector. The detector's inference speed determines how many detections per second your system can handle.

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