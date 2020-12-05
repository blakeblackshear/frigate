# Notification examples

```yaml
automation:

  - alias: When a person enters a zone named yard
    trigger:
      platform: mqtt
      topic: frigate/events
    conditions: 
      - "{{ trigger.payload_json["after"]["label"] == 'person' }}"
      - "{{ 'yard' in trigger.payload_json["after"]["entered_zones"] }}"
    action:
      - service: notify.mobile_app_pixel_3
        data_template:
          message: 'A {{trigger.payload_json["after"]["label"]}} has entered the yard.'
          data:
            image: 'https://url.com/api/frigate/notifications/{{trigger.payload_json["after"]["id"]}}.jpg'
            tag: '{{trigger.payload_json["after"]["id"]}}'

  - alias: When a person leaves a zone named yard
    trigger:
      platform: mqtt
      topic: frigate/events
    conditions: 
      - "{{ trigger.payload_json["after"]["label"] == 'person' }}"
      - "{{ 'yard' in trigger.payload_json["before"]["current_zones"] }}"
      - "{{ not 'yard' in trigger.payload_json["after"]["current_zones"] }}"
    action:
      - service: notify.mobile_app_pixel_3
        data_template:
          message: 'A {{trigger.payload_json["after"]["label"]}} has left the yard.'
          data:
            image: 'https://url.com/api/frigate/notifications/{{trigger.payload_json["after"]["id"]}}.jpg'
            tag: '{{trigger.payload_json["after"]["id"]}}'

  - alias: Notify for dogs in the front with a high top score
    trigger:
      platform: mqtt
      topic: frigate/events
    conditions: 
      - "{{ trigger.payload_json["after"]["label"] == 'dog' }}"
      - "{{ trigger.payload_json["after"]["camera"] == 'front' }}"
      - "{{ trigger.payload_json["after"]["top_score"] > 0.98 }}"
    action:
      - service: notify.mobile_app_pixel_3
        data_template:
          message: 'High confidence dog detection.'
          data:
            image: 'https://url.com/api/frigate/notifications/{{trigger.payload_json["after"]["id"]}}.jpg'
            tag: '{{trigger.payload_json["after"]["id"]}}'
```