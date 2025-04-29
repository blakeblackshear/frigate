---
id: metrics
title: 监控指标
---

# 监控指标

Frigate 在 `/api/metrics` 端点提供 Prometheus 格式的监控指标，可用于监测 Frigate 实例的性能和运行状态。

## 可用指标

### 系统指标
- `frigate_cpu_usage_percent{pid="", name="", process="", type="", cmdline=""}` - 进程CPU使用率百分比
- `frigate_mem_usage_percent{pid="", name="", process="", type="", cmdline=""}` - 进程内存使用率百分比  
- `frigate_gpu_usage_percent{gpu_name=""}` - GPU利用率百分比
- `frigate_gpu_mem_usage_percent{gpu_name=""}` - GPU显存使用率百分比

### 摄像头指标
- `frigate_camera_fps{camera_name=""}` - 摄像头帧率
- `frigate_detection_fps{camera_name=""}` - 每秒检测次数
- `frigate_process_fps{camera_name=""}` - 每秒处理帧数  
- `frigate_skipped_fps{camera_name=""}` - 每秒跳过的帧数
- `frigate_detection_enabled{camera_name=""}` - 摄像头检测功能启用状态
- `frigate_audio_dBFS{camera_name=""}` - 音频dBFS值
- `frigate_audio_rms{camera_name=""}` - 音频RMS值

### 检测器指标
- `frigate_detector_inference_speed_seconds{name=""}` - 目标检测耗时(秒)
- `frigate_detection_start{name=""}` - 检测器启动时间(Unix时间戳)

### 存储指标  
- `frigate_storage_free_bytes{storage=""}` - 存储剩余空间(字节)
- `frigate_storage_total_bytes{storage=""}` - 存储总容量(字节)
- `frigate_storage_used_bytes{storage=""}` - 存储已用空间(字节)  
- `frigate_storage_mount_type{mount_type="", storage=""}` - 存储挂载类型信息

### 服务指标
- `frigate_service_uptime_seconds` - 服务运行时间(秒)
- `frigate_service_last_updated_timestamp` - 指标更新时间(Unix时间戳)  
- `frigate_device_temperature{device=""}` - 设备温度

### 事件指标
- `frigate_camera_events{camera="", label=""}` - 自指标收集器启动以来的摄像头事件计数

## Prometheus配置

在Prometheus中添加以下配置来收集Frigate指标：

```yaml
scrape_configs:
  - job_name: 'frigate'
    metrics_path: '/api/metrics'
    static_configs:
      - targets: ['frigate:5000']
    scrape_interval: 15s
```

## 查询示例

以下是几个实用的PromQL查询示例：

```promql
# 所有进程的平均CPU使用率
avg(frigate_cpu_usage_percent)

# GPU显存总使用率  
sum(frigate_gpu_mem_usage_percent)

# 指定摄像头的检测帧率(5分钟滑动窗口)
rate(frigate_detection_fps{camera_name="前门摄像头"}[5m])

# 存储空间使用百分比
(frigate_storage_used_bytes / frigate_storage_total_bytes) * 100

# 过去1小时各摄像头的事件计数
increase(frigate_camera_events[1h])
```

## Grafana仪表板

您可以使用这些指标创建Grafana仪表板来监控Frigate实例，建议监控以下内容：

- CPU、内存和GPU使用率趋势
- 摄像头帧率和检测频率  
- 存储空间使用情况和趋势
- 各摄像头事件计数
- 系统温度监控

我们将在后续更新中提供示例Grafana仪表板的JSON配置。

## 指标类型

Frigate提供的指标采用以下Prometheus指标类型：

- **计数器(Counter)**：只增不减的累计值(如`frigate_camera_events`)
- **仪表盘(Gauge)**：可升降的瞬时值(如`frigate_cpu_usage_percent`)  
- **信息(Info)**：用于元数据的键值对(如`frigate_storage_mount_type`)

有关Prometheus指标类型的更多信息，请参阅[Prometheus官方文档](https://prometheus.io/docs/concepts/metric_types/)。