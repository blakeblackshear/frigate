export type PolygonType = "zone" | "motion_mask" | "object_mask";

export type Polygon = {
  typeIndex: number;
  camera: string;
  name: string;
  type: PolygonType;
  objects: string[];
  points: number[][];
  isFinished: boolean;
  // isUnsaved: boolean;
  color: number[];
};

export type ZoneFormValuesType = {
  name: string;
  inertia: number;
  loitering_time: number;
  isFinished: boolean;
  objects: string[];
  review_alerts: boolean;
  review_detections: boolean;
};

export type ObjectMaskFormValuesType = {
  objects: string;
  polygon: {
    isFinished: boolean;
    name: string;
  };
};
