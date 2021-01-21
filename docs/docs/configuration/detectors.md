---
id: detectors
title: Detectors
---

The default config will look for a USB Coral device. If you do not have a Coral, you will need to configure a CPU detector. If you have PCI or multiple Coral devices, you need to configure your detector devices in the config file. When using multiple detectors, they run in dedicated processes, but pull from a common queue of requested detections across all cameras.

Frigate supports `edgetpu` and `cpu` as detector types. The device value should be specified according to the [Documentation for the TensorFlow Lite Python API](https://coral.ai/docs/edgetpu/multiple-edgetpu/#using-the-tensorflow-lite-python-api).

**Note**: There is no support for Nvidia GPUs to perform object detection with tensorflow. It can be used for ffmpeg decoding, but not object detection.

Single USB Coral:

```yaml
detectors:
  coral:
    type: edgetpu
    device: usb
```

Multiple USB Corals:

```yaml
detectors:
  coral1:
    type: edgetpu
    device: usb:0
  coral2:
    type: edgetpu
    device: usb:1
```

Mixing Corals:

```yaml
detectors:
  coral_usb:
    type: edgetpu
    device: usb
  coral_pci:
    type: edgetpu
    device: pci
```

CPU Detectors (not recommended):

```yaml
detectors:
  cpu1:
    type: cpu
  cpu2:
    type: cpu
```
