---
id: parked_cars
title: Handling parked cars
---

:::tip

This is an area targeted for improvement in future releases.

:::

Many people use Frigate to detect cars entering their driveway, and they often run into an issue with repeated events of parked cars and/or long running events after the car parks. This can cause Frigate to store more video than desired.

:::caution

It is not recommended to use motion masks to try and eliminate parked cars in your driveway. Motion masks are designed to prevent motion from triggering object detection and will not prevent objects from being detected in the area if motion is detected outside of the motion mask.

:::

## Repeated events of parked cars

To only be notified of cars that enter your driveway from the street, you can create multiple zones that cover your driveway. For cars, you would only notify if `entered_zones` from the events MQTT topic has contains the entrance zone.

See [this example](../configuration/zones.md#restricting-zones-to-specific-objects) from the Zones documentation to see how to restrict zones to certain object types.

![Driveway Zones](/img/driveway_zones-min.png)

To limit snapshots and events, you can list the zone for the entrance of your driveway under `required_zones` in your configuration file.

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

This will only save events if the car entered the entrance zone at any point.

## Long running events

There are a few recommended approaches to avoid excessive storage use due to parked cars. These can be used in combination.

### 1. Use `motion` or `active_objects` mode for event recordings

Leverages [recording settings](../configuration/record.md#what-do-the-different-retain-modes-mean) to avoid excess storage use.

#### Advantages of this approach

For users using `motion` mode for continuous recording, this successfully avoids extra video from being stored for cars parked in view because all motion video is already being saved.

#### Limitations of this approach

For users that only want to record motion during events, long running events will result in all motion being stored as long as the car is in view. You can mitigate this further by using the `active_objects` mode for event recordings, but that may result less video being retained than is desired.

### 2. Use an object mask to prevent detections in the parking zone

Leverages [object filter masks](../configuration/masks.md#object-filter-masks) to prevent detections of cars parked in the driveway.

#### Advantages of this approach

Using this approach, you will get two separate events for when a car enters the driveway, parks in the parking zone, and then later leaves the zone. Using an object mask will ensure that cars parked in the parking zone are not detected and confused with cars driving by on the street as well.

#### Limitations of this approach

This approach will only work for cars that park in the parking zone. Cars that park in other areas will still be tracked as long as they are in view. This will also prevent zone sensors from telling you if a car is parked in the parking zone from working.
