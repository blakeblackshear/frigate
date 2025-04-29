---
id: home-assistant
title: Home Assistant集成
---

与Home Assistant集成的最佳方式是使用[官方集成](https://github.com/blakeblackshear/frigate-hass-integration)。

## 安装

### 准备工作

Frigate集成需要先安装并手动配置`mqtt`集成。

更多详细信息请参见[MQTT集成文档](https://www.home-assistant.io/integrations/mqtt/)。

此外，必须在Frigate配置文件中启用MQTT，并且Frigate必须连接到与Home Assistant相同的MQTT服务器，这样集成创建的许多实体才能正常工作。

### 集成安装

可通过HACS作为默认仓库获取。安装步骤：

- 使用[HACS](https://hacs.xyz/)安装集成：

```
Home Assistant > HACS > 点击搜索栏并输入"Frigate" > Frigate
```

- 重启Home Assistant。
- 然后添加/配置集成：

```
Home Assistant > 设置 > 设备和服务 > 添加集成 > Frigate
```

注意：你还需要在Home Assistant配置中启用[media_source](https://www.home-assistant.io/integrations/media_source/)才能显示媒体浏览器。

### （可选）Lovelace卡片安装

要安装可选的配套Lovelace卡片，请参见该卡片的[单独安装说明](https://github.com/dermotduffy/frigate-hass-card)。

## 配置

配置集成时，你需要提供Frigate实例的`URL`，可以指向内部未认证端口（`5000`）或认证端口（`8971`）。URL可能看起来像`http://<host>:5000/`。

### Docker Compose示例

如果你在同一设备上使用Docker Compose运行Home Assistant和Frigate，这里有一些示例。

#### Home Assistant使用主机网络运行

不建议在主机网络模式下运行Frigate。在此示例中，配置集成时应使用`http://172.17.0.1:5000`或`http://172.17.0.1:8971`。

```yaml
services:
  homeassistant:
    image: ghcr.io/home-assistant/home-assistant:stable
    network_mode: host
    ...

  frigate:
    image: ghcr.io/blakeblackshear/frigate:stable
    ...
    ports:
      - "172.17.0.1:5000:5000"
      ...
```

#### Home Assistant不使用主机网络运行或在单独的compose文件中

在此示例中，建议连接到认证端口，例如配置集成时使用`http://frigate:8971`。无需为Frigate容器映射端口。

```yaml
services:
  homeassistant:
    image: ghcr.io/home-assistant/home-assistant:stable
    # network_mode: host
    ...

  frigate:
    image: ghcr.io/blakeblackshear/frigate:stable
    ...
    ports:
      # - "172.17.0.1:5000:5000"
      ...
```

### Home Assistant插件

如果你使用Home Assistant插件，URL应该是以下之一，具体取决于你使用的插件变体。注意，如果你使用代理插件，不应将集成指向代理URL。只需输入从网络直接访问Frigate时使用的相同URL。

| 插件变体                   | URL                                       |
| -------------------------- | ----------------------------------------- |
| Frigate                    | `http://ccab4aaf-frigate:5000`            |
| Frigate (完全访问)         | `http://ccab4aaf-frigate-fa:5000`         |
| Frigate Beta               | `http://ccab4aaf-frigate-beta:5000`       |
| Frigate Beta (完全访问)    | `http://ccab4aaf-frigate-fa-beta:5000`    |

### Frigate在单独的机器上运行

如果你在本地网络内的单独设备上运行Frigate，Home Assistant将需要访问端口8971。

#### 本地网络

使用`http://<frigate_device_ip>:8971`作为集成的URL，以便需要认证。

```yaml
services:
  frigate:
    image: ghcr.io/blakeblackshear/frigate:stable
    ...
    ports:
      - "8971:8971"
      ...
```

#### Tailscale或其他私有网络

使用`http://<frigate_device_tailscale_ip>:5000`作为集成的URL。

```yaml
services:
  frigate:
    image: ghcr.io/blakeblackshear/frigate:stable
    ...
    ports:
      - "<tailscale_ip>:5000:5000"
      ...
```

## 选项

```
Home Assistant > 配置 > 集成 > Frigate > 选项
```

| 选项              | 描述                                                                                                                                                                                                                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RTSP URL模板      | 用于覆盖标准RTSP流URL的[jinja2](https://jinja.palletsprojects.com/)模板（例如，用于反向代理）。此选项仅对启用了[高级模式](https://www.home-assistant.io/blog/2019/07/17/release-96/#advanced-mode)的用户显示。参见下方的[RTSP流](#rtsp-stream)。                                                                                      |

## 提供的实体

| 平台            | 描述                                                                         |
| --------------- | ------------------------------------------------------------------------------- |
| `camera`        | 实时摄像头流（需要RTSP）                                                        |
| `image`         | 每个摄像头最新检测对象的图像                                                    |
| `sensor`        | 用于监控Frigate性能的状态，所有区域和摄像头的对象计数                          |
| `switch`        | 用于切换检测、录制和快照的开关实体                                              |
| `binary_sensor` | 每个摄像头/区域/对象的"运动"二进制传感器实体                                    |

## 媒体浏览器支持

该集成提供：

- 带缩略图的跟踪对象录像浏览
- 快照浏览
- 按月、日、摄像头、时间浏览录像

可以通过Home Assistant左侧菜单面板中的"媒体浏览器"访问。

## 将剪辑投射到媒体设备

该集成支持将剪辑和摄像头流投射到支持的媒体设备。

:::tip
要使剪辑可以投射到媒体设备，需要音频，可能需要[为录制启用音频](../troubleshooting/faqs.md#audio-in-recordings)。

**注意：即使你的摄像头不支持音频，也需要启用音频才能接受投射。**

:::

<a name="api"></a>

## 通知API

许多人不想将Frigate暴露给网络，因此该集成创建了一些可用于通知的公共API端点。

加载跟踪对象的缩略图：

```
https://HA_URL/api/frigate/notifications/<event-id>/thumbnail.jpg
```

加载跟踪对象的快照：

```
https://HA_URL/api/frigate/notifications/<event-id>/snapshot.jpg
```

使用Android设备加载跟踪对象的视频剪辑：

```
https://HA_URL/api/frigate/notifications/<event-id>/clip.mp4
```

使用iOS设备加载跟踪对象的视频剪辑：

```
https://HA_URL/api/frigate/notifications/<event-id>/master.m3u8
```

加载跟踪对象的预览gif：

```
https://HA_URL/api/frigate/notifications/<event-id>/event_preview.gif
```

加载核查项目的预览gif：

```
https://HA_URL/api/frigate/notifications/<review-id>/review_preview.gif
```

<a name="streams"></a>

## RTSP流

为了使实时流能够正常工作，需要在RTSP端口（默认：`8554`）上的`<frigatehost>:8554`访问它们。当查看实时摄像头时，Home Assistant将直接连接到该流媒体端口。

#### RTSP URL模板

对于高级用例，可以使用[RTSP URL模板](#options)选项更改此行为。设置后，此字符串将覆盖从上述默认行为派生的默认流地址。此选项支持[jinja2模板](https://jinja.palletsprojects.com/)，并且有来自[Frigate API](/integrations/api)的`camera`字典变量可用于模板。注意，模板中没有Home Assistant状态可用，只有来自Frigate的摄像头字典。

当Frigate位于反向代理后面，和/或当默认流端口因其他原因（例如防火墙规则）无法访问Home Assistant时，这可能很有用。

###### RTSP URL模板示例

使用不同的端口号：

```
rtsp://<frigate_host>:2000/front_door
```

在流URL中使用摄像头名称：

```
rtsp://<frigate_host>:2000/{{ name }}
```

在流URL中使用摄像头名称，先转换为小写：

```
rtsp://<frigate_host>:2000/{{ name|lower }}
```

## 多实例支持

Frigate集成无缝支持使用多个Frigate服务器。

### 多实例要求

为了使多个Frigate实例正常工作，每个服务器必须设置不同的`topic_prefix`和`client_id`参数。
有关如何设置这些参数，请参见[MQTT配置](mqtt)。

#### API URL

配置多个Frigate实例时，[API](#notification-api) URL应包含标识符，以告诉Home Assistant要引用哪个Frigate实例。使用的标识符是配置中包含的MQTT `client_id`参数，使用方式如下：

```
https://HA_URL/api/frigate/<client-id>/notifications/<event-id>/thumbnail.jpg
```

```
https://HA_URL/api/frigate/<client-id>/clips/front_door-1624599978.427826-976jaa.mp4
```

#### 默认处理

配置单个Frigate实例时，URL/标识符中不需要指定`client-id`参数 - 假定使用该单个实例。配置多个Frigate实例时，用户**必须**明确指定他们要引用哪个服务器。

## 常见问题

#### 如果我检测多个对象，如何在HomeKit中将正确的`binary_sensor`分配给摄像头？

[HomeKit集成](https://www.home-assistant.io/integrations/homekit/)随机链接Home Assistant中与摄像头设备分组的二进制传感器（运动传感器实体）之一。你可以在Home Assistant的[HomeKit配置](https://www.home-assistant.io/integrations/homekit/#linked_motion_sensor)中为每个摄像头指定`linked_motion_sensor`。

#### 我基于占用传感器设置了自动化。有时传感器打开时自动化运行了，但当我查看Frigate时找不到触发传感器的对象。这是bug吗？

不是。占用传感器的检查较少，因为它们通常用于需要尽可能低延迟的事情，如开灯。因此这些传感器有时会被误报触发。如果你想要误报过滤，应该使用`frigate/events`或`frigate/reviews`主题上的mqtt传感器。