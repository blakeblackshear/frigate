---
id: zones
title: Zones
---

Zones allow you to define a specific area of the frame and apply additional filters for object types so you can determine whether or not an object is within a particular area. Presence in a zone is evaluated based on the bottom center of the bounding box for the object. It does not matter how much of the bounding box overlaps with the zone.

For example, the cat in this image is currently in Zone 1, but **not** Zone 2.
![bottom center](/img/bottom-center.jpg)

Zones cannot have the same name as a camera. If desired, a single zone can include multiple cameras if you have multiple cameras covering the same area by configuring zones with the same name for each camera.

During testing, enable the Zones option for the debug feed so you can adjust as needed. The zone line will increase in thickness when any object enters the zone.

To create a zone, follow [the steps for a "Motion mask"](masks.md), but use the section of the web UI for creating a zone instead.

### Restricting events to specific zones

Often you will only want events to be created when an object enters areas of interest. This is done using zones along with setting required_zones. Let's say you only want to be notified when an object enters your entire_yard zone, the config would be:

```yaml
camera:
  record:
    events:
      required_zones:
        - entire_yard
  snapshots:
    required_zones:
      - entire_yard
  zones:
    entire_yard:
      coordinates: ...
```

### Restricting zones to specific objects

Sometimes you want to limit a zone to specific object types to have more granular control of when events/snapshots are saved. The following example will limit one zone to person objects and the other to cars.

```yaml
camera:
  record:
    events:
      required_zones:
        - entire_yard
        - front_yard_street
  snapshots:
    required_zones:
      - entire_yard
      - front_yard_street
  zones:
    entire_yard:
      coordinates: ... (everywhere you want a person)
      objects:
        - person
    front_yard_street:
      coordinates: ... (just the street)
      objects:
        - car
```

Only car objects can trigger the `front_yard_street` zone and only person can trigger the `entire_yard`. You will get events for person objects that enter anywhere in the yard, and events for cars only if they enter the street.

### Zone Inertia

Sometimes an objects bounding box may be slightly incorrect and the bottom center of the bounding box is inside the zone while the object is not actually in the zone. Zone inertia helps guard against this by requiring an object's bounding box to be within the zone for multiple consecutive frames. This value can be configured:

```yaml
camera:
  zones:
    front_yard:
      inertia: 3
      objects:
        - person
```

There may also be cases where you expect an object to quickly enter and exit a zone, like when a car is pulling into the driveway, and you may want to have the object be considered present in the zone immediately:

```yaml
camera:
  zones:
    driveway_entrance:
      inertia: 1
      objects:
        - car
```
