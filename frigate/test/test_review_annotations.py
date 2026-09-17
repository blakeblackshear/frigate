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

    def test_object_still_tracked_at_end_gets_no_closing_note(self):
        # Its state at the end is visible in the last frame, so nothing is said.
        timeline = build_timeline([self.event], span_end=15.0)
        self.assertEqual(
            [p for _, p in timeline],
            ["a person first detected at the right of the frame, moving up and left"],
        )

    def test_object_ending_inside_the_clip_is_no_longer_detected(self):
        timeline = build_timeline([self.event], span_end=40.0)
        phrases = [p for _, p in timeline]
        self.assertTrue(any("no longer detected" in p for p in phrases))

    def test_moments_past_the_last_frame_are_dropped(self):
        # The subject keeps moving after the final sampled frame; those notes
        # describe nothing the model can see.
        late = dict(self.event)
        out = straight_path((0.9, 0.6), (0.4, 0.6), 8, 100.0)
        back = straight_path((0.4, 0.6), (0.9, 0.6), 8, 108.0)
        late["path_data"] = out + back
        late["start_time"] = 100.0
        timeline = build_timeline([late], span_end=105.0)
        self.assertTrue(any("moving left" in p for _, p in timeline))
        self.assertFalse(any("turns around" in p for _, p in timeline))


def track(event_id, label, start, path, sub_label=None, end=None):
    return {
        "id": event_id,
        "label": label,
        "sub_label": sub_label,
        "start_time": start,
        "end_time": end if end is not None else start + 500.0,
        "zones": [],
        "path_data": path,
    }


class TestArrival(unittest.TestCase):
    def test_objects_arriving_together_keep_separate_notes(self):
        person = track(
            "1789481994.684479-lpyc2z",
            "person",
            0.0,
            straight_path((0.9, 0.63), (0.58, 0.34), 10, 0.1),
        )
        bin_ = track(
            "1789481995.063395-vlzd7q",
            "waste_bin",
            0.3,
            straight_path((0.91, 0.64), (0.6, 0.33), 10, 0.4),
            sub_label="Compost",
        )
        phrases = [p for _, p in build_timeline([person, bin_], 100.0)]
        self.assertEqual(
            phrases,
            [
                "a person first detected at the right of the frame, moving up and left",
                'waste bin "Compost" first detected at the right of the frame, '
                "moving up and left",
            ],
        )

    def test_object_detected_well_before_it_moves_gets_separate_notes(self):
        # path_data always keeps the first two samples, so a bin sitting in
        # the yard opens its leg long before it is picked up.
        path = [[[0.91, 0.64], 0.4]] + straight_path(
            (0.91, 0.64), (0.6, 0.33), 10, 20.4
        )
        bin_ = track(
            "1789481995.063395-vlzd7q", "waste_bin", 0.3, path, sub_label="Compost"
        )
        timeline = build_timeline([bin_], 100.0)
        self.assertEqual(
            timeline[0],
            (0.3, 'waste bin "Compost" first detected at the right of the frame'),
        )
        self.assertAlmostEqual(timeline[1][0], 21.4)
        self.assertEqual(
            timeline[1][1],
            'waste bin "Compost" starts moving up and left from the right of the frame',
        )


class TestStateChanges(unittest.TestCase):
    def test_stationary_and_active_rows_become_notes(self):
        bin_ = track(
            "1789481995.063395-vlzd7q",
            "waste_bin",
            0.3,
            straight_path((0.91, 0.64), (0.6, 0.33), 10, 0.4),
            sub_label="Compost",
        )
        changes = [
            {"timestamp": 20.0, "source_id": bin_["id"], "class_type": "stationary"},
            {"timestamp": 30.0, "source_id": bin_["id"], "class_type": "active"},
            {"timestamp": 35.0, "source_id": bin_["id"], "class_type": "entered_zone"},
            {
                "timestamp": 40.0,
                "source_id": "someone-else",
                "class_type": "stationary",
            },
        ]
        timeline = build_timeline([bin_], 100.0, state_changes=changes)
        self.assertEqual(
            timeline[1:],
            [
                (20.0, 'waste bin "Compost" has stopped moving'),
                (30.0, 'waste bin "Compost" starts moving again'),
            ],
        )

    def test_state_changes_after_the_last_frame_are_dropped(self):
        bin_ = track(
            "1789481995.063395-vlzd7q",
            "waste_bin",
            0.3,
            straight_path((0.91, 0.64), (0.6, 0.33), 10, 0.4),
            sub_label="Compost",
        )
        changes = [
            {"timestamp": 200.0, "source_id": bin_["id"], "class_type": "stationary"}
        ]
        timeline = build_timeline([bin_], 100.0, state_changes=changes)
        self.assertFalse(any("stopped" in p for _, p in timeline))


class TestNoAssumedState(unittest.TestCase):
    def test_no_note_for_where_movement_ends(self):
        # Ending a leftward walk still in the right third was read as a turn
        # back to the right, and "stops moving" was read as standing still.
        moments = path_moments(straight_path((0.95, 0.6), (0.7, 0.4), 6, 0.0))
        self.assertEqual(
            [p for _, p in moments],
            ["starts moving up and left from the right of the frame"],
        )

    def test_notes_never_claim_an_object_is_stationary(self):
        # A track still open at the last frame says nothing about motion.
        event = {
            "id": "1789482056.695307-3uhf47",
            "label": "person",
            "sub_label": None,
            "start_time": 0.0,
            "end_time": 500.0,
            "zones": ["front_yard"],
            "path_data": straight_path((0.9, 0.6), (0.4, 0.3), 10, 1.0),
        }
        joined = " ".join(p for _, p in build_timeline([event], span_end=20.0))
        self.assertNotIn("stationary", joined)
        self.assertNotIn("stops", joined)
        self.assertNotIn("leaves", joined)
        self.assertNotIn("still", joined)


class TestLateEvents(unittest.TestCase):
    def test_objects_first_detected_after_the_last_frame_are_skipped(self):
        # Without this the arrival lands on the final frame, which was
        # captured before the object appeared.
        late = track(
            "1789481999.000000-latear",
            "person",
            50.0,
            straight_path((0.9, 0.6), (0.4, 0.3), 10, 50.1),
        )
        self.assertEqual(build_timeline([late], span_end=40.0), [])
        self.assertEqual(
            annotations_by_frame(build_timeline([late], 40.0), [0.0, 40.0]), {}
        )


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
