---
id: home-assistant
title: Integration with Home Assistant
sidebar_label: Home Assistant
---

The best way to integrate with Home Assistant is to use the [official integration](https://github.com/blakeblackshear/frigate-hass-integration). When configuring the integration, you will be asked for the `Host` of your frigate instance. This value should be the url you use to access Frigate in the browser and will look like `http://<host>:5000/`. If you are using HassOS with the addon, the host should be `http://ccab4aaf-frigate:5000` (or `http://ccab4aaf-frigate-beta:5000` if your are using the beta version of the addon). Home Assistant needs access to port 5000 (api) and 1935 (rtmp) for all features. The integration will setup the following entities within Home Assistant:

## Sensors:

- Stats to monitor frigate performance
- Object counts for all zones and cameras

## Cameras:

- Cameras for image of the last detected object for each camera
- Camera entities with stream support (requires RTMP)

## Media Browser:

- Rich UI with thumbnails for browsing event clips
- Rich UI for browsing 24/7 recordings by month, day, camera, time

## API:

- Notification API with public facing endpoints for images in notifications

### Notifications

Frigate publishes event information in the form of a change feed via MQTT. This allows lots of customization for notifications to meet your needs. Event changes are published with `before` and `after` information as shown [here](#frigateevents).
Note that some people may not want to expose frigate to the web, so you can leverage the HA API that frigate custom_integration ties into (which is exposed to the web, and thus can be used for mobile notifications etc):

To load an image taken by frigate from Home Assistants API see below:

```
https://HA_URL/api/frigate/notifications/<event-id>/thumbnail.jpg
```

To load a video clip taken by frigate from Home Assistants API :

```
https://HA_URL/api/frigate/notifications/<event-id>/<camera>/clip.mp4
```

:::caution
The clip video is not immediately available after the `end` event arrives.
:::

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
```

```yaml
automation:
  - alias: When a person enters a zone named yard
    trigger:
      platform: mqtt
      topic: frigate/events
    condition:
      - "{{ trigger.payload_json['after']['label'] == 'person' }}"
      - "{{ 'yard' in trigger.payload_json['after']['entered_zones'] }}"
    action:
      - service: notify.mobile_app_pixel_3
        data_template:
          message: "A {{trigger.payload_json['after']['label']}} has entered the yard."
          data:
            image: "https://url.com/api/frigate/notifications/{{trigger.payload_json['after']['id']}}/thumbnail.jpg"
            tag: "{{trigger.payload_json['after']['id']}}"
```

```yaml
- alias: When a person leaves a zone named yard
  trigger:
    platform: mqtt
    topic: frigate/events
  condition:
    - "{{ trigger.payload_json['after']['label'] == 'person' }}"
    - "{{ 'yard' in trigger.payload_json['before']['current_zones'] }}"
    - "{{ not 'yard' in trigger.payload_json['after']['current_zones'] }}"
  action:
    - service: notify.mobile_app_pixel_3
      data_template:
        message: "A {{trigger.payload_json['after']['label']}} has left the yard."
        data:
          image: "https://url.com/api/frigate/notifications/{{trigger.payload_json['after']['id']}}/thumbnail.jpg"
          tag: "{{trigger.payload_json['after']['id']}}"
```

```yaml
- alias: Notify for dogs in the front with a high top score
  trigger:
    platform: mqtt
    topic: frigate/events
  condition:
    - "{{ trigger.payload_json['after']['label'] == 'dog' }}"
    - "{{ trigger.payload_json['after']['camera'] == 'front' }}"
    - "{{ trigger.payload_json['after']['top_score'] > 0.98 }}"
  action:
    - service: notify.mobile_app_pixel_3
      data_template:
        message: "High confidence dog detection."
        data:
          image: "https://url.com/api/frigate/notifications/{{trigger.payload_json['after']['id']}}/thumbnail.jpg"
          tag: "{{trigger.payload_json['after']['id']}}"
```

```yaml
# Tested on iOS
- alias: Play the clip video in the notification dropdown when the last event arrives
  trigger:
    platform: mqtt
    topic: frigate/events
  condition:
    - "{{ trigger.payload_json['after']['label'] == 'person' }}"
    - "{{ 'yard' in trigger.payload_json['before']['current_zones'] }}"
    - "{{ trigger.payload_json['type'] == 'end'}}"
  action:
    # A delay is needed here because frigate needs some time to store the clip video,
    # otherwise HA companion app will show 404 in the notification.
    - delay: "00:00:15"
    - service: notify.mobile_app_jojo
      data_template:
        title: "Motion detected"
        message: "A {{trigger.payload_json['after']['label']}} has entered the yard."
        data:
          video: "https://HA_URL/api/frigate/notifications/{{trigger.payload_json['after']['id']}}/{{trigger.payload_json['after']['camera']}}/clip.mp4"
          tag: "{{trigger.payload_json['after']['id']}}"
```

If you are using telegram, you can fetch the image directly from Frigate:

```yaml
automation:
  - alias: Notify of events
    trigger:
      platform: mqtt
      topic: frigate/events
    action:
      - service: notify.telegram_full
        data_template:
          message: 'A {{trigger.payload_json["after"]["label"]}} was detected.'
          data:
            photo:
              # this url should work for addon users
              - url: 'http://ccab4aaf-frigate:5000/api/events/{{trigger.payload_json["after"]["id"]}}/thumbnail.jpg'
                caption: 'A {{trigger.payload_json["after"]["label"]}} was detected on {{ trigger.payload_json["after"]["camera"] }} camera'
```
