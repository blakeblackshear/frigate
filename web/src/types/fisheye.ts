export const FISHEYE_MOUNTS = ["ceiling", "desktop", "wall"] as const;

/**
 * How the camera is mounted, which sets the direction the lens faces:
 * ceiling looks straight down, desktop straight up and wall horizontally.
 */
export type FisheyeMount = (typeof FISHEYE_MOUNTS)[number];

/** Fisheye lens calibration, mirrors the camera `dewarp` config section. */
export type FisheyeSettings = {
  mount: FisheyeMount;
  /** Horizontal center of the fisheye circle, as a fraction of image width. */
  center_x: number;
  /** Vertical center of the fisheye circle, as a fraction of image height. */
  center_y: number;
  /** Radius of the fisheye circle, as a fraction of image height. */
  radius: number;
  /** Field of view covered by the fisheye circle, in degrees. */
  fov: number;
};

export const DEFAULT_FISHEYE_SETTINGS: FisheyeSettings = Object.freeze({
  mount: "ceiling",
  center_x: 0.5,
  center_y: 0.5,
  radius: 0.5,
  fov: 180,
});
