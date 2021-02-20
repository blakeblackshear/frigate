---
id: api
title: HTTP API
---

A web server is available on port 5000 with the following endpoints.

### `/api/<camera_name>`

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

You can access a higher resolution mjpeg stream by appending `h=height-in-pixels` to the endpoint. For example `http://localhost:5000/back?h=1080`. You can also increase the FPS by appending `fps=frame-rate` to the URL such as `http://localhost:5000/back?fps=10` or both with `?fps=10&h=1000`.

### `/api/<camera_name>/<object_name>/best.jpg[?h=300&crop=1]`

The best snapshot for any object type. It is a full resolution image by default.

Example parameters:

- `h=300`: resizes the image to 300 pixes tall
- `crop=1`: crops the image to the region of the detection rather than returning the entire image

### `/api/<camera_name>/latest.jpg[?h=300]`

The most recent frame that frigate has finished processing. It is a full resolution image by default.

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

Example parameters:

- `h=300`: resizes the image to 300 pixes tall

### `/api/stats`

Contains some granular debug info that can be used for sensors in HomeAssistant.

Sample response:

```json
{
  /* Per Camera Stats */
  "back": {
    /***************
     * Frames per second being consumed from your camera. If this is higher
     * than it is supposed to be, you should set -r FPS in your input_args.
     * camera_fps = process_fps + skipped_fps
     ***************/
    "camera_fps": 5.0,
    /***************
     * Number of times detection is run per second. This can be higher than
     * your camera FPS because frigate often looks at the same frame multiple times
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
     * Frames per second being processed by frigate.
     ***************/
    "process_fps": 5.1,
    /***************
     * Frames per second skip for processing by frigate.
     ***************/
    "skipped_fps": 0.0
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
    "version": "0.8.0-8883709",
    /* Storage data in MB for important locations */
    "storage": {
      "/media/frigate/clips": {
        "total": 1000,
        "used": 700,
        "free": 300,
        "mnt_type": "ext4",
      },
      "/media/frigate/recordings": {
        "total": 1000,
        "used": 700,
        "free": 300,
        "mnt_type": "ext4",
      },
      "/tmp/cache": {
        "total": 256,
        "used": 100,
        "free": 156,
        "mnt_type": "tmpfs",
      },
      "/dev/shm": {
        "total": 256,
        "used": 100,
        "free": 156,
        "mnt_type": "tmpfs",
      },
    }
  }
}
```

### `/api/config`

A json representation of your configuration

### `/api/version`

Version info

### `/api/events`

Events from the database. Accepts the following query string parameters:

| param                | Type | Description                                   |
| -------------------- | ---- | --------------------------------------------- |
| `before`             | int  | Epoch time                                    |
| `after`              | int  | Epoch time                                    |
| `camera`             | str  | Camera name                                   |
| `label`              | str  | Label name                                    |
| `zone`               | str  | Zone name                                     |
| `limit`              | int  | Limit the number of events returned           |
| `has_snapshot`       | int  | Filter to events that have snapshots (0 or 1) |
| `has_clip`           | int  | Filter to events that have clips (0 or 1)     |
| `include_thumbnails` | int  | Include thumbnails in the response (0 or 1)   |

### `/api/events/summary`

Returns summary data for events in the database. Used by the HomeAssistant integration.

### `/api/events/<id>`

Returns data for a single event.

### `/api/events/<id>/thumbnail.jpg`

Returns a thumbnail for the event id optimized for notifications. Works while the event is in progress and after completion. Passing `?format=android` will convert the thumbnail to 2:1 aspect ratio.

### `/api/events/<id>/snapshot.jpg`

Returns the snapshot image for the event id. Works while the event is in progress and after completion.

Accepts the following query string parameters, but they are only applied when an event is in progress. After the event is completed, the saved snapshot is returned from disk without modification:

| param       | Type | Description                                       |
| ----------- | ---- | ------------------------------------------------- |
| `h`         | int  | Height in pixels                                  |
| `bbox`      | int  | Show bounding boxes for detected objects (0 or 1) |
| `timestamp` | int  | Print the timestamp in the upper left (0 or 1)    |
| `crop`      | int  | Crop the snapshot to the (0 or 1)                 |

### `/clips/<camera>-<id>.mp4`

Video clip for the given camera and event id.

### `/clips/<camera>-<id>.jpg`

JPG snapshot for the given camera and event id.
