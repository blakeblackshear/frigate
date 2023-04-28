---
id: stationary_objects
title: Avoiding stationary objects
---

Many people use Frigate to detect cars entering their driveway, and they often run into an issue with repeated notifications or events of a parked car being repeatedly detected over the course of multiple days (for example if the car is lost at night and detected again the following morning).

You can use zones to restrict events and notifications to objects that have entered specific areas.

:::caution

It is not recommended to use masks to try and eliminate parked cars in your driveway. Masks are designed to prevent motion from triggering object detection and/or to indicate areas that are guaranteed false positives.

Frigate is designed to track objects as they move and over-masking can prevent it from knowing that an object in the current frame is the same as the previous frame. You want Frigate to detect objects everywhere and configure your events and alerts to be based on the location of the object with zones.

:::

:::info

Once a vehicle crosses the entrance into the parking area, that event will stay `In Progress` until it is no longer seen in the frame. Frigate is designed to have an event last as long as an object is visible in the frame, an event being `In Progress` does not mean the event is being constantly recorded. You can define the recording behavior by adjusting the [recording retention settings](../configuration/record.md).

:::

To only be notified of cars that enter your driveway from the street, you could create multiple zones that cover your driveway. For cars, you would only notify if `entered_zones` from the events MQTT topic has more than 1 zone.

See [this example](../configuration/zones.md#restricting-zones-to-specific-objects) from the Zones documentation to see how to restrict zones to certain object types.

![Driveway Zones](/img/driveway_zones-min.png)

To limit snapshots and events, you can list the zone for the entrance of your driveway under `required_zones` in your configuration file. Example below.

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
