# Birdseye

Birdseye allows a heads-up view of your cameras to see what is going on around your property / space without having to watch all cameras that may have nothing happening. Birdseye allows specific modes that intelligently show and disappear based on what you care about. 

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
