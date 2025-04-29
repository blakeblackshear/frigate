---
id: ha_notifications
title: Home Assistant 通知
---

开始使用Frigate通知的最佳方式是使用[蓝图](https://community.home-assistant.io/t/frigate-mobile-app-notifications-2-0/559732)。你可以使用蓝图生成的yaml作为起点，然后根据需要进行自定义。

通常建议基于`frigate/reviews` mqtt主题来触发通知。这提供了获取[缩略图/快照/剪辑](/integrations/home-assistant.md#notification-api)所需的event_id以及其他用于自定义何时何地接收警报的有用信息。数据以变更源的形式发布，这意味着你可以在`before`部分引用对象的"前一个状态"，在`after`部分引用对象的"当前状态"。你可以在[这里](/integrations/mqtt.md#frigateevents)查看示例。

以下是一个简单的跟踪对象通知自动化示例，它会为每个变更更新现有的通知。这意味着当Frigate找到"更好的"图像时，你在通知中看到的图像会更新。

```yaml
automation:
  - alias: Notify of tracked object
    trigger:
      platform: mqtt
      topic: frigate/events
    action:
      - service: notify.mobile_app_pixel_3
        data:
          message: '检测到一个 {{trigger.payload_json["after"]["label"]}}。'
          data:
            image: 'https://your.public.hass.address.com/api/frigate/notifications/{{trigger.payload_json["after"]["id"]}}/thumbnail.jpg?format=android'
            tag: '{{trigger.payload_json["after"]["id"]}}'
            when: '{{trigger.payload_json["after"]["start_time"]|int}}'
```

注意，iOS设备通过在消息数据中添加摄像头实体ID来支持摄像头的实时预览。

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
          message: '检测到一个 {{trigger.payload_json["after"]["data"]["objects"] | sort | join(", ") | title}}。'
          data:
            image: >-
              https://your.public.hass.address.com/api/frigate/notifications/{{trigger.payload_json["after"]["data"]["detections"][0]}}/thumbnail.jpg
            tag: '{{trigger.payload_json["after"]["id"]}}'
            when: '{{trigger.payload_json["after"]["start_time"]|int}}'
            entity_id: camera.{{trigger.payload_json["after"]["camera"] | replace("-","_") | lower}}
    mode: single
```