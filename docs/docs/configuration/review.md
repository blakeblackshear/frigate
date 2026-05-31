---
id: review
title: Review
---

import ConfigTabs from "@site/src/components/ConfigTabs";
import TabItem from "@theme/TabItem";
import NavPath from "@site/src/components/NavPath";

The Review page of the Frigate UI is for quickly reviewing historical footage of interest from your cameras. _Review items_ are indicated on a vertical timeline and displayed as a grid of previews - bandwidth-optimized, low frame rate, low resolution videos. Hovering over or swiping a preview plays the video and marks it as reviewed. If more in-depth analysis is required, the preview can be clicked/tapped and the full frame rate, full resolution recording is displayed.

Review items are filterable by date, object type, and camera.

### Review items vs. tracked objects (formerly "events")

In Frigate 0.13 and earlier versions, the UI presented "events". An event was synonymous with a tracked or detected object. In Frigate 0.14 and later, a review item is a time period where any number of tracked objects were active.

For example, consider a situation where two people walked past your house. One was walking a dog. At the same time, a car drove by on the street behind them.

In this scenario, Frigate 0.13 and earlier would show 4 "events" in the UI - one for each person, another for the dog, and yet another for the car. You would have had 4 separate videos to watch even though they would have all overlapped.

In 0.14 and later, all of that is bundled into a single review item which starts and ends to capture all of that activity. Reviews for a single camera cannot overlap. Once you have watched that time period on that camera, it is marked as reviewed.

## Alerts and Detections

Not every segment of video captured by Frigate may be of the same level of interest to you. Video of people who enter your property may be a different priority than those walking by on the sidewalk. For this reason, Frigate categorizes review items as _alerts_ and _detections_. By default, all person and car objects are considered alerts. You can refine categorization of your review items by configuring required zones for them.

:::note

Alerts and detections categorize the tracked objects in review items, but Frigate must first detect those objects with your configured object detector (Coral, OpenVINO, etc). By default, the object tracker only detects `person`. Setting `labels` for `alerts` and `detections` does not automatically enable detection of new objects. To detect more than `person`, you should add more labels via <NavPath path="Settings > Global configuration > Objects" /> or <NavPath path="Settings > Camera configuration > Objects" /> and select your camera. Alternatively, add the following to your config:

```yaml
objects:
  track:
    - person
    - car
    - ...
```

See the [objects documentation](objects.md) for the list of objects that Frigate's default model tracks.
:::

## Restricting alerts to specific labels

By default a review item will only be marked as an alert if a person or car is detected. Configure the alert labels to include any object or audio label.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Global configuration > Review" /> or <NavPath path="Settings > Camera configuration > Review" /> and select your camera.

Expand **Alerts config** and configure which labels and zones should generate alerts.

</TabItem>
<TabItem value="yaml">

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

</TabItem>
</ConfigTabs>

## Restricting detections to specific labels

By default all detections that do not qualify as an alert qualify as a detection. However, detections can further be filtered to only include certain labels or certain zones.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Global configuration > Review" /> or <NavPath path="Settings > Camera configuration > Review" /> and select your camera.

Expand **Detections config** and configure which labels should qualify as detections.

</TabItem>
<TabItem value="yaml">

```yaml
# can be overridden at the camera level
review:
  detections:
    labels:
      - bark
      - dog
```

</TabItem>
</ConfigTabs>

## Excluding a camera from alerts or detections

To exclude a specific camera from alerts or detections, provide an empty list to the alerts or detections labels field at the camera level.

For example, to exclude objects on the camera _gatecamera_ from any detections:

<ConfigTabs>
<TabItem value="ui">

1. Navigate to <NavPath path="Settings > Camera configuration > Review" /> and select the **gatecamera** camera.
   - Expand **Detections config** and turn off all of the object label switches.

</TabItem>
<TabItem value="yaml">

```yaml {3-5}
cameras:
  gatecamera:
    review:
      detections:
        labels: []
```

</TabItem>
</ConfigTabs>

## Restricting review items to specific zones

By default a review item will be created if any `review -> alerts -> labels` and `review -> detections -> labels` are detected anywhere in the camera frame. You will likely want to configure review items to only be created when the object enters an area of interest, [see the zone docs for more information](./zones.md#restricting-alerts-and-detections-to-specific-zones)

:::info

Because zones don't apply to audio, audio labels will always be marked as a detection by default.

:::

## Reviewing Motion

The Review page also can show periods of motion that didn't produce a tracked object, and provides a way to search past recordings for motion in a specific region. These tools complement the alerts and detections workflow above — see [Tuning Motion Detection](motion_detection.md) for how the underlying motion detector is configured.

### Motion Previews

The Motion Previews pane shows preview clips for periods of significant motion that did not produce a tracked object. It is useful for spotting things that motion detection picked up but object detection did not, which can help validate tuning or catch missed objects.

On the <NavPath path="Review > Motion" /> page, click the kebab menu on a camera and choose **Motion Previews**. Each card represents a continuous range of motion-only activity and plays back the recorded preview for that range. A heatmap overlay dims areas of the frame with no motion so the moving regions stand out.

The pane provides a few controls:

- **Speed** — speeds up or slows down all of the preview clips at once.
- **Dim** — controls how strongly non-motion areas are darkened by the heatmap overlay. Higher values increase motion area visibility.
- **Filter** — opens a 16×16 grid overlaid on a snapshot of the camera. Select one or more cells to only show clips with motion in those regions. This is helpful for filtering out motion in areas like a busy street while keeping motion in your driveway.

Clicking a preview clip seeks the recording player to that timestamp so you can review the full footage.

### Motion Search

Motion Search lets you scan recorded footage for changes inside a region of interest you draw on the camera. Unlike Motion Previews, which surfaces what Frigate's motion detector flagged in real time, Motion Search re-analyzes the saved recordings, so it can find changes that were missed (for example, an object that appeared while motion detection was paused by `lightning_threshold`, or in a region that is normally motion-masked).

To start a search, click the kebab menu on a camera in the <NavPath path="Review > Motion" /> page and choose **Motion Search**. In the dialog:

1. Pick the camera and time range to scan.
2. Draw a polygon on the camera frame to define the region of interest.
3. Adjust the search parameters if needed:

| Field                     | Description                                                                                                                                                                                                                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sensitivity Threshold** | Per-pixel luminance change required to count as motion inside the ROI. Behaves like Frigate's motion detection `threshold` setting.                                                                                                                                                                            |
| **Minimum Change Area**   | Minimum percentage of the region of interest that must change for a frame to be considered significant. Raise it to ignore small movements (leaves, distant motion); lower it when the object you care about only covers a small slice of the ROI.                                                             |
| **Frame Skip**            | Number of frames to skip between samples — at a camera recording 20 fps, a skip value of 20 takes motion samples roughly once per second. Higher values scan much faster and are usually the right choice; lower it only when you need to catch the exact appearance or disappearance of a fast-moving object. |
| **Maximum Results**       | Maximum number of matching timestamps to return.                                                                                                                                                                                                                                                               |
| **Parallel mode**         | Process multiple recording segments in parallel. Speeds up large time ranges at the cost of higher CPU usage.                                                                                                                                                                                                  |

Once running, Frigate scans the recording segments that overlap the time range and reports timestamps where changes were detected inside the polygon, along with the percentage of the ROI that changed. Clicking a result seeks the player to that moment so you can review what happened.

The status panel shows live progress and metrics such as how many segments were scanned, how many were skipped because no motion was recorded for that segment (using the stored motion heatmap), how many frames were decoded, and the total wall-clock time. Segments with no recorded motion in the selected ROI are skipped automatically, which is what makes searching long time ranges practical.

#### Common use cases

Frigate's main use case is to record and surface tracked objects, so Motion Search is most useful for the cases where object detection produced nothing — there is no object to find in Explore, but you suspect something happened.

- **Locating an unattributed change.** You know something appeared, disappeared, or moved in a window of footage — a package now gone, a gate left open — but no detection points to it. A search returns the candidate timestamps instead of scrubbing the timeline by hand.
- **An object that was never detected.** Something Frigate doesn't have a model label for, an object too small or distant to be detected, or movement in a region where detection isn't running. The activity left no tracked object but did change the pixels, so a search can still find it.
- **Activity while detection was effectively paused.** Changes that occurred while object detection was disabled, motion was suppressed by `skip_motion_threshold`, or inside an area covered by a motion mask, won't appear as review items or tracked objects but can be recovered by searching the recordings directly.

#### Expected performance

Motion Search analyzes the saved recordings on demand rather than reading a pre-built index, so a search over a long range takes longer than browsing Motion Previews. Cost scales mainly with how much footage has to be examined: segments with no recorded motion in your ROI are skipped using the stored motion heatmap (shown as "segments skipped" in the status panel), so a quiet range finishes quickly while a busy one takes longer.

To increase the speed of searches:

- Draw a tight ROI. Because **Minimum Change Area** is measured as a percentage of the region you draw, a tight ROI around where you expect the change makes the object fill a larger share of the area, so it clears the threshold more easily. A loose ROI makes the same object a small fraction of the region, so it can fall below the threshold and be missed — forcing you to lower Minimum Change Area, which lets in more noise.
- Keep Frame Skip high. A higher value samples fewer frames and speeds up the search considerably, while still landing within a few seconds of when the motion or object appeared — close enough to seek to in the recording. Only lower it when you need to pinpoint the exact frame something appears or disappears.
- Use Parallel mode to shorten wall-clock time on multi-core systems, at the cost of higher CPU usage while it runs.
