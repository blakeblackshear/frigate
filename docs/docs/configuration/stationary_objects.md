# Stationary Objects

An object is considered stationary when it is being tracked and has been in a very similar position for a certain number of frames. This number is defined in the configuration under `detect -> stationary -> threshold`, and is 10x the frame rate (or 10 seconds) by default. Once an object is considered stationary, it will remain stationary until motion occurs near the object at which point it will be considered active.

## Why does it matter if an object is stationary?

Once an object becomes stationary, object detection will not be continually run on that object. This serves to reduce resource usage and redundant detections when there has been no motion near the tracked object. This also means that Frigate is contextually aware, and can for example [filter out recording segments](record.md#what-do-the-different-retain-modes-mean) to only when the object is considered active.

## Tuning stationary behavior

The default config is:

```yaml
detect:
  stationary:
    interval: 0
    threshold: 50
```

`interval` is defined as the frequency for running detection on stationary objects. This means that by default once an object is considered stationary, detection will not be run on it until motion is detected. With `interval > 0`, every nth frames detection will be run to make sure the object is still there.

NOTE: There is no way to disable stationary object tracking with this value.

`threshold` is the number of frames an object needs to remain relatively still before it is considered stationary.

## Avoiding stationary objects

In some cases, like a driveway, you may prefer to only have an event when a car is coming & going vs a constant event of it stationary in the driveway. [This docs sections](../guides/stationary_objects.md) explains how to approach that scenario.
