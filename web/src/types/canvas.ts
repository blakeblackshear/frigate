export type PolygonType = "zone" | "motion_mask" | "object_mask";

export type Polygon = {
  camera: string;
  name: string;
  type: PolygonType;
  objects: string[];
  points: number[][];
  isFinished: boolean;
  isUnsaved: boolean;
  color: number[];
};
