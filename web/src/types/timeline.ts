export enum LifecycleClassType {
  VISIBLE = "visible",
  GONE = "gone",
  ENTERED_ZONE = "entered_zone",
  ATTRIBUTE = "attribute",
  ACTIVE = "active",
  STATIONARY = "stationary",
  HEARD = "heard",
  EXTERNAL = "external",
  PATH_POINT = "path_point",
}

export type ObjectLifecycleSequence = {
  camera: string;
  timestamp: number;
  data: {
    camera: string;
    label: string;
    sub_label: string;
    box?: [number, number, number, number];
    region: [number, number, number, number];
    attribute: string;
    zones: string[];
  };
  class_type: LifecycleClassType;
  source_id: string;
  source: string;
};

export type TimeRange = { before: number; after: number };

export type TimelineType = "timeline" | "events";

export type TimelineScrubMode = "auto" | "drag" | "hover" | "compat";

export type Position = {
  x: number;
  y: number;
  timestamp: number;
  lifecycle_item?: ObjectLifecycleSequence;
};
