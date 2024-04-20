---
id: review
title: Review
---

Review items are saved as periods of time where frigate detected events. After watching the preview of a review item it is marked as reviewed.

## Restricting alerts to specific labels

By default a review item will only be marked as an alert if a person or car is detected. This can be configured to include any object or audio label using the following config:

```yaml
# can be overridden at the camera level
review:
  alerts:
    labels:
      - car
      - cat
      - dog
      - person
      - speech
```

## Restricting detections to specific labels

By default all detections that do not qualify as an alert qualify as a detection. However, detections can further be filtered to only include certain labels or certain zones.

By default a review item will only be marked as an alert if a person or car is detected. This can be configured to include any object or audio label using the following config:

```yaml
# can be overridden at the camera level
review:
  detections:
    labels:
      - bark
      - dog
```

## Restricting review items to specific zones

By default a review item will be created if any `review -> alerts -> labels` and `review -> detections -> labels` are detected anywhere in the camera frame. You will likely want to configure review items to only be created when the object enters an area of interest, [see the zone docs for more information](./zones.md#restricting-alerts-and-detections-to-specific-zones)

:::info

Because zones don't apply to audio, audio labels will always be marked as an alert.

:::
