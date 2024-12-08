import math

import numpy as np

unit_system = "imperial"
magnitude = "mph"


def create_ground_plane(zone_points, distances):
    """
    Create a ground plane that accounts for perspective distortion using
    real-world dimensions for each side of the zone.

    :param zone_points: Array of zone corner points in pixel coordinates
                        [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
    :param distances: Real-world dimensions ordered by top, bottom left, right
    :return: Function that calculates real-world distance per pixel at any coordinate
    """
    # Sort points by y coordinate to get top and bottom lines
    sorted_points = zone_points[np.argsort(zone_points[:, 1])]
    top_width, bottom_width, left_depth, right_depth = map(float, distances)

    top_line = sorted_points[:2]
    bottom_line = sorted_points[2:]

    # Sort left to right for consistent indexing
    top_line = top_line[np.argsort(top_line[:, 0])]
    bottom_line = bottom_line[np.argsort(bottom_line[:, 0])]

    # Calculate pixel lengths of each side
    top_width_px = np.linalg.norm(top_line[1] - top_line[0])
    bottom_width_px = np.linalg.norm(bottom_line[1] - bottom_line[0])
    left_depth_px = np.linalg.norm(bottom_line[0] - top_line[0])
    right_depth_px = np.linalg.norm(bottom_line[1] - top_line[1])

    top_scale = top_width / top_width_px
    bottom_scale = bottom_width / bottom_width_px
    left_scale = left_depth / left_depth_px
    right_scale = right_depth / right_depth_px

    def distance_per_pixel(x, y):
        """
        Calculate the real-world distance per pixel at a given (x, y) coordinate.

        :param x: X-coordinate in the image
        :param y: Y-coordinate in the image
        :return: Real-world distance per pixel at the given (x, y) coordinate
        """
        # Normalize x and y within the zone
        x_norm = (x - top_line[0][0]) / (top_line[1][0] - top_line[0][0])
        y_norm = (y - top_line[0][1]) / (bottom_line[0][1] - top_line[0][1])

        # Interpolate scales horizontally and vertically
        top_to_bottom_scale = top_scale + (bottom_scale - top_scale) * y_norm
        left_to_right_scale = left_scale + (right_scale - left_scale) * x_norm

        # Combine horizontal and vertical scales
        return (top_to_bottom_scale + left_to_right_scale) / 2

    return distance_per_pixel


def calculate_real_world_speed(
    zone_contour,
    distances,
    velocity_pixels,
    position,
    camera_fps,
):
    """
    Calculate the real-world speed of a tracked object, accounting for perspective,
    directly from the zone string.

    :param zone_contour: Array of absolute zone points
    :param distances: Comma separated distances of each side, ordered by top, bottom, left, right
    :param velocity_pixels: List of tuples representing velocity in pixels/frame
    :param position: Current position of the object (x, y) in pixels
    :param camera_width: Width of the camera frame in pixels
    :param camera_height: Height of the camera frame in pixels
    :return: speed in the specified unit system (m/s for metric, ft/s for imperial) and velocity direction
    """
    ground_plane = create_ground_plane(zone_contour, distances)

    if not isinstance(velocity_pixels, np.ndarray):
        velocity_pixels = np.array(velocity_pixels)

    avg_velocity_pixels = velocity_pixels.mean(axis=0)

    # get the real-world distance per pixel at the object's current position and calculate real speed
    scale = ground_plane(position[0], position[1])
    speed_real = avg_velocity_pixels * scale * camera_fps

    # euclidean speed in real-world units/second
    speed_magnitude = np.linalg.norm(speed_real)

    # movement direction
    dx, dy = avg_velocity_pixels
    angle = math.degrees(math.atan2(dy, dx))
    if angle < 0:
        angle += 360

    if unit_system == "metric":
        if magnitude == "kmh":
            # Convert m/s to km/h
            speed_magnitude *= 3.6
    elif unit_system == "imperial":
        if magnitude == "mph":
            # Convert ft/s to mph
            speed_magnitude *= 0.681818

    return speed_magnitude, angle
