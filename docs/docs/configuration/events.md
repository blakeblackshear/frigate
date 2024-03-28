---
id: events
title: Events
---

Events are saved as periods of time where active objects are detected. After watching the preview of an event it is marked as reviewed.

## Restricting alerts to specific object types

By default an event will only be marked as an alert if a person or car is detected. This can be configured using the following config:

```yaml
# can be overridden at camera level
objects:
  alert:
    - car
    - cat
    - dog
    - person
```

## Restricting alerts to specific zones

By default an event will be marked as an alert if any `objects -> alert` is detected anywhere in the camera frame. You will likely want to configure events to only be marked as an alert when the object enters an area of interest, [see the zone docs for more information](./zones.md#restricting-alerts-to-specific-zones)
