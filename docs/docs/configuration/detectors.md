---
id: detectors
title: Detectors
---

By default, Frigate will use a single CPU detector. If you have a Coral, you will need to configure your detector devices in the config file. When using multiple detectors, they run in dedicated processes, but pull from a common queue of requested detections across all cameras.

Frigate supports `edgetpu` and `cpu` as detector types. The device value should be specified according to the [Documentation for the TensorFlow Lite Python API](https://coral.ai/docs/edgetpu/multiple-edgetpu/#using-the-tensorflow-lite-python-api).

**Note**: There is no support for Nvidia GPUs to perform object detection with tensorflow. It can be used for ffmpeg decoding, but not object detection.

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

### CPU Detectors (not recommended)

```yaml
detectors:
  cpu1:
    type: cpu
    num_threads: 3
  cpu2:
    type: cpu
    num_threads: 3
```

When using CPU detectors, you can add a CPU detector per camera. Adding more detectors than the number of cameras should not improve performance.
