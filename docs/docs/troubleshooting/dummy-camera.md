---
id: dummy-camera
title: Analyzing Object Detection
---

When investigating object detection or tracking problems, it can be helpful to replay an exported video as a temporary "dummy" camera. This lets you reproduce issues locally, iterate on configuration (detections, zones, enrichment settings), and capture logs and clips for analysis.

## When to use

- Replaying an exported clip to reproduce incorrect detections
- Testing configuration changes (model settings, trackers, filters) against a known clip
- Gathering deterministic logs and recordings for debugging or issue reports

## Example Config

Place the clip you want to replay in a location accessible to Frigate (for example `/media/frigate/` or the repository `debug/` folder when developing). Then add a temporary camera to your `config/config.yml` like this:

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

- `-re -stream_loop -1` tells `ffmpeg` to play the file in realtime and loop indefinitely, which is useful for long debugging sessions.
- `-fflags +genpts` helps generate presentation timestamps when they are missing in the file.

## Steps

1. Export or copy the clip you want to replay to the Frigate host (e.g., `/media/frigate/` or `debug/clips/`). Depending on what you are looking to debug, it is often helpful to add some "pre-capture" time (where the tracked object is not yet visible) to the clip when exporting.
2. Add the temporary camera to `config/config.yml` (example above). Use a unique name such as `test` or `replay_camera` so it's easy to remove later.
   - If you're debugging a specific camera, copy the settings from that camera (frame rate, model/enrichment settings, zones, etc.) into the temporary camera so the replay closely matches the original environment. Leave `record` and `snapshots` disabled unless you are specifically debugging recording or snapshot behavior.
3. Restart Frigate.
4. Observe the Debug view in the UI and logs as the clip is replayed. Watch detections, zones, or any feature you're looking to debug, and note any errors in the logs to reproduce the issue.
5. Iterate on camera or enrichment settings (model, fps, zones, filters) and re-check the replay until the behavior is resolved.
6. Remove the temporary camera from your config after debugging to avoid spurious telemetry or recordings.

## Variables to consider in object tracking

- The exported video will not always line up exactly with how it originally ran through Frigate (or even with the last loop). Different frames may be used on replay, which can change detections and tracking.
- Motion detection depends on the frames used; small frame shifts can change motion regions and therefore what gets passed to the detector.
- Object detection is not deterministic: models and post-processing can yield different results across runs, so you may not get identical detections or track IDs every time.

When debugging, treat the replay as a close approximation rather than a byte-for-byte replay. Capture multiple runs, enable recording if helpful, and examine logs and saved event clips to understand variability.

## Troubleshooting

- No video: verify the path is correct and accessible from the Frigate process/container.
- FFmpeg errors: check the log output for ffmpeg-specific flags and adjust `input_args` accordingly for your file/container. You may also need to disable hardware acceleration (`hwaccel_args: ""`) for the dummy camera.
- No detections: confirm the camera `roles` include `detect`, and model/detector configuration is enabled.
