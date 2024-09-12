---
id: ha_notifications
title: Home Assistant notifications
---

The best way to get started with notifications for Frigate is to use the [Blueprint](https://community.home-assistant.io/t/frigate-mobile-app-notifications-2-0/559732). You can use the yaml generated from the Blueprint as a starting point and customize from there.

It is generally recommended to trigger notifications based on the `frigate/reviews` mqtt topic. This provides the event_id(s) needed to fetch [thumbnails/snapshots/clips](../integrations/home-assistant.md#notification-api) and other useful information to customize when and where you want to receive alerts. The data is published in the form of a change feed, which means you can reference the "previous state" of the object in the `before` section and the "current state" of the object in the `after` section. You can see an example [here](../integrations/mqtt.md#frigateevents).

Here is a simple example of a notification automation of tracked objects which will update the existing notification for each change. This means the image you see in the notification will update as Frigate finds a "better" image.

```yaml
automation:
  - alias: Notify of tracked object
    trigger:
      platform: mqtt
      topic: frigate/events
    action:
      - service: notify.mobile_app_pixel_3
        data:
          message: 'A {{trigger.payload_json["after"]["label"]}} was detected.'
          data:
            image: 'https://your.public.hass.address.com/api/frigate/notifications/{{trigger.payload_json["after"]["id"]}}/thumbnail.jpg?format=android'
            tag: '{{trigger.payload_json["after"]["id"]}}'
            when: '{{trigger.payload_json["after"]["start_time"]|int}}'
```

Note that iOS devices support live previews of cameras by adding a camera entity id to the message data.

```yaml
automation:
  - alias: Security_Frigate_Notifications
    description: ""
    trigger:
      - platform: mqtt
        topic: frigate/reviews
        payload: alert
        value_template: "{{ value_json['after']['severity'] }}"
    action:
      - service: notify.mobile_app_iphone
        data:
          message: 'A {{trigger.payload_json["after"]["data"]["objects"] | sort | join(", ") | title}} was detected.'
          data:
            image: >-
              https://your.public.hass.address.com/api/frigate/notifications/{{trigger.payload_json["after"]["data"]["detections"][0]}}/thumbnail.jpg
            tag: '{{trigger.payload_json["after"]["id"]}}'
            when: '{{trigger.payload_json["after"]["start_time"]|int}}'
            entity_id: camera.{{trigger.payload_json["after"]["camera"] | replace("-","_") | lower}}
    mode: single
```
