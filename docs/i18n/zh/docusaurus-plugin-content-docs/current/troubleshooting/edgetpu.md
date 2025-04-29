---
id: edgetpu
title: EdgeTPU故障排除
---

## USB Coral未被检测到

USB coral未被检测到可能有多种原因，有些是特定操作系统的问题。理解USB coral的工作原理很重要：

1. 当设备首次插入且未初始化时，运行`lsusb`或在HA OS的硬件页面中查看时会显示为`1a6e:089a Global Unichip Corp.`
2. 初始化后，运行`lsusb`或在HA OS的硬件页面中查看时会显示为`18d1:9302 Google Inc.`

:::tip

在Frigate使用coral进行推理之前，使用`lsusb`或查看HA OS的硬件页面时会显示为`1a6e:089a Global Unichip Corp.`。因此在Frigate尝试检测coral之前，不用担心这个标识。

:::

如果coral无法初始化，Frigate就无法与其通信。基于USB的Coral无法初始化的一些常见原因包括：

### 供电不足

USB coral可能需要高达900mA的电流，这对某些设备上的USB端口来说可能太高，特别是对RPi这样的小型单板计算机。如果coral无法初始化，建议采取以下步骤：

1. 尝试使用不同的端口，某些端口能提供更大的功率。
2. 确保使用USB3端口，这对于供电和确保coral以最高速度运行都很重要。
3. 尝试使用不同的数据线，一些用户发现随附的数据线效果不佳。
4. 使用外部供电的USB集线器。

### 设备访问权限不正确

USB coral在未初始化和初始化状态下有不同的ID。

- 在VM、Proxmox lxc等环境中运行Frigate时，必须确保两个设备ID都已映射。
- 通过Home Assistant OS运行时，可能需要运行完全访问版本的Frigate插件，并禁用_保护模式_开关以访问coral。

### Synology 716+II运行DSM 7.2.1-69057 Update 5

一些用户报告这款较旧的设备运行较旧的内核，导致coral无法被检测到。以下步骤可以帮助正确检测：

1. 将coral TPU插入NAS的任意USB端口
2. 打开控制面板-信息界面。coral TPU会显示为通用设备。
3. 在配置中启用Coral TPU并启动docker容器
4. TPU会被检测到，但几分钟后会断开连接。
5. 保持TPU设备插入状态，通过UI中的重启命令重启NAS。不要拔掉NAS电源或关机。
6. 打开控制面板-信息界面。coral TPU现在会被识别为USB设备 - google inc
7. 启动frigate容器。现在一切应该正常工作了！

## USB Coral检测似乎卡住

USB Coral可能会卡住需要重启，这可能由多种硬件和软件设置原因导致。一些常见原因是：

1. 一些用户发现coral随附的数据线会导致这个问题，换用其他数据线可以完全解决。
2. 在VM中运行Frigate可能导致与设备的通信中断需要重置。

## PCIe Coral未被检测到

PCIe Coral未被检测到最常见的原因是驱动程序未安装。这个过程因操作系统和内核版本而异。

- 在大多数情况下，[Coral文档](https://coral.ai/docs/m2/get-started/#2-install-the-pcie-driver-and-edge-tpu-runtime)展示了如何为基于PCIe的Coral安装驱动程序。
- 对于Ubuntu 22.04+，可以使用https://github.com/jnicolson/gasket-builder 来构建和安装最新版本的驱动程序。

## 尝试加载TPU为pci时出现"Fatal Python error: Illegal instruction"

这是由于在新的linux内核上使用过时的gasket驱动程序导致的问题。从https://github.com/jnicolson/gasket-builder 安装更新的驱动程序据报可以解决此问题。

### 在Raspberry Pi5上无法检测

由于RPi5的内核更新，需要更新config.txt，详见[树莓派论坛的更多信息](https://forums.raspberrypi.com/viewtopic.php?t=363682&sid=cb59b026a412f0dc041595951273a9ca&start=25)

具体来说，需要在config.txt中添加以下内容：

```
dtoverlay=pciex1-compat-pi5,no-mip
dtoverlay=pcie-32bit-dma-pi5
```

## Coral Dual EdgeTPU只检测到一个PCIe Coral

Coral Dual EdgeTPU是一张带有两个相同TPU核心的卡。每个核心都有自己的PCIe接口，主板需要在m.2插槽上有两个PCIe总线才能使它们都工作。

完全符合m.2机电规范的E-key插槽有两个PCIe总线。大多数主板制造商在m.2 E-key连接器中只实现一个PCIe总线（这就是为什么只有一个TPU工作）。一些SBC的m.2连接器上可能只有USB总线，即两个TPU都无法工作。

在这种情况下，建议使用Dual EdgeTPU适配器，[比如MagicBlueSmoke的这款](https://github.com/magic-blue-smoke/Dual-Edge-TPU-Adapter)。