---
id: record
title: Recording
---

Recordings can be enabled and are stored at `/media/frigate/recordings`. The folder structure for the recordings is `YYYY-MM-DD/HH/<camera_name>/MM.SS.mp4` in **UTC time**. These recordings are written directly from your camera stream without re-encoding. Each camera supports a configurable retention policy in the config. Frigate chooses the largest matching retention value between the recording retention and the tracked object retention when determining if a recording should be removed.

New recording segments are written from the camera stream to cache, they are only moved to disk if they match the setup recording retention policy.

H265 recordings can be viewed in Chrome 108+, Edge and Safari only. All other browsers require recordings to be encoded with H264.

## Common recording configurations

### Most conservative: Ensure all video is saved

For users deploying Frigate in environments where it is important to have contiguous video stored even if there was no detectable motion, the following config will store all video for 3 days. After 3 days, only video containing motion will be saved for 7 days. After 7 days, only video containing motion and overlapping with alerts or detections will be retained until 30 days have passed.

```yaml
record:
  enabled: True
  continuous:
    days: 3
  motion:
    days: 7
  alerts:
    retain:
      days: 30
      mode: all
  detections:
    retain:
      days: 30
      mode: all
```

### Reduced storage: Only saving video when motion is detected

In order to reduce storage requirements, you can adjust your config to only retain video where motion / activity was detected.

```yaml
record:
  enabled: True
  motion:
    days: 3
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

If you only want to retain video that occurs during activity caused by tracked object(s), this config will discard video unless an alert is ongoing.

```yaml
record:
  enabled: True
  continuous:
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

### Continuous and Motion Recording

The number of days to retain continuous and motion recordings can be set via the following config where X is a number, by default continuous recording is disabled.

```yaml
record:
  enabled: True
  continuous:
    days: 1 # <- number of days to keep continuous recordings
  motion:
    days: 2 # <- number of days to keep motion recordings
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

## Can I have "continuous" recordings, but only at certain times?

Using Frigate UI, Home Assistant, or MQTT, cameras can be automated to only record in certain situations or at certain times.

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

When using `hwaccel_args`, hardware encoding is used for timelapse generation. This setting can be overridden for a specific camera (e.g., when camera resolution exceeds hardware encoder limits); set `cameras.<camera>.record.export.hwaccel_args` with the appropriate settings. Using an unrecognized value or empty string will fall back to software encoding (libx264).

:::

:::tip

The encoder determines its own behavior so the resulting file size may be undesirably large.
To reduce the output file size the ffmpeg parameter `-qp n` can be utilized (where `n` stands for the value of the quantisation parameter). The value can be adjusted to get an acceptable tradeoff between quality and file size for the given scenario.

:::

## Apple Compatibility with H.265 Streams

Apple devices running the Safari browser may fail to playback h.265 recordings. The [apple compatibility option](../configuration/camera_specific.md#h265-cameras-via-safari) should be used to ensure seamless playback on Apple devices.

## Syncing Media Files With Disk

Media files (event snapshots, event thumbnails, review thumbnails, previews, exports, and recordings) can become orphaned when database entries are deleted but the corresponding files remain on disk.

This feature checks the file system for media files and removes any that are not referenced in the database.

The API endpoint `POST /api/media/sync` can be used to trigger a media sync. The endpoint accepts a JSON request body to control the operation.

Request body schema (JSON):

```json
{
  "dry_run": true,
  "media_types": ["all"],
  "force": false
}
```

- `dry_run` (boolean): If `true` (default) the service will only report orphaned files without deleting them. Set to `false` to allow deletions.
- `media_types` (array of strings): Which media types to sync. Use `"all"` to sync everything, or a list of one or more of:
  - `event_snapshots`
  - `event_thumbnails`
  - `review_thumbnails`
  - `previews`
  - `exports`
  - `recordings`
- `force` (boolean): If `true` the safety threshold is bypassed and deletions proceed even if the operation would remove a large proportion of files. Use with extreme caution.

:::warning

This operation uses considerable CPU resources and includes a safety threshold that aborts if more than 50% of files would be deleted. Only run when necessary. If you set `force: true` the safety threshold will be bypassed; do not use `force` unless you are certain the deletions are intended.

:::
