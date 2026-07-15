---
id: glossary
title: Glossary
---

The glossary explains terms commonly used in Frigate's documentation.

## Alert

The higher-priority of the two [review item](#review-item) severities, the other being a [detection](#detection). By default a review item is an alert when it involves a `person` or `car`; the qualifying [labels](#label) and [zones](#zone) can be configured. [See the review docs for more info](/configuration/review)

## Attribute

A property detected on an [object](#object) that exists alongside its [label](#label). Unlike a [sub label](#sub-label), an object can carry several attributes at once. Some attributes come directly from the object detection [model](#model) (for example `face`, `license_plate`, or delivery carrier logos such as `amazon`, `ups`, and `fedex`), while others come from a [custom object classification model](/configuration/custom_classification/object_classification) configured with the `attribute` type. Attributes are visible in the Tracked Object Details pane in Explore, in `frigate/events` MQTT messages, and through the HTTP API.

## Bounding Box

A box returned by the object detection [model](#model) that outlines a detected [object](#object) in the frame. In the [Debug view](/usage/live#the-single-camera-view), bounding boxes are colored by object [label](#label).

### Bounding Box Colors

- At startup different colors will be assigned to each object label
- A dark blue thin line indicates that object is not detected at this current point in time
- A gray thin line indicates that object is detected as being stationary
- A thick line indicates that object is the subject of autotracking (when enabled)

## Class

The categories a classification [model](#model) is trained to distinguish between. Each class is a distinct visual category the model predicts, plus a `none` class for inputs that don't fit any category. For example, a custom object classification model for `person` objects might use the classes `delivery_person`, `resident`, and `none`. The predicted class is applied to the [object](#object) as either a [sub label](#sub-label) or an [attribute](#attribute), depending on the model's configuration. [See the object classification docs for more info](/configuration/custom_classification/object_classification)

## Detection

The lower-priority of the two [review item](#review-item) severities, the other being an [alert](#alert). By default, any review item that does not qualify as an alert is a detection; the qualifying [labels](#label) and [zones](#zone) can be configured. Despite the name, a detection is a category of review item, not the same as the object detection performed by the [model](#model). [See the review docs for more info](/configuration/review)

## False Positive

An incorrect result from the object detection [model](#model), where it assigns the wrong [label](#label) to something in the frame, for example a dog identified as a person, or a chair identified as a dog. A person correctly identified in an area you want to ignore is not a false positive.

## Label

The type assigned to a detected [object](#object) by the object detection [model](#model), drawn from the model's labelmap, for example `person`, `car`, or `dog`. Frigate tracks `person` by default; additional labels are tracked by adding them to the objects configuration. [See the available objects docs for the full list](/configuration/objects)

## Mask

There are two types of masks in Frigate. [See the mask docs for more info](/configuration/masks)

### Motion Mask

A motion mask stops [motion](#motion) in the masked area from triggering object detection. It does not stop an object from being detected when object detection runs because of motion in a nearby area. Use motion masks for parts of the frame that change constantly but never contain objects you care about: camera timestamps, the sky, the tops of trees, and so on.

### Object Mask

An object filter mask drops any [bounding box](#bounding-box) whose bottom center falls inside the masked area (overlap elsewhere doesn't matter). The object is forced to be treated as a [false positive](#false-positive) and ignored.

## Min Score

The lowest score a detected object can have to be kept during tracking. Anything scoring below the minimum is assumed to be a [false positive](#false-positive) and discarded.

## Model

A machine learning model that Frigate uses to detect or classify objects. The object detection model locates [objects](#object) in each frame and returns their [labels](#label) and [bounding boxes](#bounding-box). Additional enrichment models run on tracked objects to add detail: face recognition, license plate recognition, bird classification, custom object and state classification, and the embedding models used for semantic search. [See the object detectors docs for more info](/configuration/object_detectors)

## Motion

A change in pixels between the current camera frame and previous frames. When many nearby pixels change together, they are grouped and shown as a red motion box in the debug live view. [See the motion detection docs for more info](/configuration/motion_detection)

## Object

Something Frigate can detect and follow in a camera frame, identified by its [label](#label) (for example a person or a car). The object types Frigate watches for are set in the `objects` configuration. Once an object is detected and followed across frames it becomes a [tracked object](#tracked-object-event-in-previous-versions), which may also carry a [sub label](#sub-label) and [attributes](#attribute). [See the available objects docs for more info](/configuration/objects)

## Region

A portion of the camera frame sent to the object detection [model](#model). Regions are selected because of [motion](#motion), active objects, or occasionally to recheck stationary objects, and are shown as green boxes in the debug live view.

## Review Item

A period of time during which one or more [tracked objects](#tracked-object-event-in-previous-versions) were active, grouped together for review. Each review item is categorized as either an [alert](#alert) or a [detection](#detection). [See the review docs for more info](/configuration/review)

## Snapshot Score

The object's score at the specific moment the snapshot was captured.

## Sub Label

A more specific identity assigned to a [tracked object](#tracked-object-event-in-previous-versions) in addition to its [label](#label). A `person` may get the name of a recognized face, a `car` may get the name of a known license plate, and a `bird` may get its species. An object can have only one sub label at a time. Sub labels are produced by face recognition, license plate recognition, bird classification, custom object classification configured with the `sub label` type, and semantic search triggers.

## Threshold

The median score an object must reach to be considered a true positive.

## Top Score

The highest median score an object reached over its lifetime.

## Tracked Object ("event" in previous versions)

An [object](#object) followed from the moment it enters the frame until it leaves, including any time it stays still. A tracked object is saved once it is considered a [true positive](#threshold) and meets the requirements for a snapshot or recording.

## Zone

A user-defined area of interest within the camera frame. Zones can be used for notifications and to limit where Frigate creates a [review item](#review-item). [See the zone docs for more info](/configuration/zones)
