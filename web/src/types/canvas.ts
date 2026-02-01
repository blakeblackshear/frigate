export type PolygonType = "zone" | "motion_mask" | "object_mask";

export type Polygon = {
  typeIndex: number;
  camera: string;
  name: string;
  type: PolygonType;
  objects: string[];
  points: number[][];
  pointsOrder?: number[];
  distances: number[];
  isFinished: boolean;
  color: number[];
  friendly_name?: string;
};

export type ZoneFormValuesType = {
  name: string;
  friendly_name: string;
  inertia: number;
  loitering_time: number;
  isFinished: boolean;
  objects: string[];
  speedEstimation: boolean;
  lineA: number;
  lineB: number;
  lineC: number;
  lineD: number;
  speed_threshold: number;
};

export type ObjectMaskFormValuesType = {
  objects: string;
  polygon: {
    isFinished: boolean;
    name: string;
  };
};
