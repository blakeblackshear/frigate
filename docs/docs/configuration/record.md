---
id: record
title: Recording
---

Recordings can be enabled and are stored at `/media/frigate/recordings`. The folder structure for the recordings is `YYYY-MM-DD/HH/<camera_name>/MM.SS.mp4`. These recordings are written directly from your camera stream without re-encoding. Each camera supports a configurable retention policy in the config. Frigate chooses the largest matching retention value between the recording retention and the event retention when determining if a recording should be removed.

New recording segments are written from the camera stream to cache, they are only moved to disk if they match the setup recording retention policy.

H265 recordings can be viewed in Chrome 108+, Edge and Safari only. All other browsers require recordings to be encoded with H264.

## Will Frigate delete old recordings if my storage runs out?

As of Frigate 0.12 if there is less than an hour left of storage, the oldest 2 hours of recordings will be deleted.

## What if I don't want 24/7 recordings?

If you only used clips in previous versions with recordings disabled, you can use the following config to get the same behavior. This is also the default behavior when recordings are enabled.

```yaml
record:
  enabled: True
  events:
    retain:
      default: 10
```

This configuration will retain recording segments that overlap with events and have active tracked objects for 10 days. Because multiple events can reference the same recording segments, this avoids storing duplicate footage for overlapping events and reduces overall storage needs.

When `retain -> days` is set to `0`, segments will be deleted from the cache if no events are in progress.

## Can I have "24/7" recordings, but only at certain times?

Using Frigate UI, HomeAssistant, or MQTT, cameras can be automated to only record in certain situations or at certain times.

**WARNING**: Recordings still must be enabled in the config. If a camera has recordings disabled in the config, enabling via the methods listed above will have no effect.

## What do the different retain modes mean?

Frigate saves from the stream with the `record` role in 10 second segments. These options determine which recording segments are kept for 24/7 recording (but can also affect events).

Let's say you have Frigate configured so that your doorbell camera would retain the last **2** days of 24/7 recording.
- With the `all` option all 48 hours of those two days would be kept and viewable.
- With the `motion` option the only parts of those 48 hours would be segments that Frigate detected motion. This is the middle ground option that won't keep all 48 hours, but will likely keep all segments of interest along with the potential for some extra segments.
- With the `active_objects` option the only segments that would be kept are those where there was a true positive object that was not considered stationary.

The same options are available with events. Let's consider a scenario where you drive up and park in your driveway, go inside, then come back out 4 hours later.
- With the `all` option all segments for the duration of the event would be saved for the event. This event would have 4 hours of footage.
- With the `motion` option all segments for the duration of the event with motion would be saved. This means any segment where a car drove by in the street, person walked by, lighting changed, etc. would be saved.
- With the `active_objects` it would only keep segments where the object was active. In this case the only segments that would be saved would be the ones where the car was driving up, you going inside, you coming outside, and the car driving away. Essentially reducing the 4 hours to a minute or two of event footage.

A configuration example of the above retain modes where all `motion` segments are stored for 7 days and `active objects` are stored for 14 days would be as follows:
```yaml
record:
  enabled: True
  retain:
    days: 7
    mode: motion
  events:
    retain:
      default: 14
      mode: active_objects
```
The above configuration example can be added globally or on a per camera basis.

### Object Specific Retention

You can also set specific retention length for an object type. The below configuration example builds on from above but also specifies that recordings of dogs only need to be kept for 2 days and recordings of cars should be kept for 7 days.
```yaml
record:
  enabled: True
  retain:
    days: 7
    mode: motion
  events:
    retain:
      default: 14
      mode: active_objects
      objects:
        dog: 2
        car: 7
```
