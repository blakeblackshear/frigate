---
id: edgetpu
title: EdgeTPU Errors
---

## USB Coral Not Detected

There are many possible causes for a USB coral not being detected and some are OS specific. It is important to understand how the USB coral works:

1. When the device is first plugged in and has not initialized it will appear as `1a6e:089a Global Unichip Corp.` when running `lsusb` or checking the hardware page in HA OS.
2. Once initialized, the device will appear as `18d1:9302 Google Inc.` when running `lsusb` or checking the hardware page in HA OS.

:::tip

Using `lsusb` or checking the hardware page in HA OS will show as `1a6e:089a Global Unichip Corp.` until Frigate runs an inferance using the coral. So don't worry about the identification until after Frigate has attempted to detect the coral.

:::

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
- When running through the Home Assistant OS you may need to run the Full Access variant of the Frigate Add-on with the _Protection mode_ switch disabled so that the coral can be accessed.

### Synology 716+II running DSM 7.2.1-69057 Update 5

Some users have reported that this older device runs an older kernel causing issues with the coral not being detected. The following steps allowed it to be detected correctly:

1. Plug in the coral TPU in any of the USB ports on the NAS
2. Open the control panel - info screen. The coral TPU would be shown as a generic device.
3. Start the docker container with Coral TPU enabled in the config
4. The TPU would be detected but a few moments later it would disconnect.
5. While leaving the TPU device plugged in, restart the NAS using the reboot command in the UI. Do NOT unplug the NAS/power it off etc.
6. Open the control panel - info scree. The coral TPU will now be recognised as a USB Device - google inc
7. Start the frigate container. Everything should work now!

### QNAP NAS

QNAP NAS devices, such as the TS-253A, may use connected Coral TPU devices if [QuMagie](https://www.qnap.com/en/software/qumagie) is installed along with its QNAP AI Core extension. If any of the features—`facial recognition`, `object recognition`, or `similar photo recognition`—are enabled, Container Station applications such as `Frigate` or `CodeProject.AI Server` will be unable to initialize the TPU device in use.
To allow the Coral TPU device to be discovered, the you must either:

1. [Disable the AI recognition features in QuMagie](https://docs.qnap.com/application/qumagie/2.x/en-us/configuring-qnap-ai-core-settings-FB13CE03.html),
2. Remove the QNAP AI Core extension or
3. Manually start the QNAP AI Core extension after Frigate has fully started (not recommended).

It is also recommended to restart the NAS once the changes have been made.

## USB Coral Detection Appears to be Stuck

The USB Coral can become stuck and need to be restarted, this can happen for a number of reasons depending on hardware and software setup. Some common reasons are:

1. Some users have found the cable included with the coral to cause this problem and that switching to a different cable fixed it entirely.
2. Running Frigate in a VM may cause communication with the device to be lost and need to be reset.

## PCIe Coral Not Detected

The most common reason for the PCIe Coral not being detected is that the driver has not been installed. This process varies based on what OS and kernel that is being run.

- In most cases https://github.com/jnicolson/gasket-builder can be used to build and install the latest version of the driver.

## Attempting to load TPU as pci & Fatal Python error: Illegal instruction

This is an issue due to outdated gasket driver when being used with new linux kernels. Installing an updated driver from https://github.com/jnicolson/gasket-builder has been reported to fix the issue.

### Not detected on Raspberry Pi5

A kernel update to the RPi5 means an upate to config.txt is required, see [the raspberry pi forum for more info](https://forums.raspberrypi.com/viewtopic.php?t=363682&sid=cb59b026a412f0dc041595951273a9ca&start=25)

Specifically, add the following to config.txt

```
dtoverlay=pciex1-compat-pi5,no-mip
dtoverlay=pcie-32bit-dma-pi5
```

## Only One PCIe Coral Is Detected With Coral Dual EdgeTPU

Coral Dual EdgeTPU is one card with two identical TPU cores. Each core has it's own PCIe interface and motherboard needs to have two PCIe busses on the m.2 slot to make them both work.

E-key slot implemented to full m.2 electromechanical specification has two PCIe busses. Most motherboard manufacturers implement only one PCIe bus in m.2 E-key connector (this is why only one TPU is working). Some SBCs can have only USB bus on m.2 connector, ie none of TPUs will work.

In this case it is recommended to use a Dual EdgeTPU Adapter [like the one from MagicBlueSmoke](https://github.com/magic-blue-smoke/Dual-Edge-TPU-Adapter)
