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

## OpenVino

The OpenVino detector allows Frigate to run an OpenVino IR model on Intel CPU, GPU and VPU hardware.

### OpenVino Devices

The OpenVino detector supports the Intel-supplied device plugins and can specify one or more devices in the configuration.  See OpenVino's device naming conventions in the [Device Documentation](https://docs.openvino.ai/latest/openvino_docs_OV_UG_Working_with_devices.html) for more detail. Other supported devices could be `AUTO`, `CPU`, `GPU`, etc.

```yaml
detectors:
  ov_detector:
    type: openvino
    device: GPU
```

### OpenVino Models

The included model for an OpenVino detector comes from Intel's Open Model Zoo [SSDLite MobileNet V2](https://github.com/openvinotoolkit/open_model_zoo/tree/master/models/public/ssdlite_mobilenet_v2) and is converted to an FP16 precision IR model.  Use the model configuration shown below when using the OpenVino detector.

```yaml
model:
  path: /openvino-model/ssdlite_mobilenet_v2.xml
  width: 300
  height: 300
  input_tensor: [B, H, W, C]
  input_pixel_format: "bgr"
  labelmap_path: /openvino-model/coco_91cl_bkgr.txt

```
