/** Fisheye lens calibration, mirrors the camera `dewarp` config section. */
export type FisheyeSettings = {
  /** Horizontal center of the fisheye circle, as a fraction of image width. */
  center_x: number;
  /** Vertical center of the fisheye circle, as a fraction of image height. */
  center_y: number;
  /** Radius of the fisheye circle, as a fraction of image height. */
  radius: number;
  /** Field of view covered by the fisheye circle, in degrees. */
  fov: number;
  /** Rotation of the lens around the vertical axis of the sphere, in degrees. */
  pan: number;
  /**
   * Angle of the lens axis away from straight down, in degrees.
   * 0 is a ceiling mount and 90 is a wall mount facing the horizon.
   */
  tilt: number;
};

export const DEFAULT_FISHEYE_SETTINGS: FisheyeSettings = Object.freeze({
  center_x: 0.5,
  center_y: 0.5,
  radius: 0.5,
  fov: 180,
  pan: 0,
  tilt: 0,
});
