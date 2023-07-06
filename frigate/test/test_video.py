import unittest

import cv2
import numpy as np
from norfair.drawing.color import Palette
from norfair.drawing.drawer import Drawer

from frigate.util.image import intersection
from frigate.video import (
    get_cluster_boundary,
    get_cluster_candidates,
    get_cluster_region,
)


def draw_box(frame, box, color=(255, 0, 0), thickness=2):
    cv2.rectangle(
        frame,
        (box[0], box[1]),
        (box[2], box[3]),
        color,
        thickness,
    )


def save_clusters_image(name, boxes, candidates, regions=[]):
    canvas = np.zeros((1000, 2000, 3), np.uint8)
    for cluster in candidates:
        color = Palette.choose_color(np.random.rand())
        for b in cluster:
            box = boxes[b]
            draw_box(canvas, box, color, 2)
            # bottom right
            text_anchor = (
                box[2],
                box[3],
            )
            canvas = Drawer.text(
                canvas,
                str(b),
                position=text_anchor,
                size=None,
                color=(255, 255, 255),
                thickness=None,
            )
    for r in regions:
        draw_box(canvas, r, (0, 255, 0), 2)
    cv2.imwrite(
        f"debug/frames/{name}.jpg",
        canvas,
    )


def save_cluster_boundary_image(name, boxes, bounding_boxes):
    canvas = np.zeros((1000, 2000, 3), np.uint8)
    color = Palette.choose_color(np.random.rand())
    for box in boxes:
        draw_box(canvas, box, color, 2)
    for bound in bounding_boxes:
        draw_box(canvas, bound, (0, 255, 0), 2)
    cv2.imwrite(
        f"debug/frames/{name}.jpg",
        canvas,
    )


class TestRegion(unittest.TestCase):
    def setUp(self):
        self.frame_shape = (1000, 2000)
        self.min_region_size = 160

    def test_cluster_candidates(self):
        boxes = [(100, 100, 200, 200), (202, 150, 252, 200), (900, 900, 950, 950)]

        cluster_candidates = get_cluster_candidates(
            self.frame_shape, self.min_region_size, boxes
        )

        # save_clusters_image("cluster_candidates", boxes, cluster_candidates)

        assert len(cluster_candidates) == 2

    def test_cluster_boundary(self):
        boxes = [(100, 100, 200, 200), (215, 215, 325, 325)]
        boundary_boxes = [
            get_cluster_boundary(box, self.min_region_size) for box in boxes
        ]

        # save_cluster_boundary_image("bound", boxes, boundary_boxes)
        assert len(boundary_boxes) == 2

    def test_cluster_regions(self):
        boxes = [(100, 100, 200, 200), (202, 150, 252, 200), (900, 900, 950, 950)]

        cluster_candidates = get_cluster_candidates(
            self.frame_shape, self.min_region_size, boxes
        )

        regions = [
            get_cluster_region(self.frame_shape, self.min_region_size, candidate, boxes)
            for candidate in cluster_candidates
        ]

        # save_clusters_image("regions", boxes, cluster_candidates, regions)
        assert len(regions) == 2

    def test_box_too_small_for_cluster(self):
        boxes = [(100, 100, 600, 600), (655, 100, 700, 145)]

        cluster_candidates = get_cluster_candidates(
            self.frame_shape, self.min_region_size, boxes
        )

        regions = [
            get_cluster_region(self.frame_shape, self.min_region_size, candidate, boxes)
            for candidate in cluster_candidates
        ]

        save_clusters_image("too_small", boxes, cluster_candidates, regions)

        assert len(cluster_candidates) == 2
        assert len(regions) == 2

    def test_redundant_clusters(self):
        boxes = [(100, 100, 200, 200), (305, 305, 415, 415)]

        cluster_candidates = get_cluster_candidates(
            self.frame_shape, self.min_region_size, boxes
        )

        regions = [
            get_cluster_region(self.frame_shape, self.min_region_size, candidate, boxes)
            for candidate in cluster_candidates
        ]

        # save_clusters_image("redundant", boxes, cluster_candidates, regions)

        assert len(cluster_candidates) == 2
        assert all([len(c) == 1 for c in cluster_candidates])
        assert len(regions) == 2

    def test_combine_boxes(self):
        boxes = [
            (460, 0, 561, 144),
            (565, 0, 586, 71),
        ]

        # boundary_boxes = [get_cluster_boundary(box) for box in boxes]
        # save_cluster_boundary_image("combine_bound", boxes, boundary_boxes)

        cluster_candidates = get_cluster_candidates(
            self.frame_shape, self.min_region_size, boxes
        )

        regions = [
            get_cluster_region(self.frame_shape, self.min_region_size, candidate, boxes)
            for candidate in cluster_candidates
        ]

        # save_clusters_image("combine", boxes, cluster_candidates, regions)
        assert len(regions) == 1

    def test_dont_combine_boxes(self):
        boxes = [(460, 0, 532, 129), (586, 0, 606, 46)]

        # boundary_boxes = [get_cluster_boundary(box) for box in boxes]
        # save_cluster_boundary_image("dont_combine_bound", boxes, boundary_boxes)

        cluster_candidates = get_cluster_candidates(
            self.frame_shape, self.min_region_size, boxes
        )

        regions = [
            get_cluster_region(self.frame_shape, self.min_region_size, candidate, boxes)
            for candidate in cluster_candidates
        ]

        # save_clusters_image("dont_combine", boxes, cluster_candidates, regions)
        assert len(regions) == 2


class TestObjectBoundingBoxes(unittest.TestCase):
    def setUp(self) -> None:
        pass

    def test_box_intersection(self):
        box_a = [2012, 191, 2031, 205]
        box_b = [887, 92, 985, 151]
        box_c = [899, 128, 1080, 175]

        assert intersection(box_a, box_b) == None
        assert intersection(box_b, box_c) == (899, 128, 985, 151)
