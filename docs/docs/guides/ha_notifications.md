---
id: ha_notifications
title: Home Assistant Notifications
---

The best way to get started with notifications for Frigate is to use the [Blueprint](https://community.home-assistant.io/t/frigate-mobile-app-notifications/311091). You can use the yaml generated from the Blueprint as a starting point and customize from there.

It is generally recommended to trigger notifications based on the `frigate/events` mqtt topic. This provides the event_id needed to fetch [thumbnails/snapshots/clips](/integrations/home-assistant#notification-api) and other useful information to customize when and where you want to receive alerts. The data is published in the form of a change feed, which means you can reference the "previous state" of the object in the `before` section and the "current state" of the object in the `after` section. You can see an example [here](/integrations/mqtt#frigateevents).

Here is a simple example of a notification automation of events which will update the existing notification for each change. This means the image you see in the notification will update as frigate finds a "better" image.

```yaml
automation:
  - alias: Notify of events
    trigger:
      platform: mqtt
      topic: frigate/events
    action:
      - service: notify.mobile_app_pixel_3
        data_template:
          message: 'A {{trigger.payload_json["after"]["label"]}} was detected.'
          data:
            image: 'https://your.public.hass.address.com/api/frigate/notifications/{{trigger.payload_json["after"]["id"]}}/thumbnail.jpg?format=android'
            tag: '{{trigger.payload_json["after"]["id"]}}'
            when: '{{trigger.payload_json["after"]["start_time"]|int}}'
```

## Conditions

Conditions with the `before` and `after` values allow a high degree of customization for automations.

When a person enters a zone named yard

```yaml
condition:
  - "{{ trigger.payload_json['after']['label'] == 'person' }}"
  - "{{ 'yard' in trigger.payload_json['after']['entered_zones'] }}"
```

When a person leaves a zone named yard

```yaml
condition:
  - "{{ trigger.payload_json['after']['label'] == 'person' }}"
  - "{{ 'yard' in trigger.payload_json['before']['current_zones'] }}"
  - "{{ not 'yard' in trigger.payload_json['after']['current_zones'] }}"
```

Notify for dogs in the front with a high top score

```yaml
condition:
  - "{{ trigger.payload_json['after']['label'] == 'dog' }}"
  - "{{ trigger.payload_json['after']['camera'] == 'front' }}"
  - "{{ trigger.payload_json['after']['top_score'] > 0.98 }}"
```
