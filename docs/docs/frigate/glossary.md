---
id: glossary
title: Glossary
---

The glossary explains terms commonly used in Frigate's documentation.

## Bounding Box

A box returned from the object detection model that outlines an object in the frame. These have multiple colors depending on object type in the debug live view.

## Event

The time period starting when a tracked object entered the frame and ending when it left the frame, including any time that the object remained still. Events are saved when it is considered a [true positive](#threshold) and meets the requirements for a snapshot or recording to be saved.

## False Positive

An incorrect detection of an object type. For example a dog being detected as a person, a chair being detected as a dog, etc. A person being detected in an area you want to ignore is not a false positive.

## Mask

There are two types of masks in Frigate. [See the mask docs for more info](/configuration/masks)

### Motion Mask

Motion masks prevent detection of [motion](#motion) in masked areas from triggering Frigate to run object detection, but do not prevent objects from being detected if object detection runs due to motion in nearby areas. For example: camera timestamps, skies, the tops of trees, etc.

### Object Mask

Object filter masks drop any bounding boxes where the bottom center (overlap doesn't matter) is in the masked area. It forces them to be considered a [false positive](#false-positive) so that they are ignored.

## Min Score

The lowest score that an object can be detected with during tracking, any detection with a lower score will be assumed to be a false positive

## Motion

When pixels in the current camera frame are different than previous frames. When many nearby pixels are different in the current frame they grouped together and indicated with a red motion box in the live debug view. [See the motion detection docs for more info](/configuration/motion_detection)

## Region

A portion of the camera frame that is sent to object detection, regions can be sent due to motion, active objects, or occasionally for stationary objects. These are represented by green boxes in the debug live view.

## Snapshot Score

The score shown in a snapshot is the score of that object at that specific moment in time.

## Threshold

The threshold is the median score that an object must reach in order to be considered a true positive.

## Top Score

The top score for an object is the highest median score for an object.

## Zone

Zones are areas of interest, zones can be used for notifications and for limiting the areas where Frigate will create an [event](#event). [See the zone docs for more info](/configuration/zones)
