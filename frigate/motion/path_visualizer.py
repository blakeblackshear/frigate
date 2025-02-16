import cv2
import numpy as np
from typing import Dict, List, Tuple
from filterpy.kalman import KalmanFilter

class PathVisualizer:
    def __init__(self, history_length: int = 30, prediction_length: int = 15):
        self.history_length = history_length
        self.prediction_length = prediction_length
        self.position_history: Dict[str, List[Tuple[int, int]]] = {}
        self.kalman_filters: Dict[str, KalmanFilter] = {}
        
    def _init_kalman(self, object_id: str, initial_pos: Tuple[int, int]):
        """Initialize Kalman filter for new object with position and velocity state"""
        kf = KalmanFilter(dim_x=4, dim_z=2)  # State: [x, y, vx, vy], Measurement: [x, y]
        
        # State transition matrix
        kf.F = np.array([
            [1, 0, 1, 0],  # x = x + vx
            [0, 1, 0, 1],  # y = y + vy
            [0, 0, 1, 0],  # vx = vx
            [0, 0, 0, 1],  # vy = vy
        ])
        
        # Measurement matrix
        kf.H = np.array([
            [1, 0, 0, 0],
            [0, 1, 0, 0]
        ])
        
        # Measurement noise
        kf.R = np.eye(2) * 5
        
        # Process noise
        kf.Q = np.eye(4) * 0.1
        
        # Initial state
        kf.x = np.array([initial_pos[0], initial_pos[1], 0, 0])
        
        # Initial state covariance
        kf.P = np.eye(4) * 100
        
        self.kalman_filters[object_id] = kf
            
    def update_position(self, object_id: str, centroid: Tuple[int, int]):
        """Update position history and Kalman filter for an object"""
        if object_id not in self.position_history:
            self.position_history[object_id] = []
            self._init_kalman(object_id, centroid)
            
        # Update Kalman filter
        kf = self.kalman_filters[object_id]
        measurement = np.array([centroid[0], centroid[1]])
        kf.predict()
        kf.update(measurement)
        
        # Store filtered position
        filtered_pos = (int(kf.x[0]), int(kf.x[1]))
        self.position_history[object_id].append(filtered_pos)
        
        # Trim history
        if len(self.position_history[object_id]) > self.history_length:
            self.position_history[object_id] = self.position_history[object_id][-self.history_length:]
            
    def predict_path(self, object_id: str, frame_shape: Tuple[int, int]) -> List[Tuple[int, int]]:
        """Predict future path using Kalman filter"""
        if object_id not in self.kalman_filters:
            return []
            
        kf = self.kalman_filters[object_id]
        predictions = []
        
        # Save current state
        current_state = kf.x.copy()
        current_covar = kf.P.copy()
        
        # Predict future positions
        for _ in range(self.prediction_length):
            kf.predict()
            pred_x = int(kf.x[0])
            pred_y = int(kf.x[1])
            
            # Constrain predictions to frame boundaries
            pred_x = max(0, min(pred_x, frame_shape[1]))
            pred_y = max(0, min(pred_y, frame_shape[0]))
            
            predictions.append((pred_x, pred_y))
            
        # Restore saved state
        kf.x = current_state
        kf.P = current_covar
            
        return predictions
        
    def draw_paths(self, frame: np.ndarray, active_objects: List[str]):
        """Draw historical and predicted paths for active objects"""
        frame_shape = frame.shape[:2]
        
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
            predictions = self.predict_path(object_id, frame_shape)
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
            self.kalman_filters.pop(inactive_id, None)