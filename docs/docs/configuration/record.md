---
id: record
title: Recording
---

Recordings can be enabled and are stored at `/media/frigate/recordings`. The folder structure for the recordings is `YYYY-MM-DD/HH/<camera_name>/MM.SS.mp4` in **UTC time**. These recordings are written directly from your camera stream without re-encoding. Each camera supports a configurable retention policy in the config. Frigate chooses the largest matching retention value between the recording retention and the tracked object retention when determining if a recording should be removed.

New recording segments are written from the camera stream to cache, they are only moved to disk if they match the setup recording retention policy.

H265 recordings can be viewed in Chrome 108+, Edge and Safari only. All other browsers require recordings to be encoded with H264.

## Common recording configurations

### Most conservative: Ensure all video is saved

For users deploying Frigate in environments where it is important to have contiguous video stored even if there was no detectable motion, the following config will store all video for 3 days. After 3 days, only video containing motion and overlapping with alerts or detections will be retained until 30 days have passed.

```yaml
record:
  enabled: True
  retain:
    days: 3
    mode: all
  alerts:
    retain:
      days: 30
      mode: motion
  detections:
    retain:
      days: 30
      mode: motion
```

### Reduced storage: Only saving video when motion is detected

In order to reduce storage requirements, you can adjust your config to only retain video where motion was detected.

```yaml
record:
  enabled: True
  retain:
    days: 3
    mode: motion
  alerts:
    retain:
      days: 30
      mode: motion
  detections:
    retain:
      days: 30
      mode: motion
```

### Minimum: Alerts only

If you only want to retain video that occurs during a tracked object, this config will discard video unless an alert is ongoing.

```yaml
record:
  enabled: True
  retain:
    days: 0
  alerts:
    retain:
      days: 30
      mode: motion
```

## Will Frigate delete old recordings if my storage runs out?

As of Frigate 0.12 if there is less than an hour left of storage, the oldest 2 hours of recordings will be deleted.

## Configuring Recording Retention

Frigate supports both continuous and tracked object based recordings with separate retention modes and retention periods.

:::tip

Retention configs support decimals meaning they can be configured to retain `0.5` days, for example.

:::

### Continuous Recording

The number of days to retain continuous recordings can be set via the following config where X is a number, by default continuous recording is disabled.

```yaml
record:
  enabled: True
  retain:
    days: 1 # <- number of days to keep continuous recordings
```

Continuous recording supports different retention modes [which are described below](#what-do-the-different-retain-modes-mean)

### Object Recording

The number of days to record review items can be specified for review items classified as alerts as well as tracked objects.

```yaml
record:
  enabled: True
  alerts:
    retain:
      days: 10 # <- number of days to keep alert recordings
  detections:
    retain:
      days: 10 # <- number of days to keep detections recordings
```

This configuration will retain recording segments that overlap with alerts and detections for 10 days. Because multiple tracked objects can reference the same recording segments, this avoids storing duplicate footage for overlapping tracked objects and reduces overall storage needs.

**WARNING**: Recordings still must be enabled in the config. If a camera has recordings disabled in the config, enabling via the methods listed above will have no effect.

## What do the different retain modes mean?

Frigate saves from the stream with the `record` role in 10 second segments. These options determine which recording segments are kept for continuous recording (but can also affect tracked objects).

Let's say you have Frigate configured so that your doorbell camera would retain the last **2** days of continuous recording.

- With the `all` option all 48 hours of those two days would be kept and viewable.
- With the `motion` option the only parts of those 48 hours would be segments that Frigate detected motion. This is the middle ground option that won't keep all 48 hours, but will likely keep all segments of interest along with the potential for some extra segments.
- With the `active_objects` option the only segments that would be kept are those where there was a true positive object that was not considered stationary.

The same options are available with alerts and detections, except it will only save the recordings when it overlaps with a review item of that type.

A configuration example of the above retain modes where all `motion` segments are stored for 7 days and `active objects` are stored for 14 days would be as follows:

```yaml
record:
  enabled: True
  retain:
    days: 7
    mode: motion
  alerts:
    retain:
      days: 14
      mode: active_objects
  detections:
    retain:
      days: 14
      mode: active_objects
```

The above configuration example can be added globally or on a per camera basis.

## Can I have "continuous" recordings, but only at certain times?

Using Frigate UI, HomeAssistant, or MQTT, cameras can be automated to only record in certain situations or at certain times.

## How do I export recordings?

Footage can be exported from Frigate by right-clicking (desktop) or long pressing (mobile) on a review item in the Review pane or by clicking the Export button in the History view. Exported footage is then organized and searchable through the Export view, accessible from the main navigation bar.

### Time-lapse export

Time lapse exporting is available only via the [HTTP API](../integrations/api/export-recording-export-camera-name-start-start-time-end-end-time-post.api.mdx).

When exporting a time-lapse the default speed-up is 25x with 30 FPS. This means that every 25 seconds of (real-time) recording is condensed into 1 second of time-lapse video (always without audio) with a smoothness of 30 FPS.

To configure the speed-up factor, the frame rate and further custom settings, the configuration parameter `timelapse_args` can be used. The below configuration example would change the time-lapse speed to 60x (for fitting 1 hour of recording into 1 minute of time-lapse) with 25 FPS:

```yaml
record:
  enabled: True
  export:
    timelapse_args: "-vf setpts=PTS/60 -r 25"
```

:::tip

When using `hwaccel_args` globally hardware encoding is used for time lapse generation. The encoder determines its own behavior so the resulting file size may be undesirably large.
To reduce the output file size the ffmpeg parameter `-qp n` can be utilized (where `n` stands for the value of the quantisation parameter). The value can be adjusted to get an acceptable tradeoff between quality and file size for the given scenario.

:::

## Syncing Recordings With Disk

In some cases the recordings files may be deleted but Frigate will not know this has happened. Recordings sync can be enabled which will tell Frigate to check the file system and delete any db entries for files which don't exist.

```yaml
record:
  sync_recordings: True
```

:::warning

The sync operation uses considerable CPU resources and in most cases is not needed, only enable when necessary.

:::
