---
id: cameras
title: Cameras
---

## Setting Up Camera Inputs

Up to 4 inputs can be configured for each camera and the role of each input can be mixed and matched based on your needs. This allows you to use a lower resolution stream for object detection, but create clips from a higher resolution stream, or vice versa.

Each role can only be assigned to one input per camera. The options for roles are as follows:

| Role     | Description                                                                          |
| -------- | ------------------------------------------------------------------------------------ |
| `detect` | Main feed for object detection                                                       |
| `clips`  | Clips of events from objects detected in the `detect` feed. [docs](#recording-clips) |
| `record` | Saves 60 second segments of the video feed. [docs](#247-recordings)                  |
| `rtmp`   | Broadcast as an RTMP feed for other services to consume. [docs](#rtmp-streams)       |

### Example

```yaml
mqtt:
  host: mqtt.server.com
cameras:
  back:
    ffmpeg:
      inputs:
        - path: rtsp://viewer:{FRIGATE_RTSP_PASSWORD}@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
          roles:
            - detect
            - rtmp
        - path: rtsp://viewer:{FRIGATE_RTSP_PASSWORD}@10.0.10.10:554/live
          roles:
            - clips
            - record
    width: 1280
    height: 720
    fps: 5
```

## Masks & Zones

### Masks

Masks are used to ignore initial detection in areas of your camera's field of view.

There are two types of masks available:

- **Motion masks**: Motion masks are used to prevent unwanted types of motion from triggering detection. Try watching the video feed with `Motion Boxes` enabled to see what may be regularly detected as motion. For example, you want to mask out your timestamp, the sky, rooftops, etc. Keep in mind that this mask only prevents motion from being detected and does not prevent objects from being detected if object detection was started due to motion in unmasked areas. Motion is also used during object tracking to refine the object detection area in the next frame. Over masking will make it more difficult for objects to be tracked. To see this effect, create a mask, and then watch the video feed with `Motion Boxes` enabled again.
- **Object filter masks**: Object filter masks are used to filter out false positives for a given object type. These should be used to filter any areas where it is not possible for an object of that type to be. The bottom center of the detected object's bounding box is evaluated against the mask. If it is in a masked area, it is assumed to be a false positive. For example, you may want to mask out rooftops, walls, the sky, treetops for people. For cars, masking locations other than the street or your driveway will tell frigate that anything in your yard is a false positive.

To create a poly mask:

1. Visit the [web UI](/usage/web)
1. Click the camera you wish to create a mask for
1. Click "Mask & Zone creator"
1. Click "Add" on the type of mask or zone you would like to create
1. Click on the camera's latest image to create a masked area. The yaml representation will be updated in real-time
1. When you've finished creating your mask, click "Copy" and paste the contents into your `config.yaml` file and restart Frigate

Example of a finished row corresponding to the below example image:

```yaml
motion:
  mask: '0,461,3,0,1919,0,1919,843,1699,492,1344,458,1346,336,973,317,869,375,866,432'
```

![poly](/img/example-mask-poly.png)

```yaml
# Optional: camera level motion config
motion:
  # Optional: motion mask
  # NOTE: see docs for more detailed info on creating masks
  mask: 0,900,1080,900,1080,1920,0,1920
```

### Zones

Zones allow you to define a specific area of the frame and apply additional filters for object types so you can determine whether or not an object is within a particular area. Zones cannot have the same name as a camera. If desired, a single zone can include multiple cameras if you have multiple cameras covering the same area by configuring zones with the same name for each camera.

During testing, `draw_zones` should be set in the config to draw the zone on the frames so you can adjust as needed. The zone line will increase in thickness when any object enters the zone.

To create a zone, follow the same steps above for a "Motion mask", but use the section of the web UI for creating a zone instead.

```yaml
# Optional: zones for this camera
zones:
  # Required: name of the zone
  # NOTE: This must be different than any camera names, but can match with another zone on another
  #       camera.
  front_steps:
    # Required: List of x,y coordinates to define the polygon of the zone.
    # NOTE: Coordinates can be generated at https://www.image-map.net/
    coordinates: 545,1077,747,939,788,805
    # Optional: Zone level object filters.
    # NOTE: The global and camera filters are applied upstream.
    filters:
      person:
        min_area: 5000
        max_area: 100000
        threshold: 0.7
```

## Objects

For a list of available objects, see the [objects documentation](./objects.mdx).

```yaml
# Optional: Camera level object filters config.
objects:
  track:
    - person
    - car
  # Optional: mask to prevent all object types from being detected in certain areas (default: no mask)
  # Checks based on the bottom center of the bounding box of the object.
  # NOTE: This mask is COMBINED with the object type specific mask below
  mask: 0,0,1000,0,1000,200,0,200
  filters:
    person:
      min_area: 5000
      max_area: 100000
      min_score: 0.5
      threshold: 0.7
      # Optional: mask to prevent this object type from being detected in certain areas (default: no mask)
      # Checks based on the bottom center of the bounding box of the object
      mask: 0,0,1000,0,1000,200,0,200
```

## Clips

Frigate can save video clips without any CPU overhead for encoding by simply copying the stream directly with FFmpeg. It leverages FFmpeg's segment functionality to maintain a cache of video for each camera. The cache files are written to disk at `/tmp/cache` and do not introduce memory overhead. When an object is being tracked, it will extend the cache to ensure it can assemble a clip when the event ends. Once the event ends, it again uses FFmpeg to assemble a clip by combining the video clips without any encoding by the CPU. Assembled clips are are saved to `/media/frigate/clips`. Clips are retained according to the retention settings defined on the config for each object type.

These clips will not be playable in the web UI or in HomeAssistant's media browser unless your camera sends video as h264.

:::caution
Previous versions of frigate included `-vsync drop` in input parameters. This is not compatible with FFmpeg's segment feature and must be removed from your input parameters if you have overrides set.
:::

```yaml
clips:
  # Required: enables clips for the camera (default: shown below)
  # This value can be set via MQTT and will be updated in startup based on retained value
  enabled: False
  # Optional: Number of seconds before the event to include in the clips (default: shown below)
  pre_capture: 5
  # Optional: Number of seconds after the event to include in the clips (default: shown below)
  post_capture: 5
  # Optional: Objects to save clips for. (default: all tracked objects)
  objects:
    - person
  # Optional: Restrict clips to objects that entered any of the listed zones (default: no required zones)
  required_zones: []
  # Optional: Camera override for retention settings (default: global values)
  retain:
    # Required: Default retention days (default: shown below)
    default: 10
    # Optional: Per object retention days
    objects:
      person: 15
```

## Snapshots

Frigate can save a snapshot image to `/media/frigate/clips` for each event named as `<camera>-<id>.jpg`.

```yaml
# Optional: Configuration for the jpg snapshots written to the clips directory for each event
snapshots:
  # Optional: Enable writing jpg snapshot to /media/frigate/clips (default: shown below)
  # This value can be set via MQTT and will be updated in startup based on retained value
  enabled: False
  # Optional: print a timestamp on the snapshots (default: shown below)
  timestamp: False
  # Optional: draw bounding box on the snapshots (default: shown below)
  bounding_box: False
  # Optional: crop the snapshot (default: shown below)
  crop: False
  # Optional: height to resize the snapshot to (default: original size)
  height: 175
  # Optional: Restrict snapshots to objects that entered any of the listed zones (default: no required zones)
  required_zones: []
  # Optional: Camera override for retention settings (default: global values)
  retain:
    # Required: Default retention days (default: shown below)
    default: 10
    # Optional: Per object retention days
    objects:
      person: 15
```

## 24/7 Recordings

24/7 recordings can be enabled and are stored at `/media/frigate/recordings`. The folder structure for the recordings is `YYYY-MM/DD/HH/<camera_name>/MM.SS.mp4`. These recordings are written directly from your camera stream without re-encoding and are available in HomeAssistant's media browser. Each camera supports a configurable retention policy in the config.

:::caution
Previous versions of frigate included `-vsync drop` in input parameters. This is not compatible with FFmpeg's segment feature and must be removed from your input parameters if you have overrides set.
:::

```yaml
# Optional: 24/7 recording configuration
record:
  # Optional: Enable recording (default: global setting)
  enabled: False
  # Optional: Number of days to retain (default: global setting)
  retain_days: 30
```

## RTMP streams

Frigate can re-stream your video feed as a RTMP feed for other applications such as HomeAssistant to utilize it at `rtmp://<frigate_host>/live/<camera_name>`. Port 1935 must be open. This allows you to use a video feed for detection in frigate and HomeAssistant live view at the same time without having to make two separate connections to the camera. The video feed is copied from the original video feed directly to avoid re-encoding. This feed does not include any annotation by Frigate.

Some video feeds are not compatible with RTMP. If you are experiencing issues, check to make sure your camera feed is h264 with AAC audio. If your camera doesn't support a compatible format for RTMP, you can use the ffmpeg args to re-encode it on the fly at the expense of increased CPU utilization.

## Full example

The following is a full example of all of the options together for a camera configuration

```yaml
cameras:
  # Required: name of the camera
  back:
    # Required: ffmpeg settings for the camera
    ffmpeg:
      # Required: A list of input streams for the camera. See documentation for more information.
      inputs:
        # Required: the path to the stream
        # NOTE: Environment variables that begin with 'FRIGATE_' may be referenced in {}
        - path: rtsp://viewer:{FRIGATE_RTSP_PASSWORD}@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
          # Required: list of roles for this stream. valid values are: detect,record,clips,rtmp
          # NOTICE: In addition to assigning the record, clips, and rtmp roles,
          # they must also be enabled in the camera config.
          roles:
            - detect
            - rtmp
          # Optional: stream specific global args (default: inherit)
          global_args:
          # Optional: stream specific hwaccel args (default: inherit)
          hwaccel_args:
          # Optional: stream specific input args (default: inherit)
          input_args:
      # Optional: camera specific global args (default: inherit)
      global_args:
      # Optional: camera specific hwaccel args (default: inherit)
      hwaccel_args:
      # Optional: camera specific input args (default: inherit)
      input_args:
      # Optional: camera specific output args (default: inherit)
      output_args:

    # Required: width of the frame for the input with the detect role
    width: 1280
    # Required: height of the frame for the input with the detect role
    height: 720
    # Optional: desired fps for your camera for the input with the detect role
    # NOTE: Recommended value of 5. Ideally, try and reduce your FPS on the camera.
    #       Frigate will attempt to autodetect if not specified.
    fps: 5

    # Optional: camera level motion config
    motion:
      # Optional: motion mask
      # NOTE: see docs for more detailed info on creating masks
      mask: 0,900,1080,900,1080,1920,0,1920

    # Optional: timeout for highest scoring image before allowing it
    # to be replaced by a newer image. (default: shown below)
    best_image_timeout: 60

    # Optional: zones for this camera
    zones:
      # Required: name of the zone
      # NOTE: This must be different than any camera names, but can match with another zone on another
      #       camera.
      front_steps:
        # Required: List of x,y coordinates to define the polygon of the zone.
        # NOTE: Coordinates can be generated at https://www.image-map.net/
        coordinates: 545,1077,747,939,788,805
        # Optional: Zone level object filters.
        # NOTE: The global and camera filters are applied upstream.
        filters:
          person:
            min_area: 5000
            max_area: 100000
            threshold: 0.7

    # Optional: Camera level detect settings
    detect:
      # Optional: enables detection for the camera (default: True)
      # This value can be set via MQTT and will be updated in startup based on retained value
      enabled: True
      # Optional: Number of frames without a detection before frigate considers an object to be gone. (default: 5x the frame rate)
      max_disappeared: 25

    # Optional: save clips configuration
    clips:
      # Required: enables clips for the camera (default: shown below)
      # This value can be set via MQTT and will be updated in startup based on retained value
      enabled: False
      # Optional: Number of seconds before the event to include in the clips (default: shown below)
      pre_capture: 5
      # Optional: Number of seconds after the event to include in the clips (default: shown below)
      post_capture: 5
      # Optional: Objects to save clips for. (default: all tracked objects)
      objects:
        - person
      # Optional: Restrict clips to objects that entered any of the listed zones (default: no required zones)
      required_zones: []
      # Optional: Camera override for retention settings (default: global values)
      retain:
        # Required: Default retention days (default: shown below)
        default: 10
        # Optional: Per object retention days
        objects:
          person: 15

    # Optional: 24/7 recording configuration
    record:
      # Optional: Enable recording (default: global setting)
      enabled: False
      # Optional: Number of days to retain (default: global setting)
      retain_days: 30

    # Optional: RTMP re-stream configuration
    rtmp:
      # Required: Enable the live stream (default: True)
      enabled: True

    # Optional: Configuration for the jpg snapshots written to the clips directory for each event
    snapshots:
      # Optional: Enable writing jpg snapshot to /media/frigate/clips (default: shown below)
      # This value can be set via MQTT and will be updated in startup based on retained value
      enabled: False
      # Optional: print a timestamp on the snapshots (default: shown below)
      timestamp: False
      # Optional: draw bounding box on the snapshots (default: shown below)
      bounding_box: False
      # Optional: crop the snapshot (default: shown below)
      crop: False
      # Optional: height to resize the snapshot to (default: original size)
      height: 175
      # Optional: Restrict snapshots to objects that entered any of the listed zones (default: no required zones)
      required_zones: []
      # Optional: Camera override for retention settings (default: global values)
      retain:
        # Required: Default retention days (default: shown below)
        default: 10
        # Optional: Per object retention days
        objects:
          person: 15

    # Optional: Configuration for the jpg snapshots published via MQTT
    mqtt:
      # Optional: Enable publishing snapshot via mqtt for camera (default: shown below)
      # NOTE: Only applies to publishing image data to MQTT via 'frigate/<camera_name>/<object_name>/snapshot'.
      # All other messages will still be published.
      enabled: True
      # Optional: print a timestamp on the snapshots (default: shown below)
      timestamp: True
      # Optional: draw bounding box on the snapshots (default: shown below)
      bounding_box: True
      # Optional: crop the snapshot (default: shown below)
      crop: True
      # Optional: height to resize the snapshot to (default: shown below)
      height: 270
      # Optional: Restrict mqtt messages to objects that entered any of the listed zones (default: no required zones)
      required_zones: []

    # Optional: Camera level object filters config.
    objects:
      track:
        - person
        - car
      # Optional: mask to prevent all object types from being detected in certain areas (default: no mask)
      # Checks based on the bottom center of the bounding box of the object.
      # NOTE: This mask is COMBINED with the object type specific mask below
      mask: 0,0,1000,0,1000,200,0,200
      filters:
        person:
          min_area: 5000
          max_area: 100000
          min_score: 0.5
          threshold: 0.7
          # Optional: mask to prevent this object type from being detected in certain areas (default: no mask)
          # Checks based on the bottom center of the bounding box of the object
          mask: 0,0,1000,0,1000,200,0,200
```

## Camera specific configuration

### RTMP Cameras

The input parameters need to be adjusted for RTMP cameras

```yaml
ffmpeg:
  input_args:
    - -avoid_negative_ts
    - make_zero
    - -fflags
    - nobuffer
    - -flags
    - low_delay
    - -strict
    - experimental
    - -fflags
    - +genpts+discardcorrupt
    - -use_wallclock_as_timestamps
    - '1'
```

### Reolink 410/520 (possibly others)

Several users have reported success with the rtmp video from Reolink cameras.

```yaml
ffmpeg:
  input_args:
    - -avoid_negative_ts
    - make_zero
    - -fflags
    - nobuffer
    - -flags
    - low_delay
    - -strict
    - experimental
    - -fflags
    - +genpts+discardcorrupt
    - -rw_timeout
    - '5000000'
    - -use_wallclock_as_timestamps
    - '1'
```

### Blue Iris RTSP Cameras

You will need to remove `nobuffer` flag for Blue Iris RTSP cameras

```yaml
ffmpeg:
  input_args:
    - -avoid_negative_ts
    - make_zero
    - -flags
    - low_delay
    - -strict
    - experimental
    - -fflags
    - +genpts+discardcorrupt
    - -rtsp_transport
    - tcp
    - -stimeout
    - '5000000'
    - -use_wallclock_as_timestamps
    - '1'
```
