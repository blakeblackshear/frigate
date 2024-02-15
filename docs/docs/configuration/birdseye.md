# Birdseye

Birdseye allows a heads-up view of your cameras to see what is going on around your property / space without having to watch all cameras that may have nothing happening. Birdseye allows specific modes that intelligently show and disappear based on what you care about.

## Birdseye Behavior

### Birdseye Modes

Birdseye offers different modes to customize which cameras show under which circumstances.
 - **continuous:** All cameras are always included
 - **motion:** Cameras that have detected motion within the last 30 seconds are included
 - **objects:** Cameras that have tracked an active object within the last 30 seconds are included

### Custom Birdseye Icon

A custom icon can be added to the birdseye background by providing a 180x180 image named `custom.png` inside of the Frigate `media` folder. The file must be a png with the icon as transparent, any non-transparent pixels will be white when displayed in the birdseye view.

### Birdseye view override at camera level

If you want to include a camera in Birdseye view only for specific circumstances, or just don't include it at all, the Birdseye setting can be set at the camera level.

```yaml
# Include all cameras by default in Birdseye view
birdseye:
  enabled: True
  mode: continuous

cameras:
  front:
    # Only include the "front" camera in Birdseye view when objects are detected
    birdseye:
      mode: objects
  back:
    # Exclude the "back" camera from Birdseye view
    birdseye:
      enabled: False
```

### Birdseye Inactivity

By default birdseye shows all cameras that have had the configured activity in the last 30 seconds, this can be configured:

```yaml
birdseye:
  enabled: True
  inactivity_threshold: 15
```

## Birdseye Layout

### Birdseye Dimensions

The resolution and aspect ratio of birdseye can be configured. Resolution will increase the quality but does not affect the layout. Changing the aspect ratio of birdseye does affect how cameras are laid out.

```yaml
birdseye:
  enabled: True
  width: 1280
  height: 720
```

### Sorting cameras in the Birdseye view

It is possible to override the order of cameras that are being shown in the Birdseye view.
The order needs to be set at the camera level.

```yaml
# Include all cameras by default in Birdseye view
birdseye:
  enabled: True
  mode: continuous

cameras:
  front:
    birdseye:
      order: 1
  back:
    birdseye:
      order: 2
```

*Note*: Cameras are sorted by default using their name to ensure a constant view inside Birdseye.

### Birdseye Cameras

It is possible to limit the number of cameras shown on birdseye at one time. When this is enabled, birdseye will show the cameras with most recent activity. There is a cooldown to ensure that cameras do not switch too frequently.

For example, this can be configured to only show the most recently active camera.

```yaml
birdseye:
  enabled: True
  layout:
    max_cameras: 1
```

### Birdseye Scaling

By default birdseye tries to fit 2 cameras in each row and then double in size until a suitable layout is found. The scaling can be configured with a value between 1.0 and 5.0 depending on use case.

```yaml
birdseye:
  enabled: True
  layout:
    scaling_factor: 3.0
```
