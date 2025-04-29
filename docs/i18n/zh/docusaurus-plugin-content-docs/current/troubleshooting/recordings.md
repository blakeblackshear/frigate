---
id: recordings
title: 录制故障排除
---

## 我已将Frigate配置为仅在有运动时录制，但即使没有运动也似乎在录制。为什么？

你需要：

- 确保摄像头的时间戳被运动遮罩覆盖。即使场景中没有运动，如果运动检测设置过于敏感，可能会将时间戳计为运动。
- 如果启用了音频检测，请记住任何高于`min_volume`的音频都会被视为运动。
- 通过编辑配置文件或使用UI中的运动调节器来[调整你的运动检测设置](/configuration/motion_detection)。

## 我看到警告信息：WARNING : Unable to keep up with recording segments in cache for camera. Keeping the 5 most recent segments out of 6 and discarding the rest...（无法跟上摄像头录制片段的缓存。保留6个中最新的5个片段，丢弃其余部分...）

这个错误可能由多个不同的问题引起。故障排除的第一步是为录制启用调试日志。这将启用显示录制从RAM缓存移动到磁盘所需时间的日志。

```yaml
logger:
  logs:
    frigate.record.maintainer: debug
```

这将包含如下日志：

```
DEBUG   : Copied /media/frigate/recordings/{segment_path} in 0.2 seconds.
```

重要的是要让它运行直到错误开始发生，以确认在错误发生时磁盘是否存在速度减慢的情况。

#### 复制时间 > 1秒

如果存储速度太慢无法跟上录制，维护程序将落后并清除最旧的录制，以确保缓存不会填满导致崩溃。在这种情况下，重要的是要诊断复制时间慢的原因。

##### 检查RAM、交换空间、缓存利用率和磁盘利用率

如果CPU、RAM、磁盘吞吐量或总线I/O不足，Frigate内部的任何设置都无法帮助。重要的是要检查每个可用系统资源的方面。

在Linux上，一些有用的诊断工具/命令包括：

- docker stats
- htop
- iotop -o
- iostat -sxy --human 1 1
- vmstat 1

在现代Linux内核上，如果启用了交换空间，系统会使用一些交换空间。设置vm.swappiness=1不再意味着内核只会在避免OOM时才进行交换。要防止容器内的任何交换，请将分配内存和内存+交换设置为相同值，并通过设置以下docker/podman运行参数来禁用交换：

**Docker Compose示例**

```yaml
services:
  frigate:
    ...
    mem_swappiness: 0
    memswap_limit: <MAXSWAP>
    deploy:
      resources:
        limits:
          memory: <MAXRAM>
```

**运行命令示例**

```
--memory=<MAXRAM> --memory-swap=<MAXSWAP> --memory-swappiness=0
```

注意：这些是容器的硬限制，请确保在`docker stats`显示的容器使用量之上有足够的余量。如果达到`<MAXRAM>`，它将立即停止。通常，在可能的情况下，将所有缓存和临时文件空间运行在RAM中比磁盘I/O更可取。

##### 检查存储类型

挂载网络共享是存储录制的流行选择，但这可能导致复制时间减慢并造成问题。一些用户发现使用`NFS`而不是`SMB`可以显著减少复制时间并解决问题。同时确保运行Frigate的设备与网络共享之间的网络连接稳定且快速也很重要。

##### 检查挂载选项

一些用户发现通过`fstab`使用`sync`选项挂载驱动器会导致性能大幅下降并引发此问题。使用`async`替代可以大大减少复制时间。

#### 复制时间 < 1秒

如果存储工作速度很快，那么此错误可能是由于机器上的CPU负载太高，Frigate没有足够的资源来跟上。尝试暂时关闭其他服务，看看问题是否改善。