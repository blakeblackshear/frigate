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
};

export type ZoneFormValuesType = {
  name: string;
  inertia: number;
  loitering_time: number;
  isFinished: boolean;
  objects: string[];
  speedEstimation: boolean;
  lineA: number;
  lineB: number;
  lineC: number;
  lineD: number;
};

export type ObjectMaskFormValuesType = {
  objects: string;
  polygon: {
    isFinished: boolean;
    name: string;
  };
};
