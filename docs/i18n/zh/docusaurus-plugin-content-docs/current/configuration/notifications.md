---
id: notifications
title: 通知功能
---

# 通知功能

:::warning

注意，受限于Google相关服务在中国大陆地区被屏蔽，该功能可能**无法在中国大陆地区使用**。

如有手机通知的需求，建议使用MQTT配合Home Assistant 通知功能。

:::

Frigate 采用 [WebPush 协议](https://web.dev/articles/push-notifications-web-push-protocol)实现原生通知功能，该协议使用 [VAPID 规范](https://tools.ietf.org/html/draft-thomson-webpush-vapid)通过加密方式向网页应用推送通知。

## 设置通知功能

使用通知功能需满足以下条件：

- 必须通过安全的 `https` 连接访问 Frigate（参见[认证文档](/configuration/authentication)）
- 需使用支持的浏览器（目前已知 Chrome、Firefox 和 Safari 支持）
- 如需外部接收通知，Frigate 必须可从外部访问
- iOS 设备需在「设置 > Safari > 高级 > 实验性功能」中启用通知权限

### 配置方法

1. 访问 Frigate 网页界面：设置 > 通知
2. 启用通知功能并填写相关字段
3. 保存配置

可通过配置文件修改默认通知冷却时间（单位：秒），该参数也可按摄像头单独设置。

以下情况将阻止通知发送：
- 全局冷却时间内收到过任意摄像头的通知
- 特定摄像头的冷却时间未结束

```yaml
notifications:
  enabled: True
  email: "johndoe@gmail.com"
  cooldown: 10 # 全局冷却时间10秒
```

```yaml
cameras:
  doorbell:
    ...
    notifications:
      enabled: True
      cooldown: 30 # 该摄像头单独设置30秒冷却
```

### 设备注册

启用通知后，需在所有接收设备上点击「注册通知」按钮，注册后台工作进程。完成后重启 Frigate 即可开始接收通知。

## 支持的通知类型

当前仅支持回放警报通知，更多类型将在未来版本中添加。

:::note
目前仅 Chrome 支持带图片的通知，Safari 和 Firefox 仅显示标题和文字内容。
:::

## 降低通知延迟

不同平台处理通知的方式各异，可能需要调整设置以获得最佳效果。

### Android 设备

多数安卓手机具有电池优化设置。为确保可靠接收通知，建议：
1. 为浏览器（Chrome/Firefox）禁用电池优化
2. 若以 PWA 形式运行 Frigate，需同时禁用 Frigate 应用的电池优化