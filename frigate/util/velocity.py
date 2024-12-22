import math

import numpy as np


def order_points_clockwise(points):
    points = np.array(points)
    centroid = np.mean(points, axis=0)

    angles = np.arctan2(points[:, 1] - centroid[1], points[:, 0] - centroid[0])

    # Sort points by angle
    sorted_indices = np.argsort(angles)
    sorted_points = points[sorted_indices]

    # Find the top-left point (minimum sum of x and y coordinates)
    top_left_idx = np.argmin(np.sum(sorted_points, axis=1))

    # Rotate the points so that the top-left point is first
    sorted_points = np.roll(sorted_points, -top_left_idx, axis=0)

    return sorted_points.tolist()


def create_ground_plane(zone_points, distances):
    """
    Create a ground plane that accounts for perspective distortion using real-world dimensions for each side of the zone.

    :param zone_points: Array of zone corner points in pixel coordinates in circular order
                        [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
    :param distances: Real-world dimensions ordered by A, B, C, D
    :return: Function that calculates real-world distance per pixel at any coordinate
    """
    A, B, C, D = zone_points

    # Calculate pixel lengths of each side
    AB_px = np.linalg.norm(np.array(B) - np.array(A))
    BC_px = np.linalg.norm(np.array(C) - np.array(B))
    CD_px = np.linalg.norm(np.array(D) - np.array(C))
    DA_px = np.linalg.norm(np.array(A) - np.array(D))

    AB, BC, CD, DA = map(float, distances)

    AB_scale = AB / AB_px
    BC_scale = BC / BC_px
    CD_scale = CD / CD_px
    DA_scale = DA / DA_px

    def distance_per_pixel(x, y):
        """
        Calculate the real-world distance per pixel at a given (x, y) coordinate.

        :param x: X-coordinate in the image
        :param y: Y-coordinate in the image
        :return: Real-world distance per pixel at the given (x, y) coordinate
        """
        # Normalize x and y within the zone
        x_norm = (x - A[0]) / (B[0] - A[0])
        y_norm = (y - A[1]) / (D[1] - A[1])

        # Interpolate scales horizontally and vertically
        vertical_scale = AB_scale + (CD_scale - AB_scale) * y_norm
        horizontal_scale = DA_scale + (BC_scale - DA_scale) * x_norm

        # Combine horizontal and vertical scales
        return (vertical_scale + horizontal_scale) / 2

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
    :param distances: List of distances of each side, ordered by A, B, C, D
    :param velocity_pixels: List of tuples representing velocity in pixels/frame
    :param position: Current position of the object (x, y) in pixels
    :param camera_fps: Frames per second of the camera
    :return: speed and velocity angle direction
    """
    if not isinstance(zone_contour, np.ndarray):
        zone_contour = np.array(zone_contour)

    # Find the top-left point (minimum sum of x and y coordinates)
    top_left_idx = np.argmin(np.sum(zone_contour, axis=1))

    # Rotate the points so that the top-left point is first
    ordered_zone_contour = np.roll(zone_contour, -top_left_idx, axis=0)

    # Reorder distances to match the new order of zone_contour
    ordered_distances = np.roll(distances, -top_left_idx)

    ground_plane = create_ground_plane(ordered_zone_contour, ordered_distances)

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

    return speed_magnitude, angle
