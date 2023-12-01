---
id: edgetpu
title: Troubleshooting EdgeTPU
---

## USB Coral Not Detected

There are many possible causes for a USB coral not being detected and some are OS specific. It is important to understand how the USB coral works:

1. When the device is first plugged in and has not initialized it will appear as `1a6e:089a Global Unichip Corp.` when running `lsusb` or checking the hardware page in HA OS.
2. Once initialized, the device will appear as `18d1:9302 Google Inc.` when running `lsusb` or checking the hardware page in HA OS.

If the coral does not initialize then Frigate can not interface with it. Some common reasons for the USB based Coral not initializing are:

### Not Enough Power

The USB coral can draw up to 900mA and this can be too much for some on-device USB ports, especially for small board computers like the RPi. If the coral is not initializing then some recommended steps are:

1. Try a different port, some ports are capable of providing more power than others.
2. Make sure the port is USB3, this is important for power and to ensure the coral runs at max speed.
3. Try a different cable, some users have found the included cable to not work well.
4. Use an externally powered USB hub.

### Incorrect Device Access

The USB coral has different IDs when it is uninitialized and initialized.

- When running Frigate in a VM, Proxmox lxc, etc. you must ensure both device IDs are mapped. 
- When running HA OS you may need to run the Full Access version of the Frigate addon with the `Protected Mode` switch disabled so that the coral can be accessed.

## USB Coral Detection Appears to be Stuck

The USB Coral can become stuck and need to be restarted, this can happen for a number of reasons depending on hardware and software setup. Some common reasons are:

1. Some users have found the cable included with the coral to cause this problem and that switching to a different cable fixed it entirely.
2. Running Frigate in a VM may cause communication with the device to be lost and need to be reset.

## PCIe Coral Not Detected

The most common reason for the PCIe coral not being detected is that the driver has not been installed. See [the coral docs(https://coral.ai/docs/m2/get-started/#2-install-the-pcie-driver-and-edge-tpu-runtime) for how to install the driver for the PCIe based coral. 
