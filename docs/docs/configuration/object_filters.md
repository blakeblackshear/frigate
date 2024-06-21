---
id: object_filters
title: Filters
---

There are several types of object filters that can be used to reduce false positive rates.

## Object Scores

For object filters in your configuration, any single detection below `min_score` will be ignored as a false positive. `threshold` is based on the median of the history of scores (padded to 3 values) for a tracked object. Consider the following frames when `min_score` is set to 0.6 and threshold is set to 0.85:

| Frame | Current Score | Score History                     | Computed Score | Detected Object |
| ----- | ------------- | --------------------------------- | -------------- | --------------- |
| 1     | 0.7           | 0.0, 0, 0.7                       | 0.0            | No              |
| 2     | 0.55          | 0.0, 0.7, 0.0                     | 0.0            | No              |
| 3     | 0.85          | 0.7, 0.0, 0.85                    | 0.7            | No              |
| 4     | 0.90          | 0.7, 0.85, 0.95, 0.90             | 0.875          | Yes             |
| 5     | 0.88          | 0.7, 0.85, 0.95, 0.90, 0.88       | 0.88           | Yes             |
| 6     | 0.95          | 0.7, 0.85, 0.95, 0.90, 0.88, 0.95 | 0.89           | Yes             |

In frame 2, the score is below the `min_score` value, so Frigate ignores it and it becomes a 0.0. The computed score is the median of the score history (padding to at least 3 values), and only when that computed score crosses the `threshold` is the object marked as a true positive. That happens in frame 4 in the example.

show image of snapshot vs event with differing scores

### Minimum Score

Any detection below `min_score` will be immediately thrown out and never tracked because it is considered a false positive. If `min_score` is too low then false positives may be detected and tracked which can confuse the object tracker and may lead to wasted resources. If `min_score` is too high then lower scoring true positives like objects that are further away or partially occluded may be thrown out which can also confuse the tracker and cause valid events to be lost or disjointed.

### Threshold

`threshold` is used to determine that the object is a true positive. Once an object is detected with a score >= `threshold` object is considered a true positive. If `threshold` is too low then some higher scoring false positives may create an event. If `threshold` is too high then true positive events may be missed due to the object never scoring high enough.

## Object Shape

False positives can also be reduced by filtering a detection based on its shape.

### Object Area

`min_area` and `max_area` filter on the area of an objects bounding box in pixels and can be used to reduce false positives that are outside the range of expected sizes. For example when a leaf is detected as a dog or when a large tree is detected as a person, these can be reduced by adding a `min_area` / `max_area` filter.

### Object Proportions

`min_ratio` and `max_ratio` values are compared against a given detected object's width/height ratio (in pixels). If the ratio is outside this range, the object will be ignored as a false positive. This allows objects that are proportionally too short-and-wide (higher ratio) or too tall-and-narrow (smaller ratio) to be ignored.

:::info

Conceptually, a ratio of 1 is a square, 0.5 is a "tall skinny" box, and 2 is a "wide flat" box. If `min_ratio` is 1.0, any object that is taller than it is wide will be ignored. Similarly, if `max_ratio` is 1.0, then any object that is wider than it is tall will be ignored.

:::

## Other Tools

### Zones

[Required zones](/configuration/zones.md) can be a great tool to reduce false positives that may be detected in the sky or other areas that are not of interest. The required zones will only create events for objects that enter the zone.

### Object Masks

[Object Filter Masks](/configuration/masks) are a last resort but can be useful when false positives are in the relatively same place but can not be filtered due to their size or shape.
