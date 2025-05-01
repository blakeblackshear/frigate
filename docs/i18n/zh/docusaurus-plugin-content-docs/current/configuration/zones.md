---
id: zones
title: 监控区
---

监控区允许您定义画面中的特定区域，并为对象类型应用额外的过滤器，从而判断对象是否位于该区内。系统会根据对象边界框的底部中心点来评估是否进入监控区，边界框与区的重叠面积不影响判断。

例如，下图中的猫当前位于监控区1，但**不在**监控区2。
![底部中心点判断](/img/bottom-center.jpg)

监控区不能与摄像头同名。如需在多摄像头覆盖同一区域时使用相同监控区，可以为每个摄像头配置同名的区。

调试时，请启用摄像头调试视图中的"监控区"选项（设置 --> 调试），以便根据需要调整。当任何对象进入区时，区边界线会变粗。

创建监控区的步骤与[创建"运动遮罩"](masks.md)类似，只需在网页界面使用创建区的功能即可。

### 限定警报和检测到特定区

通常您可能希望仅当对象进入关注区域时才创建警报。这可以通过设置`required_zones`来实现。例如，仅当对象进入整个院子区时才创建警报，配置如下：

```yaml
cameras:
  您的摄像头名称:
    review:
      alerts:
        required_zones:
          - entire_yard
    zones:
      entire_yard:
        coordinates: ...
```

您可能还想限定检测仅在对象进入次要关注区时创建。例如，当对象进入院子内部区域时触发警报，但进入院子边缘时就创建检测记录：

```yaml
cameras:
  您的摄像头名称:
    review:
      alerts:
        required_zones:
          - inner_yard
      detections:
        required_zones:
          - edge_yard
    zones:
      edge_yard:
        coordinates: ...
      inner_yard:
        coordinates: ...
```

### 限定快照到特定区

```yaml
cameras:
  您的摄像头名称:
    snapshots:
      required_zones:
        - entire_yard
    zones:
      entire_yard:
        coordinates: ...
```

### 限定区内的对象类型

有时需要限制区只对特定对象类型生效，以便更精细地控制警报、检测和快照的保存。以下示例将限制一个区只对人有效，另一个区只对车辆有效。

```yaml
cameras:
  您的摄像头名称:
    zones:
      entire_yard:
        coordinates: ... (您希望检测人的区域)
        objects:
          - person
      front_yard_street:
        coordinates: ... (仅街道区域)
        objects:
          - car
```

只有车辆对象能触发`front_yard_street`区，只有人能触发`entire_yard`区。系统会追踪进入院子任何位置的人，以及进入街道区域的车辆。

### 区内滞留检测

当需要检测对象在区内异常滞留时，可以配置最小滞留时间阈值（单位：秒）：

:::note

当使用滞留检测区域时，系统会持续追踪物体直到它离开该区域。这类区域仅适用于那些通常不会发生物体滞留的监控场景。

:::

```yaml
cameras:
  您的摄像头名称:
    zones:
      sidewalk:
        loitering_time: 4 
        objects:
          - person
```

### 区进入延迟

为防止边界框判断误差导致误报，可以设置对象必须连续多帧位于区内才视为有效进入：

```yaml
cameras:
  您的摄像头名称:
    zones:
      front_yard:
        inertia: 3
        objects:
          - person
```

对于需要快速响应的场景（如车辆驶入车道），可将延迟设为1：

```yaml
cameras:
  您的摄像头名称:
    zones:
      driveway_entrance:
        inertia: 1
        objects:
          - car
```

### 速度估算

Frigate可以估算对象在区内的移动速度。此功能需要将区定义为4个点，并测量实际距离。最适合用于监测道路上车辆的速度。

![地面平面4点区](/img/ground-plane.jpg)

速度估算需要对象被追踪足够多帧才能计算，因此区应远离对象进出位置。_区不应占据整个画面_。对象速度会在其位于区内时持续计算并存入数据库。

配置中需通过`distances`字段指定各点间的实际距离：

```yaml
cameras:
  您的摄像头名称:
    zones:
      street:
        coordinates: 0.033,0.306,0.324,0.138,0.439,0.185,0.042,0.428
        distances: 10,12,11,13.5 # 单位米或英尺
```

距离单位由`ui`配置决定：

```yaml
ui:
  # 可选"metric"(公制)或"imperial"(英制)，默认为公制
  unit_system: metric
```

估算速度会显示在调试视图和MQTT事件中，详见[MQTT文档](/integrations/mqtt.md#frigateevents)。

#### 最佳实践与注意事项

- 最适合直线道路场景，转弯会导致估算不准
- 确保对象底部中心点直线穿过区且不被遮挡
- 可适当降低`inertia`值提高响应速度
- 实际测量越精确，估算越准确（但需注意透视失真影响）
- 离开区后速度数据可能不准确
- **仅为估算值**，不适用于执法用途

### 速度阈值

可设置区的最小速度要求，只有达到该速度的对象才会被视为进入区：

```yaml
cameras:
  您的摄像头名称:
    zones:
      sidewalk:
        coordinates: ...
        distances: ...
        inertia: 1
        speed_threshold: 20 # 单位取决于unit_system设置
```