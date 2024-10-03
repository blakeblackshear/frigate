---
id: api
title: HTTP API
---

A web server is available on port 5000 with the following endpoints.

## Management & Information

### `GET /api/config`

A json representation of your configuration

### `POST /api/restart`

Restarts Frigate process.

### `GET /api/stats`

Contains some granular debug info that can be used for sensors in Home Assistant.

Sample response:

```json
{
  /* Per Camera Stats */
  "cameras": {
    "back": {
      /***************
       * Frames per second being consumed from your camera. If this is higher
       * than it is supposed to be, you should set -r FPS in your input_args.
       * camera_fps = process_fps + skipped_fps
       ***************/
      "camera_fps": 5.0,
      /***************
       * Number of times detection is run per second. This can be higher than
       * your camera FPS because Frigate often looks at the same frame multiple times
       * or in multiple locations
       ***************/
      "detection_fps": 1.5,
      /***************
       * PID for the ffmpeg process that consumes this camera
       ***************/
      "capture_pid": 27,
      /***************
       * PID for the process that runs detection for this camera
       ***************/
      "pid": 34,
      /***************
       * Frames per second being processed by Frigate.
       ***************/
      "process_fps": 5.1,
      /***************
       * Frames per second skip for processing by Frigate.
       ***************/
      "skipped_fps": 0.0
    }
  },
  /***************
   * Sum of detection_fps across all cameras and detectors.
   * This should be the sum of all detection_fps values from cameras.
   ***************/
  "detection_fps": 5.0,
  /* Detectors Stats */
  "detectors": {
    "coral": {
      /***************
       * Timestamp when object detection started. If this value stays non-zero and constant
       * for a long time, that means the detection process is stuck.
       ***************/
      "detection_start": 0.0,
      /***************
       * Time spent running object detection in milliseconds.
       ***************/
      "inference_speed": 10.48,
      /***************
       * PID for the shared process that runs object detection on the Coral.
       ***************/
      "pid": 25321
    }
  },
  "service": {
    /* Uptime in seconds */
    "uptime": 10,
    "version": "0.10.1-8883709",
    "latest_version": "0.10.1",
    /* Storage data in MB for important locations */
    "storage": {
      "/media/frigate/clips": {
        "total": 1000,
        "used": 700,
        "free": 300,
        "mnt_type": "ext4"
      },
      "/media/frigate/recordings": {
        "total": 1000,
        "used": 700,
        "free": 300,
        "mnt_type": "ext4"
      },
      "/tmp/cache": {
        "total": 256,
        "used": 100,
        "free": 156,
        "mnt_type": "tmpfs"
      },
      "/dev/shm": {
        "total": 256,
        "used": 100,
        "free": 156,
        "mnt_type": "tmpfs"
      }
    }
  },
  "cpu_usages": {
    "pid": {
      "cmdline": "ffmpeg...",
      "cpu": "5.0",
      "cpu_average": "3.0",
      "mem": "0.5"
    }
  },
  "gpu_usages": {
    "gpu-type": {
      "gpu": "17%",
      "mem": "18%"
    }
  }
}
```

### `GET /api/version`

Version info

### `GET /api/ffprobe`

Get ffprobe output for camera feed paths.

| param   | Type   | Description                        |
| ------- | ------ | ---------------------------------- |
| `paths` | string | `,` separated list of camera paths |

### `GET /api/<camera_name>/ptz/info`

Get PTZ info for the camera.

## Camera Media

### `GET /api/<camera_name>`

An mjpeg stream for debugging. Keep in mind the mjpeg endpoint is for debugging only and will put additional load on the system when in use.

Accepts the following query string parameters:

| param       | Type | Description                                                        |
| ----------- | ---- | ------------------------------------------------------------------ |
| `fps`       | int  | Frame rate                                                         |
| `h`         | int  | Height in pixels                                                   |
| `bbox`      | int  | Show bounding boxes for detected objects (0 or 1)                  |
| `timestamp` | int  | Print the timestamp in the upper left (0 or 1)                     |
| `zones`     | int  | Draw the zones on the image (0 or 1)                               |
| `mask`      | int  | Overlay the mask on the image (0 or 1)                             |
| `motion`    | int  | Draw blue boxes for areas with detected motion (0 or 1)            |
| `regions`   | int  | Draw green boxes for areas where object detection was run (0 or 1) |

You can access a higher resolution mjpeg stream by appending `h=height-in-pixels` to the endpoint. For example `/api/back?h=1080`. You can also increase the FPS by appending `fps=frame-rate` to the URL such as `/api/back?fps=10` or both with `?fps=10&h=1000`.

### `GET /api/<camera_name>/latest.jpg[?h=300]`

The most recent frame that Frigate has finished processing. It is a full resolution image by default.

Accepts the following query string parameters:

| param       | Type | Description                                                        |
| ----------- | ---- | ------------------------------------------------------------------ |
| `h`         | int  | Height in pixels                                                   |
| `bbox`      | int  | Show bounding boxes for detected objects (0 or 1)                  |
| `timestamp` | int  | Print the timestamp in the upper left (0 or 1)                     |
| `zones`     | int  | Draw the zones on the image (0 or 1)                               |
| `mask`      | int  | Overlay the mask on the image (0 or 1)                             |
| `motion`    | int  | Draw blue boxes for areas with detected motion (0 or 1)            |
| `regions`   | int  | Draw green boxes for areas where object detection was run (0 or 1) |
| `quality`   | int  | Jpeg encoding quality (0-100). Defaults to 70.                     |

Example parameters:

- `h=300`: resizes the image to 300 pixels tall

### `GET /api/<camera_name>/<label>/thumbnail.jpg`

Returns the thumbnail from the latest event for the given camera and label combo. Using `any` as the label will return the latest thumbnail regardless of type.

### `GET /api/<camera_name>/<label>/clip.mp4`

Returns the clip from the latest event for the given camera and label combo. Using `any` as the label will return the latest clip regardless of type.

### `GET /api/<camera_name>/<label>/snapshot.jpg`

Returns the snapshot image from the latest event for the given camera and label combo. Using `any` as the label will return the latest thumbnail regardless of type.

### `GET /api/<camera_name>/grid.jpg`

Returns the latest camera image with the regions grid overlaid.

| param        | Type  | Description                                                                                |
| ------------ | ----- | ------------------------------------------------------------------------------------------ |
| `color`      | str   | The color of the grid (red,green,blue,black,white). Defaults to "green".                   |
| `font_scale` | float | Font scale. Can be used to increase font size on high resolution cameras. Defaults to 0.5. |

### `GET /clips/<camera>-<id>.jpg`

JPG snapshot for the given camera and event id.

## Events

### `GET /api/events`

Events from the database. Accepts the following query string parameters:

| param                | Type  | Description                                           |
| -------------------- | ----- | ----------------------------------------------------- |
| `before`             | int   | Epoch time                                            |
| `after`              | int   | Epoch time                                            |
| `cameras`            | str   | , separated list of cameras                           |
| `labels`             | str   | , separated list of labels                            |
| `zones`              | str   | , separated list of zones                             |
| `limit`              | int   | Limit the number of events returned                   |
| `has_snapshot`       | int   | Filter to events that have snapshots (0 or 1)         |
| `has_clip`           | int   | Filter to events that have clips (0 or 1)             |
| `include_thumbnails` | int   | Include thumbnails in the response (0 or 1)           |
| `in_progress`        | int   | Limit to events in progress (0 or 1)                  |
| `time_range`         | str   | Time range in format after,before (00:00,24:00)       |
| `timezone`           | str   | Timezone to use for time range                        |
| `min_score`          | float | Minimum score of the event                            |
| `max_score`          | float | Maximum score of the event                            |
| `is_submitted`       | int   | Filter events that are submitted to Frigate+ (0 or 1) |
| `min_length`         | float | Minimum length of the event                           |
| `max_length`         | float | Maximum length of the event                           |

### `GET /api/events/summary`

Returns summary data for events in the database. Used by the Home Assistant integration.

### `GET /api/events/<id>`

Returns data for a single event.

### `DELETE /api/events/<id>`

Permanently deletes the event along with any clips/snapshots.

### `POST /api/events/<id>/retain`

Sets retain to true for the event id.

### `POST /api/events/<id>/plus`

Submits the snapshot of the event to Frigate+ for labeling.

| param                | Type | Description                        |
| -------------------- | ---- | ---------------------------------- |
| `include_annotation` | int  | Submit annotation to Frigate+ too. |

### `PUT /api/events/<id>/false_positive`

Submits the snapshot of the event to Frigate+ for labeling and adds the detection as a false positive.

### `DELETE /api/events/<id>/retain`

Sets retain to false for the event id (event may be deleted quickly after removing).

### `POST /api/events/<id>/sub_label`

Set a sub label for an event. For example to update `person` -> `person's name` if they were recognized with facial recognition.
Sub labels must be 100 characters or shorter.

```json
{
  "subLabel": "some_string",
  "subLabelScore": 0.79
}
```

### `GET /api/events/<id>/thumbnail.jpg`

Returns a thumbnail for the event id optimized for notifications. Works while the event is in progress and after completion. Passing `?format=android` will convert the thumbnail to 2:1 aspect ratio.

### `GET /api/events/<id>/clip.mp4`

Returns the clip for the event id. Works after the event has ended.

### `GET /api/events/<id>/snapshot-clean.png`

Returns the clean snapshot image for the event id. Only works if `snapshots` and `clean_copy` are enabled in the config.

| param      | Type | Description        |
| ---------- | ---- | ------------------ |
| `download` | bool | Download the image |

### `GET /api/events/<id>/snapshot.jpg`

Returns the snapshot image for the event id. Works while the event is in progress and after completion.

Accepts the following query string parameters, but they are only applied when an event is in progress. After the event is completed, the saved snapshot is returned from disk without modification:

| param       | Type | Description                                       |
| ----------- | ---- | ------------------------------------------------- |
| `h`         | int  | Height in pixels                                  |
| `bbox`      | int  | Show bounding boxes for detected objects (0 or 1) |
| `timestamp` | int  | Print the timestamp in the upper left (0 or 1)    |
| `crop`      | int  | Crop the snapshot to the (0 or 1)                 |
| `quality`   | int  | Jpeg encoding quality (0-100). Defaults to 70.    |
| `download`  | bool | Download the image                                |

### `POST /api/events/<camera_name>/<label>/create`

Create a manual event with a given `label` (ex: doorbell press) to capture a specific event besides an object being detected.

:::warning

Recording retention config still applies to manual events, if frigate is configured with `mode: motion` then the manual event will only keep recording segments when motion occurred.

:::

**Optional Body:**

```json
{
  "sub_label": "some_string", // add sub label to event
  "duration": 30, // predetermined length of event (default: 30 seconds) or can be to null for indeterminate length event
  "include_recording": true, // whether the event should save recordings along with the snapshot that is taken
  "draw": {
    // optional annotations that will be drawn on the snapshot
    "boxes": [
      {
        "box": [0.5, 0.5, 0.25, 0.25], // box consists of x, y, width, height which are on a scale between 0 - 1
        "color": [255, 0, 0], // color of the box, default is red
        "score": 100 // optional score associated with the box
      }
    ]
  }
}
```

**Success Response:**

```json
{
  "event_id": "1682970645.13116-1ug7ns",
  "message": "Successfully created event.",
  "success": true
}
```

### `PUT /api/events/<event_id>/end`

End a specific manual event without a predetermined length.

### `GET /api/events/<id>/preview.gif`

Gif covering the first 20 seconds of a specific event.

## Previews

Previews are low res / fps videos that are quickly scrubbable and can be used for notifications or time-lapses.

### `GET /api/preview/<camera>/start/<start-timestamp>/end/<end-timestamp>`

Metadata about previews for this time range.

### `GET /api/preview/<year>-<month>/<day>/<hour>/<camera>/<timezone>`

Metadata about previews for this hour

### `GET /api/preview/<camera>/start/<start-timestamp>/end/<end-timestamp>/frames`

List of frames in the preview cache for the time range. Previews are only kept in the cache until they are combined into an mp4 at the end of the hour.

### `GET /api/preview/<file_name>/thumbnail.jpg`

Specific preview frame from preview cache.

### `GET /review/<review_id>/preview`

Looping image made from preview video / frames during this review item.

| param     | Type | Description                      |
| --------- | ---- | -------------------------------- |
| `format`  | str  | Format of preview [`gif`, `mp4`] |

### `GET /<camera>/start/<start-timestamp>/end/<end-timestamp>/preview`

Looping image made from preview video / frames during this time range.

| param     | Type | Description                      |
| --------- | ---- | -------------------------------- |
| `format`  | str  | Format of preview [`gif`, `mp4`] |

## Recordings

### `GET /vod/<year>-<month>/<day>/<hour>/<camera>/master.m3u8`

HTTP Live Streaming Video on Demand URL for the specified hour and camera. Can be viewed in an application like VLC.

### `GET /vod/event/<event-id>/index.m3u8`

HTTP Live Streaming Video on Demand URL for the specified event. Can be viewed in an application like VLC.

### `GET /vod/<camera>/start/<start-timestamp>/end/<end-timestamp>/index.m3u8`

HTTP Live Streaming Video on Demand URL for the camera with the specified time range. Can be viewed in an application like VLC.

### `POST /api/export/<camera>/start/<start-timestamp>/end/<end-timestamp>`

Export recordings from `start-timestamp` to `end-timestamp` for `camera` as a single mp4 file. These recordings will be exported to the `/media/frigate/exports` folder.

It is also possible to export this recording as a time-lapse.

**Optional Body:**

```json
{
  "playback": "realtime" // playback factor: realtime or timelapse_25x
}
```

### `DELETE /api/export/<export_name>`

Delete an export from disk.

### `PATCH /api/export/<export_name_current>/<export_name_new>`

Renames an export.

### `GET /api/<camera_name>/recordings/summary`

Hourly summary of recordings data for a camera.

### `GET /api/<camera_name>/recordings`

Get recording segment details for the given timestamp range.

| param    | Type | Description                           |
| -------- | ---- | ------------------------------------- |
| `after`  | int  | Unix timestamp for beginning of range |
| `before` | int  | Unix timestamp for end of range       |

### `GET /api/<camera_name>/recordings/<frame_time>/snapshot.png`

Returns the snapshot image from the specific point in that cameras recordings.

## Reviews

### `GET /api/review`

Reviews from the database. Accepts the following query string parameters:

| param      | Type | Description                                                    |
| ---------- | ---- | -------------------------------------------------------------- |
| `before`   | int  | Epoch time                                                     |
| `after`    | int  | Epoch time                                                     |
| `cameras`  | str  | , separated list of cameras                                    |
| `labels`   | str  | , separated list of labels                                     |
| `zones`    | str  | , separated list of zones                                      |
| `reviewed` | int  | Include items that have been reviewed (0 or 1)                 |
| `limit`    | int  | Limit the number of events returned                            |
| `severity` | str  | Limit items to severity (alert, detection, significant_motion) |

### `GET /api/review/<id>`

Get review with `id` from the database.

### `GET /api/review/summary`

Summary of reviews for the last 30 days. Accepts the following query string parameters:

| param      | Type | Description                 |
| ---------- | ---- | --------------------------- |
| `cameras`  | str  | , separated list of cameras |
| `labels`   | str  | , separated list of labels  |
| `timezone` | str  | Timezone name               |

### `POST /api/reviews/viewed`

Mark item(s) as reviewed.

**Required Body:**

```json
{
  "ids": ["123", "456"] // , separated list of review IDs
}
```

### `DELETE /api/review/<id>/viewed`

Mark an item as not reviewed.

### `POST /api/reviews/delete`

Delete review items.

**Required Body:**

```json
{
  "ids": ["123", "456"] // , separated list of review IDs
}
```

### `GET /review/activity/motion`

Get the motion activity for camera(s) during a specified time period.

| param     | Type | Description                 |
| --------- | ---- | --------------------------- |
| `before`  | int  | Epoch time                  |
| `after`   | int  | Epoch time                  |
| `cameras` | str  | , separated list of cameras |

### `GET /review/activity/audio`

Get the audio activity for camera(s) during a specified time period.

| param     | Type | Description                 |
| --------- | ---- | --------------------------- |
| `before`  | int  | Epoch time                  |
| `after`   | int  | Epoch time                  |
| `cameras` | str  | , separated list of cameras |

## Timeline

### `GET /api/timeline`

Timeline of key moments of an event(s) from the database. Accepts the following query string parameters:

| param       | Type | Description                         |
| ----------- | ---- | ----------------------------------- |
| `camera`    | str  | Name of camera                      |
| `source_id` | str  | ID of tracked object                |
| `limit`     | int  | Limit the number of events returned |
