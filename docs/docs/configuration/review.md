---
id: review
title: Review
---

The Review page of the Frigate UI is for quickly reviewing historical footage of interest from your cameras. _Review items_ are indicated on a vertical timeline and displayed as a grid of previews - bandwidth-optimized, low frame rate, low resolution videos. Hovering over or swiping a preview plays the video and marks it as reviewed. If more in-depth analysis is required, the preview can be clicked/tapped and the full frame rate, full resolution recording is displayed.

Review items are filterable by date, object type, and camera.

### Review items vs. tracked objects (formerly "events")

In Frigate 0.13 and earlier versions, the UI presented "events". An event was synonymous with a tracked or detected object. In Frigate 0.14 and later, a review item is a time period where any number of tracked objects were active.

For example, consider a situation where two people walked past your house. One was walking a dog. At the same time, a car drove by on the street behind them.

In this scenario, Frigate 0.13 and earlier would show 4 "events" in the UI - one for each person, another for the dog, and yet another for the car. You would have had 4 separate videos to watch even though they would have all overlapped.

In 0.14 and later, all of that is bundled into a single review item which starts and ends to capture all of that activity. Reviews for a single camera cannot overlap. Once you have watched that time period on that camera, it is marked as reviewed.

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

```yaml
# can be overridden at the camera level
review:
  detections:
    labels:
      - bark
      - dog
```

## Excluding a camera from alerts or detections

To exclude a specific camera from alerts or detections, simply provide an empty list to the alerts or detections field _at the camera level_.

For example, to exclude objects on the camera _gatecamera_ from any detections, include this in your config:

```yaml
cameras:
  gatecamera:
    review:
      detections:
        labels: []
```

## Restricting review items to specific zones

By default a review item will be created if any `review -> alerts -> labels` and `review -> detections -> labels` are detected anywhere in the camera frame. You will likely want to configure review items to only be created when the object enters an area of interest, [see the zone docs for more information](./zones.md#restricting-alerts-and-detections-to-specific-zones)

:::info

Because zones don't apply to audio, audio labels will always be marked as a detection by default.

:::
