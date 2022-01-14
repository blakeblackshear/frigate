import numpy as np
from unittest import TestCase, main
from frigate.video import box_overlaps, reduce_boxes


class TestBoxOverlaps(TestCase):
    def test_overlap(self):
        assert box_overlaps((100, 100, 200, 200), (50, 50, 150, 150))

    def test_overlap_2(self):
        assert box_overlaps((50, 50, 150, 150), (100, 100, 200, 200))

    def test_no_overlap(self):
        assert not box_overlaps((100, 100, 200, 200), (250, 250, 350, 350))


class TestReduceBoxes(TestCase):
    def test_cluster(self):
        clusters = reduce_boxes(
            [(144, 290, 221, 459), (225, 178, 426, 341), (343, 105, 584, 250)]
        )
        assert len(clusters) == 2


if __name__ == "__main__":
    main(verbosity=2)
