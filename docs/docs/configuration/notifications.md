---
id: notifications
title: Notifications
---

import ConfigTabs from "@site/src/components/ConfigTabs";
import TabItem from "@theme/TabItem";
import NavPath from "@site/src/components/NavPath";

# Notifications

Frigate offers native notifications using the [WebPush Protocol](https://web.dev/articles/push-notifications-web-push-protocol) which uses the [VAPID spec](https://tools.ietf.org/html/draft-thomson-webpush-vapid) to deliver notifications to web apps using encryption.

## Setting up Notifications

In order to use notifications the following requirements must be met:

- Frigate must be accessed via a secure `https` connection ([see the authorization docs](/configuration/authentication)).
- A supported browser must be used. Currently Chrome, Firefox, and Safari are known to be supported.
- In order for notifications to be usable externally, Frigate must be accessible externally.
- For iOS devices, some users have also indicated that the Notifications switch needs to be enabled in iOS Settings --> Apps --> Safari --> Advanced --> Features.

### Configuration

Enable notifications and fill out the required fields.

Optionally, change the default cooldown period for notifications. The cooldown can also be overridden at the camera level.

Notifications will be prevented if either:

- The global cooldown period hasn't elapsed since any camera's last notification
- The camera-specific cooldown period hasn't elapsed for the specific camera

#### Global notifications

<ConfigTabs>
<TabItem value="ui">

1. Navigate to <NavPath path="Settings > Notifications > Notifications" />.
   - Set **Enable notifications** to on
   - Set **Notification email** to your email address
   - Set **Cooldown period** to the desired number of seconds to wait before sending another notification from any camera (e.g. `10`)

</TabItem>
<TabItem value="yaml">

```yaml
notifications:
  enabled: True
  email: "johndoe@gmail.com"
  cooldown: 10 # wait 10 seconds before sending another notification from any camera
```

</TabItem>
</ConfigTabs>

#### Per-camera notifications

<ConfigTabs>
<TabItem value="ui">

1. Navigate to <NavPath path="Settings > Camera configuration > Notifications" /> and select the desired camera.
   - Set **Enabled** to on
   - Set **Cooldown** to the desired number of seconds to wait before sending another notification from this camera (e.g. `30`)

</TabItem>
<TabItem value="yaml">

```yaml
cameras:
  doorbell:
    ...
    notifications:
      enabled: True
      cooldown: 30 # wait 30 seconds before sending another notification from the doorbell camera
```

</TabItem>
</ConfigTabs>

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
