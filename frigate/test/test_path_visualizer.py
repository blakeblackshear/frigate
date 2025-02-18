import unittest

import numpy as np

from frigate.motion.path_visualizer import PathVisualizer


class TestPathVisualizer(unittest.TestCase):
    def setUp(self):
        self.visualizer = PathVisualizer(history_length=5, prediction_length=3)

    def test_init_kalman_creates_filter(self):
        object_id = "object_1"
        initial_pos = (100, 200)
        self.visualizer._init_kalman(object_id, initial_pos)

        self.assertIn(object_id, self.visualizer.kalman_filters)
        kf = self.visualizer.kalman_filters[object_id]
        self.assertTrue(np.array_equal(kf.x[:2], np.array(initial_pos)))

    def test_update_position_adds_to_history(self):
        object_id = "object_1"
        centroid = (100, 200)
        self.visualizer.update_position(object_id, centroid)

        self.assertIn(object_id, self.visualizer.position_history)
        self.assertEqual(self.visualizer.position_history[object_id][-1], centroid)

    def test_update_position_trims_history(self):
        object_id = "object_1"
        for i in range(10):
            self.visualizer.update_position(object_id, (i, i))

        self.assertEqual(len(self.visualizer.position_history[object_id]), 5)

    def test_predict_path_returns_correct_length(self):
        object_id = "object_1"
        initial_pos = (100, 200)
        self.visualizer._init_kalman(object_id, initial_pos)

        predictions = self.visualizer.predict_path(object_id, (500, 500))
        self.assertEqual(len(predictions), 3)

    def test_draw_paths(self):
        frame = np.zeros((500, 500, 3), dtype=np.uint8)
        object_id = "object_1"
        self.visualizer.update_position(object_id, (100, 100))
        self.visualizer.update_position(object_id, (150, 150))

        self.visualizer.draw_paths(frame, [object_id])

        # Check if the line was drawn
        self.assertTrue(np.any(frame != 0))

    def test_cleanup_inactive_removes_data(self):
        object_id = "object_1"
        self.visualizer.update_position(object_id, (100, 100))

        self.visualizer.cleanup_inactive([])

        self.assertNotIn(object_id, self.visualizer.position_history)
        self.assertNotIn(object_id, self.visualizer.kalman_filters)


if __name__ == "__main__":
    unittest.main(verbosity=2)
