---
id: glossary
title: Glossary
---

The glossary explains terms commonly used in Frigate documentation.

## Bounding Box

A bounding box is a box that represents an object that is being tracked, this is the part of the camera frame that the object detector detected as that object. These have multiple colors depending on object type in the debug live view.

## Event

An event is a particular tracked object is considered a [true positive](#threshold) and meets the requirements for a snapshot or recording to be saved.

## False Positive

A false positive is when an object is detected that is not that object. For example a dog being detected as a person, a chair being detected as a dog, etc.

## Mask

There are two types of masks in Frigate.

### Motion Mask

A motion mask is meant to mask out areas of an image that commonly have [motion](#motion) but do not have objects. For example: camera timestamps, skies, the tops of trees, etc.

### Object Mask

An object mask is meant to mask out [false positive](#false_positive) objects so that they are ignored.

## Min Score

The min score is the lowest score that an object can be detected with, any object detected with a lower score will be thrown out

## Motion

Motion is pixels in a specific camera frame are different from the background frame that has been calculated. A motion box is a box around groups of these areas of motion that have been detected. These are represented by red boxes in the debug live view.

## Region

A region is a portion of the camera frame that is sent to object detection, regions can be sent due to motion, active objects, or occasionally for stationary objects. These are represented by green boxes in the debug live view.

## Snapshot Score

The score shown in a snapshot is the score of that object at that specific moment in time.

## Threshold

The threshold is the median score that an object must reach in order to be considered a true positive.

## Top Score

The top score for an object is the highest median score for an object.

## Zone

Zones are areas of interest, zones can be used for notifications and for limiting the areas where Frigate will create an [event](#event).