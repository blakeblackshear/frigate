# Notification examples

Here are some examples of notifications for the HomeAssistant android companion app:
```yaml
automation:

  - alias: When a person enters a zone named yard
    trigger:
      platform: mqtt
      topic: frigate/events
    conditions: 
      - "{{ trigger.payload_json['after']['label'] == 'person' }}"
      - "{{ 'yard' in trigger.payload_json['after']['entered_zones'] }}"
    action:
      - service: notify.mobile_app_pixel_3
        data_template:
          message: "A {{trigger.payload_json['after']['label']}} has entered the yard."
          data:
            image: "https://url.com/api/frigate/notifications/{{trigger.payload_json['after']['id']}}.jpg"
            tag: "{{trigger.payload_json['after']['id']}}"

  - alias: When a person leaves a zone named yard
    trigger:
      platform: mqtt
      topic: frigate/events
    conditions: 
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

  - alias: Notify for dogs in the front with a high top score
    trigger:
      platform: mqtt
      topic: frigate/events
    conditions: 
      - "{{ trigger.payload_json['after']['label'] == 'dog' }}"
      - "{{ trigger.payload_json['after']['camera'] == 'front' }}"
      - "{{ trigger.payload_json['after']['top_score'] > 0.98 }}"
    action:
      - service: notify.mobile_app_pixel_3
        data_template:
          message: 'High confidence dog detection.'
          data:
            image: "https://url.com/api/frigate/notifications/{{trigger.payload_json['after']['id']}}/thumbnail.jpg"
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
                caption : 'A {{trigger.payload_json["after"]["label"]}} was detected on {{ trigger.payload_json["after"]["camera"] }} camera'
```
