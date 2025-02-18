---
id: notifications
title: Notifications
---

# Notifications

Frigate offers native notifications using the [WebPush Protocol](https://web.dev/articles/push-notifications-web-push-protocol) which uses the [VAPID spec](https://tools.ietf.org/html/draft-thomson-webpush-vapid) to deliver notifications to web apps using encryption.

## Setting up Notifications

In order to use notifications the following requirements must be met:

- Frigate must be accessed via a secure `https` connection ([see the authorization docs](/configuration/authentication)).
- A supported browser must be used. Currently Chrome, Firefox, and Safari are known to be supported.
- In order for notifications to be usable externally, Frigate must be accessible externally.

### Configuration

To configure notifications, go to the Frigate WebUI -> Settings -> Notifications and enable, then fill out the fields and save.

Optionally, you can change the default cooldown period for notifications through the `cooldown` parameter in your config file. This parameter can also be overridden at the camera level.

Notifications will be prevented if either:

- The global cooldown period hasn't elapsed since any camera's last notification
- The camera-specific cooldown period hasn't elapsed for the specific camera

```yaml
notifications:
  enabled: True
  email: "johndoe@gmail.com"
  cooldown: 10 # wait 10 seconds before sending another notification from any camera
```

```yaml
cameras:
  doorbell:
    ...
    notifications:
      enabled: True
      cooldown: 30 # wait 30 seconds before sending another notification from the doorbell camera
```

### Registration

Once notifications are enabled, press the `Register for Notifications` button on all devices that you would like to receive notifications on. This will register the background worker. After this Frigate must be restarted and then notifications will begin to be sent.

## Supported Notifications

Currently notifications are only supported for review alerts. More notifications will be supported in the future.

:::note

Currently, only Chrome supports images in notifications. Safari and Firefox will only show a title and message in the notification.

:::

## Reduce Notification Latency

Different platforms handle notifications differently, some settings changes may be required to get optimal notification delivery.

### Android

Most Android phones have battery optimization settings. To get reliable Notification delivery the browser (Chrome, Firefox) should have battery optimizations disabled. If Frigate is running as a PWA then the Frigate app should have battery optimizations disabled as well.
