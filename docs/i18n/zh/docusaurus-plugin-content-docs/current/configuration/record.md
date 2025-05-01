---
id: record
title: 录像功能
---

启用录像功能后，视频将存储在`/media/frigate/recordings`目录下。录像的文件结构为`YYYY-MM-DD/HH/<摄像头名称>/MM.SS.mp4`（使用UTC时间）。这些录像直接从摄像头流写入，不经过重新编码。每个摄像头支持可配置的保留策略。当决定是否删除录像时，Frigate会选择录像保留和追踪对象保留中较大的匹配值。

新的录像片段会从摄像头流写入缓存，只有符合设置的录像保留策略时才会移动到磁盘存储。

H265编码的录像只能在Chrome 108+、Edge和Safari浏览器中播放。其他浏览器需要H264编码的录像。

## 常见录像配置

### 最保守方案：保存所有视频

对于需要在没有检测到运动时也保存连续视频的环境，以下配置将保存3天内的所有视频。3天后，只有包含运动且与警报或检测重叠的视频会保留30天。

```yaml
record:
  enabled: True
  retain:
    days: 3
    mode: all
  alerts:
    retain:
      days: 30
      mode: motion
  detections:
    retain:
      days: 30
      mode: motion
```

### 减少存储：仅保存检测到运动的视频

为了减少存储需求，可以调整配置只保留检测到运动的视频。

```yaml
record:
  enabled: True
  retain:
    days: 3
    mode: motion
  alerts:
    retain:
      days: 30
      mode: motion
  detections:
    retain:
      days: 30
      mode: motion
```

### 最小方案：仅保存警报视频

如果只想保留追踪对象期间的视频，此配置将丢弃非警报期间的视频。

```yaml
record:
  enabled: True
  retain:
    days: 0
  alerts:
    retain:
      days: 30
      mode: motion
```

## 存储空间不足时Frigate会删除旧录像吗？

从Frigate 0.12开始，当剩余存储空间不足1小时时，系统会自动删除最早的2小时录像。

## 配置录像保留策略

Frigate支持连续录像和基于追踪对象的录像，具有独立的保留模式和保留期限。

:::tip

保留配置支持小数，例如可以设置为保留`0.5`天。

:::

### 连续录像

可以通过以下配置设置保留连续录像的天数（X为数字），默认情况下连续录像被禁用。

```yaml
record:
  enabled: True
  retain:
    days: 1 # <- 保留连续录像的天数
```

连续录像支持不同的保留模式，[详见下文](#不同保留模式的含义)

### 对象录像

可以为分类为警报和检测的回放条目分别指定保留天数。

```yaml
record:
  enabled: True
  alerts:
    retain:
      days: 10 # <- 保留警报录像的天数
  detections:
    retain:
      days: 10 # <- 保留检测录像的天数
```

此配置将保留与警报和检测重叠的录像片段10天。由于多个追踪对象可能引用相同的录像片段，这样可以避免存储重复内容并减少总体存储需求。

**警告**：必须在配置中启用录像功能。如果摄像头在配置中禁用了录像，通过上述方法启用将不会生效。

## 不同保留模式的含义

Frigate以10秒为片段保存具有`record`角色的视频流。这些选项决定了哪些录像片段会被保留（也会影响追踪对象）。

假设您配置门铃摄像头保留最近2天的连续录像：

- 使用`all`选项会保留这2天内的全部48小时录像
- 使用`motion`选项只会保留Frigate检测到运动的部分片段。这是折中方案，不会保留全部48小时，但可能会保留所有感兴趣的片段以及一些额外内容
- 使用`active_objects`选项只会保留存在真实活动对象（非静止）的片段

警报和检测也有相同的选项，但只会保存与相应类型回放条目重叠的录像。

以下配置示例将保存所有运动片段7天，活动对象片段保存14天：

```yaml
record:
  enabled: True
  retain:
    days: 7
    mode: motion
  alerts:
    retain:
      days: 14
      mode: active_objects
  detections:
    retain:
      days: 14
      mode: active_objects
```

上述配置可以全局应用或针对单个摄像头设置。

## 可以只在特定时间进行"连续"录像吗？

通过Frigate页面、Home Assistant或MQTT，可以设置摄像头只在特定情况或时间进行录像。

## 如何导出录像？

可以通过在回放面板中右键点击（桌面）或长按（移动设备）回放条目，或在历史视图中点击导出按钮来导出录像。导出的录像会通过主导航栏中的导出视图进行组织和搜索。

### 延时摄影导出

延时摄影导出只能通过[HTTP API](/integrations/api/export-recording-export-camera-name-start-start-time-end-end-time-post.api.mdx)实现。

默认情况下，延时摄影以25倍速和30FPS导出。这意味着每25秒的实际录像会被压缩为1秒的延时视频（无音频）。

要配置加速倍数、帧率等参数，可以使用`timelapse_args`配置参数。以下示例将延时速度改为60倍（1小时录像压缩为1分钟），帧率25FPS：

```yaml
record:
  enabled: True
  export:
    timelapse_args: "-vf setpts=PTS/60 -r 25"
```

:::tip

当全局使用`hwaccel_args`时，延时生成会使用硬件编码。编码器会自行决定行为，可能导致输出文件过大。
可以使用ffmpeg参数`-qp n`（n代表量化参数值）来减小输出文件大小，调整该值可以在质量和文件大小之间取得平衡。

:::

## Apple设备H.265流兼容性说明

使用Safari浏览器的Apple设备在播放H.265格式录像时可能出现兼容性问题。为确保在Apple设备上的正常播放，建议启用[Apple兼容性选项](/configuration/camera_specific.md#safari浏览器下的h265摄像头支持)。

## 录像与磁盘同步

在某些情况下，录像文件可能被删除但Frigate不知情。可以启用录像同步功能，让Frigate检查文件系统并删除数据库中不存在的文件记录。

```yaml
record:
  sync_recordings: True
```

此功能用于修复文件差异，而非完全删除数据库条目。如果删除了所有媒体文件，不要使用`sync_recordings`，而是停止Frigate，删除`frigate.db`数据库后重新启动。

:::warning

同步操作会占用大量CPU资源，大多数情况下不需要启用，仅在必要时使用。

:::