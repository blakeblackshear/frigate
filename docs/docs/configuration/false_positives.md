---
id: false_positives
title: Reducing false positives
---

Tune your object filters to adjust false positives: `min_area`, `max_area`, `min_score`, `threshold`.

For object filters in your configuration, any single detection below `min_score` will be ignored as a false positive. `threshold` is based on the median of the history of scores (padded to 3 values) for a tracked object. Consider the following frames when `min_score` is set to 0.6 and threshold is set to 0.85:

| Frame | Current Score | Score History                     | Computed Score | Detected Object |
| ----- | ------------- | --------------------------------- | -------------- | --------------- |
| 1     | 0.7           | 0.0, 0, 0.7                       | 0.0            | No              |
| 2     | 0.55          | 0.0, 0.7, 0.0                     | 0.0            | No              |
| 3     | 0.85          | 0.7, 0.0, 0.85                    | 0.7            | No              |
| 4     | 0.90          | 0.7, 0.85, 0.95, 0.90             | 0.875          | Yes             |
| 5     | 0.88          | 0.7, 0.85, 0.95, 0.90, 0.88       | 0.88           | Yes             |
| 6     | 0.95          | 0.7, 0.85, 0.95, 0.90, 0.88, 0.95 | 0.89           | Yes             |

In frame 2, the score is below the `min_score` value, so frigate ignores it and it becomes a 0.0. The computed score is the median of the score history (padding to at least 3 values), and only when that computed score crosses the `threshold` is the object marked as a true positive. That happens in frame 4 in the example.
