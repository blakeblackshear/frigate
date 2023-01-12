---
id: false_positives
title: Reducing false positives
---

Tune your object filters to adjust false positives: `min_area`, `max_area`, `min_ratio`, `max_ratio`, `min_score`, `threshold`.

The `min_area` and `max_area` values are compared against the area (number of pixels) from a given detected object. If the area is outside this range, the object will be ignored as a false positive. This allows objects that must be too small or too large to be ignored.

Similarly, the `min_ratio` and `max_ratio` values are compared against a given detected object's width/height ratio (in pixels). If the ratio is outside this range, the object will be ignored as a false positive. This allows objects that are proportionally too short-and-wide (higher ratio) or too tall-and-narrow (smaller ratio) to be ignored.

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
