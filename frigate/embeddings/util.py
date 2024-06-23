"""Z-score normalization for search distance."""

import math


class ZScoreNormalization:
    """Running Z-score normalization for search distance."""

    def __init__(self):
        self.n = 0
        self.mean = 0
        self.m2 = 0

    @property
    def variance(self):
        return self.m2 / (self.n - 1) if self.n > 1 else 0.0

    @property
    def stddev(self):
        return math.sqrt(self.variance)

    def normalize(self, distances: list[float]):
        self._update(distances)
        if self.stddev == 0:
            return distances
        return [(x - self.mean) / self.stddev for x in distances]

    def _update(self, distances: list[float]):
        for x in distances:
            self.n += 1
            delta = x - self.mean
            self.mean += delta / self.n
            delta2 = x - self.mean
            self.m2 += delta * delta2

    def to_dict(self):
        return {
            "n": self.n,
            "mean": self.mean,
            "m2": self.m2,
        }

    def from_dict(self, data: dict):
        self.n = data["n"]
        self.mean = data["mean"]
        self.m2 = data["m2"]
        return self
