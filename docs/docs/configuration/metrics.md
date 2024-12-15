---
id: metrics
title: Metrics
---

# Metrics

Frigate exposes Prometheus metrics at the `/metrics` endpoint that can be used to monitor the performance and health of your Frigate instance.

## Available Metrics

### System Metrics
- `frigate_cpu_usage_percent{pid="", name="", process="", type="", cmdline=""}` - Process CPU usage percentage
- `frigate_mem_usage_percent{pid="", name="", process="", type="", cmdline=""}` - Process memory usage percentage
- `frigate_gpu_usage_percent{gpu_name=""}` - GPU utilization percentage
- `frigate_gpu_mem_usage_percent{gpu_name=""}` - GPU memory usage percentage

### Camera Metrics
- `frigate_camera_fps{camera_name=""}` - Frames per second being consumed from your camera
- `frigate_detection_fps{camera_name=""}` - Number of times detection is run per second
- `frigate_process_fps{camera_name=""}` - Frames per second being processed
- `frigate_skipped_fps{camera_name=""}` - Frames per second skipped for processing
- `frigate_detection_enabled{camera_name=""}` - Detection enabled status for camera
- `frigate_audio_dBFS{camera_name=""}` - Audio dBFS for camera
- `frigate_audio_rms{camera_name=""}` - Audio RMS for camera

### Detector Metrics
- `frigate_detector_inference_speed_seconds{name=""}` - Time spent running object detection in seconds
- `frigate_detection_start{name=""}` - Detector start time (unix timestamp)

### Storage Metrics
- `frigate_storage_free_bytes{storage=""}` - Storage free bytes
- `frigate_storage_total_bytes{storage=""}` - Storage total bytes
- `frigate_storage_used_bytes{storage=""}` - Storage used bytes
- `frigate_storage_mount_type{mount_type="", storage=""}` - Storage mount type info

### Service Metrics
- `frigate_service_uptime_seconds` - Uptime in seconds
- `frigate_service_last_updated_timestamp` - Stats recorded time (unix timestamp)
- `frigate_device_temperature{device=""}` - Device Temperature

### Event Metrics
- `frigate_camera_events{camera="", label=""}` - Count of camera events since exporter started

## Configuring Prometheus

To scrape metrics from Frigate, add the following to your Prometheus configuration:

```yaml
scrape_configs:
  - job_name: 'frigate'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['frigate:5000']
    scrape_interval: 15s
```

## Example Queries

Here are some example PromQL queries that might be useful:

```promql
# Average CPU usage across all processes
avg(frigate_cpu_usage_percent)

# Total GPU memory usage
sum(frigate_gpu_mem_usage_percent)

# Detection FPS by camera
rate(frigate_detection_fps{camera_name="front_door"}[5m])

# Storage usage percentage
(frigate_storage_used_bytes / frigate_storage_total_bytes) * 100

# Event count by camera in last hour
increase(frigate_camera_events[1h])
```

## Grafana Dashboard

You can use these metrics to create Grafana dashboards to monitor your Frigate instance. Here's an example of metrics you might want to track:

- CPU, Memory and GPU usage over time
- Camera FPS and detection rates
- Storage usage and trends
- Event counts by camera
- System temperatures

A sample Grafana dashboard JSON will be provided in a future update.

## Metric Types

The metrics exposed by Frigate use the following Prometheus metric types:

- **Counter**: Cumulative values that only increase (e.g., `frigate_camera_events`)
- **Gauge**: Values that can go up and down (e.g., `frigate_cpu_usage_percent`)
- **Info**: Key-value pairs for metadata (e.g., `frigate_storage_mount_type`)

For more information about Prometheus metric types, see the [Prometheus documentation](https://prometheus.io/docs/concepts/metric_types/).