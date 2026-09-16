"""Tests for tracker-derived review frame annotations."""

import unittest

from frigate.data_processing.post.review_annotations import (
    annotations_by_frame,
    build_timeline,
    describe_heading,
    describe_position,
    event_name,
    path_legs,
    path_moments,
)


def straight_path(
    start: tuple[float, float],
    end: tuple[float, float],
    steps: int,
    t0: float,
) -> list:
    """A path_data-shaped trajectory travelling in a straight line."""
    return [
        [
            [
                start[0] + (end[0] - start[0]) * i / (steps - 1),
                start[1] + (end[1] - start[1]) * i / (steps - 1),
            ],
            t0 + i,
        ]
        for i in range(steps)
    ]


class TestDescribers(unittest.TestCase):
    def test_describes_frame_corners(self):
        self.assertEqual(describe_position(0.9, 0.9), "the bottom right of the frame")
        self.assertEqual(describe_position(0.1, 0.1), "the top left of the frame")
        self.assertEqual(describe_position(0.5, 0.5), "the middle of the frame")

    def test_heading_treats_falling_y_as_up(self):
        self.assertEqual(describe_heading(0.0, -0.5), "up")
        self.assertEqual(describe_heading(0.0, 0.5), "down")
        self.assertEqual(describe_heading(-0.5, 0.0), "left")

    def test_heading_combines_axes(self):
        self.assertEqual(describe_heading(-0.5, -0.5), "up and left")


class TestPathLegs(unittest.TestCase):
    def test_straight_travel_is_one_leg(self):
        points = [(0.9 - 0.05 * i, 0.6, float(i)) for i in range(10)]
        self.assertEqual(len(path_legs(points)), 1)

    def test_out_and_back_is_two_legs(self):
        out = [(0.9 - 0.05 * i, 0.6, float(i)) for i in range(8)]
        back = [(0.55 + 0.05 * i, 0.6, 8.0 + i) for i in range(8)]
        self.assertEqual(len(path_legs(out + back)), 2)

    def test_jitter_in_place_produces_no_legs(self):
        # A subject standing still wobbles by a couple of percent; without the
        # minimum leg distance this became a burst of contradictory turns.
        points = [(0.5 + 0.01 * (i % 2), 0.5, float(i)) for i in range(20)]
        self.assertEqual(path_legs(points), [])

    def test_single_point_path_has_no_moments(self):
        self.assertEqual(path_moments([[[0.5, 0.5], 1.0]]), [])

    def test_malformed_path_is_ignored(self):
        self.assertEqual(path_moments([[0.5, 1.0], [0.6, 2.0]]), [])


class TestEventNames(unittest.TestCase):
    def test_unnamed_objects_use_an_indefinite_article(self):
        self.assertEqual(event_name({"label": "person"}), "a person")
        self.assertEqual(event_name({"label": "animal"}), "an animal")

    def test_sub_labeled_objects_use_their_name(self):
        event = {"label": "waste_bin", "sub_label": "Compost"}
        self.assertEqual(event_name(event), 'waste bin "Compost"')

    def test_repeated_objects_are_never_numbered(self):
        # Whether these are the same subject is unknown, so the notes must not
        # imply either answer.
        events = [
            {
                "id": f"1789481994.68448{i}-abcdef",
                "label": "person",
                "sub_label": None,
                "start_time": float(i * 10),
                "end_time": float(i * 10 + 50),
                "zones": [],
                "path_data": straight_path((0.9, 0.6), (0.4, 0.3), 10, i * 10.0),
            }
            for i in range(3)
        ]
        phrases = [p for _, p in build_timeline(events, span_end=100.0)]
        self.assertTrue(all(p.startswith("a person ") for p in phrases))
        self.assertFalse(any("#" in p for p in phrases))


class TestTimeline(unittest.TestCase):
    def setUp(self):
        self.event = {
            "id": "1789481994.684479-lpyc2z",
            "label": "person",
            "sub_label": None,
            "start_time": 0.0,
            "end_time": 20.0,
            "zones": ["front_yard"],
            "path_data": straight_path((0.9, 0.6), (0.4, 0.3), 10, 1.0),
        }

    def test_timeline_is_ordered_and_bounded(self):
        timeline = build_timeline([self.event], span_end=30.0)
        times = [t for t, _ in timeline]
        self.assertEqual(times, sorted(times))
        self.assertTrue(all(t <= 30.0 for t in times))

    def test_track_identifiers_never_appear(self):
        timeline = build_timeline([self.event], span_end=30.0)
        joined = " ".join(phrase for _, phrase in timeline)
        self.assertNotIn("track", joined.lower())
        self.assertNotIn(self.event["id"], joined)

    def test_object_still_tracked_at_end_is_reported_present(self):
        timeline = build_timeline([self.event], span_end=15.0)
        phrases = [p for _, p in timeline]
        self.assertTrue(any("still present" in p for p in phrases))
        self.assertFalse(any("leaves the frame" in p for p in phrases))

    def test_object_ending_inside_the_clip_leaves_the_frame(self):
        timeline = build_timeline([self.event], span_end=40.0)
        phrases = [p for _, p in timeline]
        self.assertTrue(any("leaves the frame" in p for p in phrases))

    def test_moments_past_the_last_frame_are_dropped(self):
        # The subject keeps moving after the final sampled frame; those notes
        # describe nothing the model can see.
        late = dict(self.event)
        late["path_data"] = straight_path((0.9, 0.6), (0.4, 0.3), 10, 100.0)
        late["start_time"] = 100.0
        timeline = build_timeline([late], span_end=105.0)
        self.assertFalse(any("stops moving" in p for _, p in timeline))


class TestFrameBucketing(unittest.TestCase):
    def test_moment_attaches_to_the_following_frame(self):
        frame_times = [0.0, 10.0, 20.0, 30.0]
        buckets = annotations_by_frame([(12.0, "something happened")], frame_times)
        self.assertEqual(buckets, {2: ["something happened"]})

    def test_moment_on_a_frame_boundary_uses_that_frame(self):
        buckets = annotations_by_frame([(10.0, "x")], [0.0, 10.0, 20.0])
        self.assertEqual(buckets, {1: ["x"]})

    def test_moment_after_the_last_frame_falls_on_the_last_frame(self):
        buckets = annotations_by_frame([(99.0, "x")], [0.0, 10.0])
        self.assertEqual(buckets, {1: ["x"]})

    def test_no_frames_yields_no_buckets(self):
        self.assertEqual(annotations_by_frame([(1.0, "x")], []), {})


if __name__ == "__main__":
    unittest.main()
