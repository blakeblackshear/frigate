---
id: review
title: Review
---

The Review page of the Frigate UI is for quickly reviewing historical footage of interest from your cameras. _Review items_ are indicated on a vertical timeline and displayed as a grid of previews - bandwidth-optimized, low frame rate, low resolution videos. Hovering over or swiping a preview plays the video and marks it as reviewed. If more in-depth analysis is required, the preview can be clicked/tapped and the full frame rate, full resolution recording is displayed.

Review items are filterable by date, object type, and camera.

## Alerts and Detections

Not every segment of video captured by Frigate may be of the same level of interest to you. Video of people who enter your property may be a different priority than those walking by on the sidewalk. For this reason, Frigate 0.14 categorizes review items as _alerts_ and _detections_. By default, all person and car objects are considered alerts. You can refine categorization of your review items by configuring required zones for them.

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
