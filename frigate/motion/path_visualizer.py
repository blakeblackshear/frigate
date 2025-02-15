import cv2
import numpy as np
from typing import Dict, List, Tuple

class PathVisualizer:
    def __init__(self, history_length: int = 30, prediction_length: int = 15):
        self.history_length = history_length  # Number of past positions to show
        self.prediction_length = prediction_length  # Number of predicted positions
        self.position_history: Dict[str, List[Tuple[int, int]]] = {}  # object_id -> list of positions
        
    def update_position(self, object_id: str, centroid: Tuple[int, int]):
        if object_id not in self.position_history:
            self.position_history[object_id] = []
            
        self.position_history[object_id].append(centroid)
        
        # Keep only recent history
        if len(self.position_history[object_id]) > self.history_length:
            self.position_history[object_id] = self.position_history[object_id][-self.history_length:]
            
    def predict_path(self, object_id: str) -> List[Tuple[int, int]]:
        if object_id not in self.position_history or len(self.position_history[object_id]) < 2:
            return []
            
        # Get last two positions to calculate velocity vector
        positions = self.position_history[object_id]
        p1 = np.array(positions[-2])
        p2 = np.array(positions[-1])
        velocity = p2 - p1
        
        # Predict future positions
        predictions = []
        current_pos = p2
        for _ in range(self.prediction_length):
            current_pos = current_pos + velocity
            predictions.append(tuple(map(int, current_pos)))
            
        return predictions
        
    def draw_paths(self, frame: np.ndarray, active_objects: List[str]):
        for object_id in active_objects:
            if object_id not in self.position_history:
                continue
                
            # Draw historical path
            positions = self.position_history[object_id]
            for i in range(1, len(positions)):
                # Color transitions from blue to green (past to present)
                alpha = i / len(positions)
                color = (
                    int(255 * (1-alpha)),  # Blue
                    int(255 * alpha),      # Green
                    0                      # Red
                )
                
                start_pos = positions[i-1]
                end_pos = positions[i]
                
                # Draw line with anti-aliasing
                cv2.line(frame, start_pos, end_pos, color, 2, cv2.LINE_AA)
                
            # Draw predicted path
            predictions = self.predict_path(object_id)
            for i in range(1, len(predictions)):
                # Red color with fading opacity for future predictions
                alpha = 1 - (i / len(predictions))
                color = (0, 0, 255)  # Red
                
                start_pos = predictions[i-1]
                end_pos = predictions[i]
                
                # Create overlay for alpha blending
                overlay = frame.copy()
                cv2.line(overlay, start_pos, end_pos, color, 2, cv2.LINE_AA)
                cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)

    def cleanup_inactive(self, active_objects: List[str]):
        """Remove tracking data for inactive objects"""
        current_ids = set(active_objects)
        tracked_ids = set(self.position_history.keys())
        
        for inactive_id in tracked_ids - current_ids:
            self.position_history.pop(inactive_id, None)