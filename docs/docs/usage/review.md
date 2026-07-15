---
id: review
title: Review
---

import NavPath from "@site/src/components/NavPath";

**Review** is where you triage what happened on your cameras. It groups activity into **review items**, segments of time on a single camera that bundle together the objects and audio that were active at once, and sorts them into **Alerts**, **Detections**, and **Motion**. From here you can scrub through activity, mark items as reviewed, filter, export, and jump to the full recording in [History](/usage/history).

This page describes how to _use_ the Review view. For how alerts and detections are _configured_ (labels, zones, required zones, retention), see the [Review configuration](/configuration/review) docs.

:::info

Review items are only created for a camera when **object tracking and recording are enabled** for that camera. See [Recording](/configuration/record).

:::

## Alerts, Detections, and Motion

Not every segment of video captured by Frigate is of the same level of interest. The people who enter your property may be a higher priority than those just walking by on the sidewalk. For this reason, Frigate sorts **review items** by importance into **alerts** and **detections**, with a separate **Motion** category for significant motion.

The toggle at the top of the page switches between these three severities. One is always selected.

| Tab            | Indicator color | What it shows                                                                                                    |
| -------------- | --------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Alerts**     | dark red        | The activity you most want to see. By default, all `person` and `car` tracked objects are alerts.                |
| **Detections** | orange          | Everything else Frigate tracked that wasn't promoted to an alert.                                                |
| **Motion**     | yellow          | Periods of significant motion, with the ability to filter to periods which did **not** produce a tracked object. |

This same color coding is used for the ring around a selected item and the dots on the calendar. How an object is categorized as an alert vs. a detection, and how required zones refine that, is covered in [Alerts and Detections](/configuration/review#alerts-and-detections).

The **Alerts** and **Detections** tabs show a count next to their label. With **Show Reviewed** turned off (the default), this is the number of items still left to review; with it on, the count reflects every item in the selected time range.

## Marking items as reviewed

Review items are shown as a grid of thumbnail cards next to a vertical activity timeline. Hovering a card (desktop) or swiping to the right (mobile) plays a short preview inline.

- **Clicking** a card opens its recording in [History](/usage/history) and marks the item as reviewed.
- The object chip on each card is **gray** when the item is unreviewed and turns **green** once it has been reviewed.
- The **Mark these items as reviewed** button marks everything currently shown as reviewed at once.

Reviewed state is tracked per user, so marking an item reviewed does not hide it for other users. Marking an item reviewed does not delete anything: the footage and the review item itself remain until they expire via retention.

## Selecting and acting on multiple items

To act on several items at once, start a selection by **Ctrl/Cmd-clicking** a card (desktop) or **long-pressing** one (mobile). Selected cards gain a colored ring matching their severity. Keyboard shortcuts speed this up: `Ctrl+A` selects all, `R` marks the selection reviewed, and `Esc` clears it.

With items selected, an action bar appears with options to:

- **Export** the selected items (a single item exports directly; multiple items open the batch [export](/usage/exports) dialog),
- **Mark as reviewed** or **Mark as unreviewed**, and
- **Delete** them (admins only).

## Filtering and the calendar

Use the filter controls in the header to narrow what's shown. The available filters depend on the tab: Alerts and Detections can be filtered by **cameras**, **date**, **labels**, **zones**, and whether items are already reviewed; the Motion tab can be filtered by **cameras**, **date**, and **motion only**.

The **calendar** filter lets you jump to a specific day (it shows **Last 24 Hours** until you pick one). On each day:

- An **underline** under the day number means **recordings exist** for that day. Days without recordings are dimmed.
- A **colored dot** under the day number means there is **unreviewed activity** that day: a **red dot** for unreviewed alerts, or an **orange dot** for unreviewed detections when there are no unreviewed alerts. Motion is not represented by a dot.

Future dates are disabled, and the week start and time zone follow your configuration.

## Reviewing Motion

The Review page also can show periods of motion that didn't produce a tracked object, and provides a way to search past recordings for motion in a specific region. These tools complement the alerts and detections workflow above. See [Tuning Motion Detection](/configuration/motion_detection) for how the underlying motion detector is configured.

The **Motion** tab itself shows a multi-camera grid scrubbed to a shared point in time, with a draggable timeline and a playback-speed selector. A camera tile gains a colored ring when a review item or significant motion overlaps the current time, and clicking a tile opens that camera's recording at that moment. Each camera's options menu (the kebab in the corner of its tile) is where you open **Motion Previews** and **Motion Search**, described below.

### Motion Previews

The Motion Previews pane shows preview clips for periods of significant motion that did not produce a tracked object. It is useful for spotting things that motion detection picked up but object detection did not, which can help validate tuning or catch missed objects.

On the <NavPath path="Review > Motion" /> page, click the kebab menu on a camera and choose **Motion Previews**. Each card represents a continuous range of motion-only activity and plays back the recorded preview for that range. A heatmap overlay dims areas of the frame with no motion so the moving regions stand out.

The pane provides a few controls:

- **Speed**: speeds up or slows down all of the preview clips at once.
- **Dim**: controls how strongly non-motion areas are darkened by the heatmap overlay. Higher values increase motion area visibility.
- **Filter**: opens a 16×16 grid overlaid on a snapshot of the camera. Select one or more cells to only show clips with motion in those regions. This is helpful for filtering out motion in areas like a busy street while keeping motion in your driveway.

Clicking a preview clip seeks the recording player to that timestamp so you can review the full footage.

### Motion Search

Motion Search lets you scan recorded footage for changes inside a region of interest you draw on the camera. Unlike Motion Previews, which surfaces what Frigate's motion detector flagged in real time, Motion Search re-analyzes the saved recordings, so it can find changes that were missed (for example, an object that appeared while motion detection was paused by `lightning_threshold`, or in a region that is normally motion-masked).

To start a search, open the Actions menu in [History](/usage/history) or click the kebab menu on a camera in the <NavPath path="Review > Motion" /> page and choose **Motion Search**. In the dialog:

1. Pick the camera and time range to scan. In the date pickers, days that have recordings available are underlined.
2. Draw a polygon on the camera frame to define the region of interest.
3. Adjust the search parameters if needed:

| Field                     | Description                                                                                                                                                                                                                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sensitivity Threshold** | Per-pixel luminance change required to count as motion inside the ROI. Behaves like Frigate's motion detection `threshold` setting.                                                                                                                                                                                           |
| **Minimum Change Area**   | Minimum size of a single moving region, as a percentage of the ROI, for a frame to count as significant. Raise it to ignore small movements (leaves, distant motion); lower it when your subject covers only a small slice of the ROI. Every result shows the percentage it scored, so you can use those values to tune this. |
| **Maximum Results**       | Maximum number of matching timestamps to return. The search stops once it reaches this many results, so a lower value finishes sooner while a higher value scans further into the range.                                                                                                                                      |
| **Parallel mode**         | Decode multiple recording ranges at the same time. Speeds up large time ranges at the cost of higher decoding and CPU usage.                                                                                                                                                                                                  |

Motion Search samples each recording's keyframes automatically, so there is no frame-rate or sampling setting to tune.

Once running, Frigate scans the recording segments that overlap the time range and reports timestamps where changes were detected inside the polygon, along with the percentage of the ROI that changed. Clicking a result seeks the player to that moment so you can review what happened.

The results panel shows the time range being scanned, a live progress bar with the timestamp currently being analyzed, and the running result count. A collapsible **Search Metrics** section reports how many segments were scanned and processed, how many were skipped because no motion was recorded in the ROI (using the stored motion heatmap), how many frames were decoded, and the total search time. Skipping segments with no recorded motion in the selected ROI is what makes searching long time ranges practical.

#### Common use cases

Frigate's main use case is to record and surface tracked objects, so Motion Search is most useful for the cases where object detection produced nothing: there is no object to find in Explore, but you suspect something happened.

- **Locating an unattributed change.** You know something appeared, disappeared, or moved in a window of footage (a package now gone, a gate left open), but no detection points to it. A search returns the candidate timestamps instead of scrubbing the timeline by hand.
- **An object that was never detected.** Something Frigate doesn't have a model label for, an object too small or distant to be detected, or movement in a region where detection isn't running. The activity left no tracked object but did change the pixels, so a search can still find it.
- **Activity while detection was effectively paused.** Changes that occurred while object detection was disabled, motion was suppressed by `skip_motion_threshold`, or inside an area covered by a motion mask, won't appear as review items or tracked objects but can be recovered by searching the recordings directly.

#### Examples

These show how to choose the ROI and **Minimum Change Area** for two common goals. Minimum Change Area is the size of a single moving region as a percentage of the ROI you draw, so the right value depends on how much of the ROI your subject, and its movement between samples, covers.

Because samples are a second or more apart, a moving subject usually appears in two places at once in the comparison, so even ordinary motion often scores tens of percent and a low threshold lets in almost everything. The most reliable approach is to **run a search, look at the percentage each result scored, and set Minimum Change Area just below the values for the events you care about.** The default is 20%; the suggestions below are starting points.

- **When did this item first appear (or disappear)?** A package was dropped off, a car parked, or a trash can was moved, and you want the exact moment. Draw a **tight ROI** around the spot the item occupies and **raise Minimum Change Area** (start around 40–60%). Because the item fills most of a tight ROI, its arrival or removal is a large change, while smaller nearby motion (shadows, a passing pedestrian) stays below the threshold. The **earliest result** is when it appeared; if you only care about that moment, a low Maximum Results finishes faster. If you get no hits, the ROI is probably looser than the item: lower the threshold or tighten the ROI.
- **What's been getting into the garden?** Something has been trampling a flower bed overnight and no object was ever tracked. Draw a **looser ROI** covering the whole bed and use a **lower Minimum Change Area than the case above**: start near the 20% default and lower it (toward 5–10%) only if a small or distant subject is missed, since it covers just a slice of a large region. Expect more results to scan through: step through the timestamps and jump to each to see what triggered it. If wind-blown plants add noise, raise Minimum Change Area or the Sensitivity Threshold.

#### Expected performance

Motion Search analyzes the saved recordings on demand rather than reading a pre-built index, so a search over a long range takes longer than browsing Motion Previews. Cost scales mainly with how much footage has to be examined: segments with no recorded motion in your ROI are skipped using the stored motion heatmap (shown as "segments skipped" in the status panel), so a quiet range finishes quickly while a busy one takes longer.

To increase the speed of searches:

- Draw a tight ROI. Because **Minimum Change Area** is measured as a percentage of the region you draw, a tight ROI around where you expect the change makes the object fill a larger share of the area, so it clears the threshold more easily. A loose ROI makes the same object a small fraction of the region, so it can fall below the threshold and be missed, forcing you to lower Minimum Change Area, which lets in more noise.
- Narrow the time range to the window you care about, so there is less footage to examine.
- Lower **Maximum Results** when you only need the first few hits. Because the search stops once it reaches that many results, a smaller value lets a busy range finish early instead of scanning the whole window.
- Use Parallel mode to shorten wall-clock time on multi-core systems, at the cost of higher decoding and CPU usage while it runs.

## AI review summaries

When [Generative AI review](/configuration/genai/genai_review) is configured, Frigate can generate a title, description, and threat classification for review items and surface them automatically in Review and History. Clicking the summary chip opens an **AI Analysis** dialog with the generated detail and any flagged concerns.

In Review, an additional icon appears on unreviewed items that the AI classified as **suspicious** (Level 1) or **critical** (Level 2), so the activity that most warrants attention stands out before you open it. The icon goes away once the item has been reviewed.
