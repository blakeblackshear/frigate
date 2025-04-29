---
id: birdseye
title: 鸟瞰视图
---

# 鸟瞰视图

除了Frigate的实时摄像头仪表板外，鸟瞰视图提供了一个便携的全局视角，让您无需逐个查看可能没有活动的摄像头，就能掌握整个监控区域的动态。鸟瞰视图提供多种智能显示模式，可根据您关注的场景自动调整显示内容。

您可以通过在Web界面中将"Birdseye"摄像头添加到摄像头组来查看鸟瞰视图。在实时页面点击"+"图标创建摄像头组，并选择"Birdseye"作为其中一个摄像头。

鸟瞰视图也可用于Home Assistant仪表板、投屏到媒体设备等场景。

## 鸟瞰视图行为模式

### 显示模式

鸟瞰视图提供多种模式来自定义不同情况下显示的摄像头：

- **continuous(持续模式)**：始终显示所有摄像头
- **motion(运动模式)**：仅显示最近30秒内检测到运动的摄像头  
- **objects(对象模式)**：仅显示最近30秒内有活动对象被追踪的摄像头

### 自定义图标

您可以在Frigate的`media`文件夹中添加名为`custom.png`的180x180图片来自定义鸟瞰视图背景图标。图片必须是透明背景的PNG格式，所有非透明像素在鸟瞰视图中将显示为白色。

### 摄像头级别覆盖设置

如果希望特定摄像头只在特定情况下显示在鸟瞰视图中，或者完全不显示，可以在摄像头级别进行配置：

```yaml
# 默认所有摄像头都显示在鸟瞰视图中
birdseye:
  enabled: True
  mode: continuous

cameras:
  front:
    # 仅当检测到对象时才显示前门摄像头
    birdseye:
      mode: objects
  back:
    # 不显示后门摄像头
    birdseye:
      enabled: False
```

### 非活动时间阈值

默认情况下，鸟瞰视图会显示过去30秒内有配置活动的摄像头，此时间可调整：

```yaml
birdseye:
  enabled: True
  inactivity_threshold: 15  # 改为15秒
```

## 鸟瞰视图布局

### 分辨率设置

可以配置鸟瞰视图的分辨率和宽高比。分辨率影响画质但不影响布局，而宽高比会影响摄像头的排列方式。

```yaml
birdseye:
  enabled: True
  width: 1280  # 宽度
  height: 720  # 高度
```

### 摄像头排序

可以覆盖鸟瞰视图中摄像头的显示顺序。需要在摄像头级别设置排序值。

```yaml
birdseye:
  enabled: True
  mode: continuous

cameras:
  front:
    birdseye:
      order: 1  # 显示在第一位
  back:
    birdseye:
      order: 2  # 显示在第二位
```

_注意_：默认情况下摄像头按名称排序以确保鸟瞰视图布局稳定。

### 最大摄像头数限制

可以限制鸟瞰视图一次显示的摄像头数量。启用此功能后，鸟瞰视图将显示最近活动的摄像头。设有冷却时间以防止摄像头切换过于频繁。

例如，以下配置仅显示最近活动的1个摄像头：

```yaml
birdseye:
  enabled: True
  layout:
    max_cameras: 1  # 最多显示1个摄像头
```

### 缩放系数

默认情况下，鸟瞰视图尝试每行排列2个摄像头，然后按倍数缩放直到找到合适的布局。缩放系数可在1.0到5.0之间调整。

```yaml
birdseye:
  enabled: True
  layout:
    scaling_factor: 3.0  # 缩放系数设为3.0
```