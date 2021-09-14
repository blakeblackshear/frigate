---
id: stationary_objects
title: Avoiding stationary objects
---

Many people use Frigate to detect cars entering their driveway, and they often run into an issue with repeated events of a parked car being repeatedly detected. This is because object tracking stops when motion ends and the event ends. Motion detection works by determining if a sufficient number of pixels have changed between frames. Shadows or other lighting changes will be detected as motion. This will often cause a new event for a parked car.

You can use zones to restrict events and notifications to objects that have entered specific areas.

:::caution

It is not recommended to use masks to try and eliminate parked cars in your driveway. Masks are designed to prevent motion from triggering object detection and/or to indicate areas that are guaranteed false positives.

Frigate is designed to track objects as they move and over-masking can prevent it from knowing that an object in the current frame is the same as the previous frame. You want Frigate to detect objects everywhere and configure your events and alerts to be based on the location of the object with zones.

:::

For example, you could create multiple zones that cover your driveway. For cars, you would only notify if entered_zones has more than 1 zone. For person, you would notify regardless of the number of entered_zones.

See [this example](/configuration/zones#restricting-zones-to-specific-objects) from the Zones documentation.

You can also create a zone for the entrance of your driveway and only save an event if that zone is in the list of entered_zones when the object is a car.

![Driveway Zones](/img/driveway_zones.png)

```yaml
camera:
  record:
    events:
      required_zones:
        - zone_2
  zones:
    zone_1:
      coordinates: ... (parking area)
    zone_2:
      coordinates: ... (entrance to driveway)
```
