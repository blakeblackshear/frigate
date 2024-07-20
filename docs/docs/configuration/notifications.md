---
id: notifications
title: Notifications
---

# Notifications

Frigate offers native notifications using the [WebPush Protocol](https://web.dev/articles/push-notifications-web-push-protocol) which uses the [VAPID spec](https://tools.ietf.org/html/draft-thomson-webpush-vapid) to deliver notifications to web apps using encryption.

## Configuration

To configure notifications, go to the Frigate WebUI -> Settings -> Notifications and enable, then fill out the fields and save.

:::note

Currently, notifications are only supported in Chrome and Firefox browsers.

:::

## Registration

Once notifications are enabled, press the `Register for Notifications` button on all devices that you would like to receive notifications on. This will register the background worker. After this Frigate must be restarted and then notifications will begin to be sent.