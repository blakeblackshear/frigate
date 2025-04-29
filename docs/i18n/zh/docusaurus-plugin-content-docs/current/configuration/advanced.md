---
id: advanced
title: 高级配置选项
sidebar_label: 高级选项
---

### 日志配置

#### Frigate日志设置

可调整日志级别用于故障排查。

```yaml
logger:
  # 可选：默认日志级别（默认如下）
  default: info
  # 可选：按模块设置日志级别
  logs:
    frigate.mqtt: error
```

可用日志级别：`debug`, `info`, `warning`, `error`, `critical`

可配置模块示例：
- `frigate.app`
- `frigate.mqtt` 
- `frigate.object_detection`
- `detector.<检测器名称>`
- `watchdog.<摄像头名称>`
- `ffmpeg.<摄像头名称>.<角色>` 注意：所有FFmpeg日志均以`error`级别记录

#### Go2RTC日志设置

参考[go2rtc文档](https://github.com/AlexxIT/go2rtc?tab=readme-ov-file#module-log)配置日志

```yaml
go2rtc:
  streams:
    # ...
  log:
    exec: trace
```

### 环境变量

此配置项适用于无法直接修改容器环境的情况（如Home Assistant OS）。

示例：
```yaml
environment_vars:
  变量名: 变量值
```

### 数据库配置

追踪对象和录像信息存储在`/config/frigate.db`的SQLite数据库中。若删除该数据库，录像文件将变为孤立文件需手动清理，且不会显示在Home Assistant的媒体浏览器中。

若使用网络存储（SMB/NFS等），启动时可能出现`database is locked`错误。可自定义数据库路径：

```yaml
database:
  path: /自定义路径/frigate.db
```

### 模型配置

使用自定义模型时需指定宽高尺寸。

自定义模型可能需要不同的输入张量格式。支持RGB、BGR或YUV色彩空间转换。输入张量形状参数需与模型要求匹配。

| 张量维度 | 描述         |
|---------|-------------|
| N       | 批量大小     |
| H       | 模型高度     |
| W       | 模型宽度     |
| C       | 色彩通道数   |

| 可用输入张量形状 |
|----------------|
| "nhwc"         |
| "nchw"         |

```yaml
model:
  path: /模型路径
  width: 320
  height: 320  
  input_tensor: "nhwc"
  input_pixel_format: "bgr"
```

#### 标签映射

:::warning
自定义标签映射后需同步调整[警报标签](/configuration/review.md#限制警报的标签类型)配置
:::

可自定义标签映射，常见场景是合并易混淆的物体类型（如car/truck）。默认已将truck重命名为car。

```yaml
model:
  labelmap:
    2: vehicle
    3: vehicle
    5: vehicle
    7: vehicle
    15: animal  
    16: animal
    17: animal
```

:::warning
部分标签有特殊处理逻辑：
- `person`关联`face`和`amazon`
- `car`关联`license_plate`, `ups`, `fedex`, `amazon`
:::

## 网络配置

可通过绑定挂载nginx.conf文件修改内部网络配置：

```yaml
services:
  frigate:
    volumes:
      - /自定义路径/nginx.conf:/usr/local/nginx/conf/nginx.conf
```

### 启用IPv6

默认禁用IPv6，需修改listen.gotmpl文件：

原始配置：
```
listen 8971;
```

修改为：
``` 
listen [::]:8971 ipv6only=off;
```

## 基础路径

默认运行在根路径(`/`)，反向代理场景可能需要自定义路径前缀(如`/frigate`)。

### 通过HTTP头设置

推荐方式是在反向代理中设置`X-Ingress-Path`头：

Nginx示例：
```
location /frigate {
    proxy_set_header X-Ingress-Path /frigate;
    proxy_pass http://frigate_backend;
}
```

### 通过环境变量设置

```yaml
services:
  frigate:
    environment:
      - FRIGATE_BASE_PATH=/frigate
```

## 自定义依赖

### 自定义FFmpeg

将静态编译的`ffmpeg`和`ffprobe`放入`/config/custom-ffmpeg/bin`：

1. 下载FFmpeg并解压到`/config/custom-ffmpeg`
2. 更新配置：
```yaml
ffmpeg:
  path: /config/custom-ffmpeg
```
3. 重启Frigate

### 自定义go2rtc版本

1. 下载go2rtc到`/config`目录
2. 重命名为`go2rtc`
3. 添加执行权限
4. 重启Frigate

## 配置文件验证

更新配置时可通过以下方式验证：

### 通过API验证

```bash
curl -X POST http://frigate_host:5000/api/config/save -d @config.json
```

或使用yq转换yaml：
```bash
yq r -j config.yml | curl -X POST http://frigate_host:5000/api/config/save -d @-
```

### 命令行验证

```bash
docker run -v $(pwd)/config.yml:/config/config.yml \
  --entrypoint python3 \
  ghcr.io/blakeblackshear/frigate:stable \
  -u -m frigate --validate-config
```