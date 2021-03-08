---
id: advanced
title: Advanced
sidebar_label: Advanced
---

## Advanced configuration

### `motion`

Global motion detection config. These may also be defined at the camera level.

```yaml
motion:
  # Optional: The threshold passed to cv2.threshold to determine if a pixel is different enough to be counted as motion. (default: shown below)
  # Increasing this value will make motion detection less sensitive and decreasing it will make motion detection more sensitive.
  # The value should be between 1 and 255.
  threshold: 25
  # Optional: Minimum size in pixels in the resized motion image that counts as motion
  # Increasing this value will prevent smaller areas of motion from being detected. Decreasing will make motion detection more sensitive to smaller
  # moving objects.
  contour_area: 100
  # Optional: Alpha value passed to cv2.accumulateWeighted when averaging the motion delta across multiple frames (default: shown below)
  # Higher values mean the current frame impacts the delta a lot, and a single raindrop may register as motion.
  # Too low and a fast moving person wont be detected as motion.
  delta_alpha: 0.2
  # Optional: Alpha value passed to cv2.accumulateWeighted when averaging frames to determine the background (default: shown below)
  # Higher values mean the current frame impacts the average a lot, and a new object will be averaged into the background faster.
  # Low values will cause things like moving shadows to be detected as motion for longer.
  # https://www.geeksforgeeks.org/background-subtraction-in-an-image-using-concept-of-running-average/
  frame_alpha: 0.2
  # Optional: Height of the resized motion frame  (default: 1/6th of the original frame height)
  # This operates as an efficient blur alternative. Higher values will result in more granular motion detection at the expense of higher CPU usage.
  # Lower values result in less CPU, but small changes may not register as motion.
  frame_height: 180
```

### `detect`

Global object detection settings. These may also be defined at the camera level.

```yaml
detect:
  # Optional: Number of frames without a detection before frigate considers an object to be gone. (default: 5x the frame rate)
  max_disappeared: 25
```

### `logger`

Change the default log level for troubleshooting purposes.

```yaml
logger:
  # Optional: default log level (default: shown below)
  default: info
  # Optional: module by module log level configuration
  logs:
    frigate.mqtt: error
```

Available log levels are: `debug`, `info`, `warning`, `error`, `critical`

Examples of available modules are:

- `frigate.app`
- `frigate.mqtt`
- `frigate.edgetpu`
- `frigate.zeroconf`
- `detector.<detector_name>`
- `watchdog.<camera_name>`
- `ffmpeg.<camera_name>.<sorted_roles>` NOTE: All FFmpeg logs are sent as `error` level.

### `environment_vars`

This section can be used to set environment variables for those unable to modify the environment of the container (ie. within Hass.io)

```yaml
environment_vars:
  EXAMPLE_VAR: value
```

### `database`

Event and clip information is managed in a sqlite database at `/media/frigate/clips/frigate.db`. If that database is deleted, clips will be orphaned and will need to be cleaned up manually. They also won't show up in the Media Browser within HomeAssistant.

If you are storing your clips on a network share (SMB, NFS, etc), you may get a `database is locked` error message on startup. You can customize the location of the database in the config if necessary.

This may need to be in a custom location if network storage is used for clips.

```yaml
database:
  path: /media/frigate/clips/frigate.db
```

### `detectors`

```yaml
detectors:
  # Required: name of the detector
  coral:
    # Required: type of the detector
    # Valid values are 'edgetpu' (requires device property below) and 'cpu'. type: edgetpu
    # Optional: device name as defined here: https://coral.ai/docs/edgetpu/multiple-edgetpu/#using-the-tensorflow-lite-python-api
    device: usb
    # Optional: num_threads value passed to the tflite.Interpreter (default: shown below)
    # This value is only used for CPU types
    num_threads: 3
```

### `model`

```yaml
model:
  # Required: height of the trained model
  height: 320
  # Required: width of the trained model
  width: 320
```
