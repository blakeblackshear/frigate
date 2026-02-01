---
id: gpu
title: GPU Errors
---

## OpenVINO

### Can't get OPTIMIZATION_CAPABILITIES property as no supported devices found.

Some users have reported issues using some Intel iGPUs with OpenVINO, where the GPU would not be detected. This error can be caused by various problems, so it is important to ensure the configuration is setup correctly. Some solutions users have noted:

- In some cases users have noted that an HDMI dummy plug was necessary to be plugged into the motherboard's HDMI port.
- When mixing an Intel iGPU with Nvidia GPU, the devices can be mixed up between `/dev/dri/renderD128` and `/dev/dri/renderD129` so it is important to confirm the correct device, or map the entire `/dev/dri` directory into the Frigate container.