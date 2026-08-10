---
id: notifications
title: Notifications
---

import ConfigTabs from "@site/src/components/ConfigTabs";
import TabItem from "@theme/TabItem";
import NavPath from "@site/src/components/NavPath";
import FaqItem from "@site/src/components/FaqItem";

# Notifications

Frigate offers native notifications using the [WebPush Protocol](https://web.dev/articles/push-notifications-web-push-protocol) which uses the [VAPID spec](https://tools.ietf.org/html/draft-thomson-webpush-vapid) to deliver notifications to web apps using encryption.

:::info

Push notifications require internet access from the Frigate server to the browser vendor's push service (e.g., Google FCM, Mozilla autopush). See [Network Requirements](/frigate/network_requirements#push-notifications) for details.

:::

## Setting up Notifications

In order to use notifications the following requirements must be met:

- Frigate must be accessed via a secure `https` connection while signed in as a Frigate user ([see the authorization docs](/configuration/authentication)).
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
   - Set **Email** to your email address
   - Enable notifications for the desired cameras

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
   - Set **Enable notifications** to on
   - Set **Cooldown period** to the desired number of seconds to wait before sending another notification from this camera (e.g. `30`)

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

Once notifications are enabled, press the `Register This Device` button on all devices that you would like to receive notifications on. This will register the background worker. After this Frigate must be restarted and then notifications will begin to be sent.

:::warning

Each registration is attached to the Frigate user account you are signed in as, so you must register over a secure connection to the authenticated port (`8971`). Reverse proxies and tunnels should point at port `8971`.

:::

## Supported Notifications

Currently notifications are only supported for review alerts. More notifications will be supported in the future.

:::note

Currently, only Chrome supports images in notifications. Safari and Firefox will only show a title and message in the notification.

:::

## Reduce Notification Latency

Different platforms handle notifications differently, some settings changes may be required to get optimal notification delivery.

### Android

Most Android phones have battery optimization settings. To get reliable Notification delivery the browser (Chrome, Firefox) should have battery optimizations disabled. If Frigate is running as a PWA then the Frigate app should have battery optimizations disabled as well.

## Notifications FAQ

<FaqItem id="how-do-i-debug-notifications-issues" question="How do I debug notifications issues?">

Push notifications involve Frigate, your browser, and your browser vendor's push service, so it helps to work from the server outward.

1. Enable debug logs for the push client by adding `frigate.comms.webpush: debug` to your `logger` configuration. Restart Frigate after this change.

   ```yaml
   logger:
     default: info
     logs:
       # highlight-next-line
       frigate.comms.webpush: debug
   ```

   These logs show exactly where a notification stopped, including:
   - `Email must be provided for push notifications to be sent` means the global `email` field is empty and nothing will ever be sent.
   - `Sending test notification` and `Sending push notification for <camera>, review ID <id>` mean Frigate handed the message off to the push service.
   - `Skipping notification for <camera> - in global cooldown period` (or `camera-specific cooldown period`) means your [cooldown](#configuration) values suppressed it.
   - `Notifications for <camera> are currently suspended` means notifications were suspended from <NavPath path="Settings > Notifications" /> or MQTT.
   - `Notification endpoint expired for <user>, received 410` means that device's subscription is no longer valid and it must be re-registered.
   - `Failed to send notification to <user> :: <status>` means the push service rejected the message. A `401` or `403` usually points at a VAPID or `email` problem, and a `5xx` is a problem on the push service's end.
   - If you see no messages at all when an alert occurs, the notification was never queued. Confirm an actual **alert** was created (notifications are not sent for detections), and that notifications are enabled both globally and for that camera.

2. Verify the basics that most reports come down to:
   - Frigate must be reached over `https` with a certificate your device trusts. Browsers silently refuse to register a service worker otherwise, and a self-signed certificate that is not installed as trusted on the device will fail.
   - On iOS, notifications only work when Frigate has been installed to the Home Screen via **Share > Add to Home Screen** and opened from that icon. Safari and Chrome tabs cannot receive web push on iOS.
   - Each device must be registered individually, and Frigate must be restarted after registering before anything can be sent, including test notifications.
   - The Frigate server needs outbound internet access to the browser vendor's push service. See [Network Requirements](/frigate/network_requirements#push-notifications).

3. Test from the UI. Use the `Send a test notification` button in <NavPath path="Settings > Notifications" />. If the log shows `Sending test notification` but nothing arrives on the device, the problem is between the push service and your device rather than in Frigate.

4. Check the browser side on the device that is not receiving notifications:
   - Confirm the site's notification permission is set to **Allow** in your browser or OS settings, and that a focus/do not disturb mode is not hiding them.
   - In desktop browsers, open Developer Tools > Application > Service Workers and confirm `notifications-worker.js` is registered and activated. Unregistering it and registering the device again will rebuild a broken subscription.
   - Check the browser console and your reverse proxy logs for failures loading `/notifications-worker.js` or errors on `/api/notifications/register`.

</FaqItem>

<FaqItem id="why-did-notifications-stop-arriving-after-working-for-a-while" question="Why did notifications stop arriving after working for a while?">

Push subscriptions are issued by the browser vendor and can be revoked, most often after a browser update, after clearing site data, or when a device has been offline for an extended period. When this happens the device still appears registered in Frigate, but the push service rejects the message. The debug logs will show `Notification endpoint expired` with a `404` or `410` status.

Unregister and re-register the affected device from <NavPath path="Settings > Notifications" />, then restart Frigate.

</FaqItem>

<FaqItem id="why-am-i-not-getting-notifications-for-one-specific-camera" question="Why am I not getting notifications for one specific camera?">

Work through these in order:

- Notifications are only sent for **alerts**. If the camera is producing detections instead, adjust the camera's `review > alerts > labels` so the objects you care about are classified as alerts.
- Confirm notifications are enabled for that camera in <NavPath path="Settings > Camera configuration > Notifications" />.
- Check the camera's `cooldown` value, and remember that the global cooldown applies across all cameras. A busy camera can consume the global cooldown and suppress a quieter one.
- If [authentication](/configuration/authentication) is enabled with roles, users only receive notifications for the cameras their role grants access to.

</FaqItem>
