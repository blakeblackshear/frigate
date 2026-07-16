---
id: dummy-camera
title: Analyzing Object Detection
---

import NavPath from "@site/src/components/NavPath";

Frigate provides several tools for investigating object detection and tracking behavior: reviewing recorded detections through the UI, using the built-in Debug Replay feature, and manually setting up a dummy camera for advanced scenarios.

## Reviewing Detections in the UI

Before setting up a replay, you can often diagnose detection issues by reviewing existing recordings directly in the Frigate UI.

### Detail View (History)

The **Detail Stream** view in History shows recorded video with detection overlays (bounding boxes, path points, and zone highlights) drawn on top. Select a review item to see its tracked objects and lifecycle events. Clicking a lifecycle event seeks the video to that point so you can see exactly what the detector saw.

### Tracking Details (Explore)

In **Explore**, clicking a thumbnail opens the **Tracking Details** pane, which shows the full lifecycle of a single tracked object: every detection, zone entry/exit, and attribute change. The video plays back with the bounding box overlaid, letting you step through the object's entire lifecycle.

### Annotation Offset

Both views support an **Annotation Offset** setting (`detect.annotation_offset` in your camera config) that shifts the detection overlay in time relative to the recorded video. This compensates for the timing drift between the `detect` and `record` pipelines.

These streams use fundamentally different clocks with different buffering and latency characteristics, so the detection data and the recorded video are never perfectly synchronized. The annotation offset shifts the overlay to visually align the bounding boxes with the objects in the recorded video.

#### Why the offset varies between clips

The base timing drift between detect and record is roughly constant for a given camera, so a single offset value works well on average. However, you may notice the alignment is not pixel-perfect in every clip. This is normal and caused by several factors:

- **Keyframe-constrained seeking**: When the browser seeks to a timestamp, it can only land on the nearest keyframe. Each recording segment has keyframes at different positions relative to the detection timestamps, so the same offset may land slightly early in one clip and slightly late in another.
- **Segment boundary trimming**: When a recording range starts mid-segment, the video is trimmed to the requested start point. This trim may not align with a keyframe, shifting the effective reference point.
- **Capture-time jitter**: Network buffering, camera buffer flushes, and ffmpeg's own buffering mean the system-clock timestamp and the corresponding recorded frame are not always offset by exactly the same amount.

The per-clip variation is typically quite low and is mostly an artifact of keyframe granularity rather than a change in the true drift. A "perfect" alignment would require per-frame, keyframe-aware offset compensation, which is not practical. Treat the annotation offset as a best-effort average for your camera.

## Debug Replay

Debug Replay lets you re-run Frigate's detection pipeline against a section of recorded video without manually configuring a dummy camera. It automatically extracts the recording, creates a temporary camera with the same detection settings as the original, and loops the clip through the pipeline so you can observe detections in real time.

The replay camera behaves like a live camera feed rather than History's video player: it loops the clip continuously as Frigate analyzes it and has no playback controls, so you cannot pause, scrub, or step through it frame by frame.

Debug Replay isn't intended to be a one-stop pane for all Frigate diagnostics or a comprehensive debugging environment for every Frigate feature. It merely makes it easier to spin up a "dummy camera" and perform some common adjustments in real time. You'll still need to use the normal tools (logs, an MQTT client, etc) to debug your feature.

### When to use

- Reproducing a detection or tracking issue from a specific time range
- Testing configuration changes (model settings, zones, filters, motion) against a known clip
- Gathering logs and debug overlays for a bug report

:::note

Only one replay session can be active at a time. If a session is already running, you will be prompted to navigate to it or stop it first.

:::

### Starting Debug Replay

Debug Replay can be started from several places in the UI. The starting point determines the time range that gets replayed.

- **History: Actions menu.** Navigate to <NavPath path="History > {camera}" />, open the **Actions** menu in the toolbar, and choose **Debug Replay**. From here you can pick a preset (**Last 1 Minute**, **Last 5 Minutes**), select a range directly on the timeline with **From Timeline**, or enter exact start and end times with **Custom**. This is the most flexible option and the best choice when you want to add padding around a detection. On mobile, the same options appear in the Actions drawer.
- **History: Detail Stream event menu.** While viewing a review item in the Detail Stream, open the menu on a tracked object's event card and choose **Debug Replay**. The replay range is set automatically to that object's start and end times.
- **Explore: search result menu.** From an Explore card, open the kebab menu and choose **Debug Replay**. The range is taken from the tracked object's lifecycle.
- **Explore: Tracking Details Actions menu.** Open a tracked object's **Tracking Details** dialog, then choose **Debug Replay** from the Actions menu. Same automatic range as the search result menu.
- **Exports: export card menu.** From <NavPath path="Exports" />, open the menu on an export and choose **Debug Replay** to loop the exported clip through the detection pipeline for the camera it was exported from.

The Detail Stream, Explore, and Exports entry points use the underlying recording or export's bounds with a small amount of padding. This can be convenient for quick checks, but if a detection is short or you want extra "settle" time for motion and the detector, start the replay from the History Actions menu instead and widen the range manually.

### Variables to consider

- The replay will not always produce identical results to the original run. Different frames may be selected on replay, which can change detections and tracking.
- Motion detection depends on the exact frames used; small frame shifts can change motion regions and therefore what gets passed to the detector.
- Object detection is not fully deterministic: models and post-processing can yield slightly different results across runs.
- In cases where a detection is short and a replay may only be a small number of frames, it is recommended to manually add some padding before and after the detection so that the motion and object detectors have time to settle into the scene. Rather than starting Debug Replay from Explore, navigate to History for your camera, choose Debug Replay from the Actions menu, and click the "From Timeline" or "Custom" option.
- The replay camera inherits the source camera's zones. Any automations that trigger on those zone names will fire for the replay camera as well. This can be helpful when debugging zone behavior, but may be unexpected. You can add a condition on the source camera's name in your automation if you want to exclude replay triggers.

Treat the replay as a close approximation rather than an exact reproduction. Run multiple loops and examine the debug overlays and logs to understand the behavior.

## Manual Dummy Camera

For advanced scenarios (such as testing with a clip from a different source, debugging ffmpeg behavior, or running a clip through a completely custom configuration), you can set up a dummy camera manually.

### Example config

Place the clip you want to replay in a location accessible to Frigate (for example `/media/frigate/` or the repository `debug/` folder when developing). Then add a temporary camera to your `config/config.yml`:

```yaml
cameras:
  test:
    ffmpeg:
      inputs:
        - path: /media/frigate/car-stopping.mp4
          input_args: -re -stream_loop -1 -fflags +genpts
          roles:
            - detect
    detect:
      enabled: true
    record:
      enabled: false
    snapshots:
      enabled: false
```

- `-re -stream_loop -1` tells ffmpeg to play the file in real time and loop indefinitely.
- `-fflags +genpts` generates presentation timestamps when they are missing in the file.

### Steps

1. Export or copy the clip you want to replay to the Frigate host (e.g., `/media/frigate/` or `debug/clips/`). Depending on what you are looking to debug, it is often helpful to add some "pre-capture" time (where the tracked object is not yet visible) to the clip when exporting.
2. Add the temporary camera to `config/config.yml` (example above). Use a unique name such as `test` or `replay_camera` so it's easy to remove later.
   - If you're debugging a specific camera, copy the settings from that camera (frame rate, model/enrichment settings, zones, etc.) into the temporary camera so the replay closely matches the original environment. Leave `record` and `snapshots` disabled unless you are specifically debugging recording or snapshot behavior.
3. Restart Frigate.
4. Observe the [Debug view](/usage/live#the-single-camera-view) in the UI and logs as the clip is replayed. Watch detections, zones, or any feature you're looking to debug, and note any errors in the logs to reproduce the issue.
5. Iterate on camera or enrichment settings (model, fps, zones, filters) and re-check the replay until the behavior is resolved.
6. Remove the temporary camera from your config after debugging to avoid spurious telemetry or recordings.

### Troubleshooting

- **No video**: verify the file path is correct and accessible from the Frigate process/container.
- **FFmpeg errors**: check the log output and adjust `input_args` for your file format. You may also need to disable hardware acceleration (`hwaccel_args: ""`) for the dummy camera.
- **No detections**: confirm the camera `roles` include `detect` and that the model/detector configuration is enabled.
