import { ReviewSegment } from "./review";

type FrigateObjectState = {
  id: string;
  camera: string;
  frame_time: number;
  snapshot_time: number;
  label: string;
  sub_label: string | null;
  top_score: number;
  false_positive: boolean;
  start_time: number;
  end_time: number | null;
  score: number;
  box: [number, number, number, number];
  area: number;
  ratio: number;
  region: [number, number, number, number];
  current_zones: string[];
  entered_zones: string[];
  thumbnail: string | null;
  has_snapshot: boolean;
  has_clip: boolean;
  stationary: boolean;
  motionless_count: number;
  position_changes: number;
  attributes: {
    [key: string]: number;
  };
};

export interface FrigateReview {
  type: "new" | "update" | "end";
  before: ReviewSegment;
  after: ReviewSegment;
}

export interface FrigateEvent {
  type: "new" | "update" | "end";
  before: FrigateObjectState;
  after: FrigateObjectState;
}

export type ObjectType = {
  id: string;
  label: string;
  stationary: boolean;
  area: number;
  ratio: number;
  score: number;
  sub_label: string;
};

export interface FrigateCameraState {
  motion: boolean;
  objects: ObjectType[];
}

export type ModelState =
  | "not_downloaded"
  | "downloading"
  | "downloaded"
  | "error";

export type EmbeddingsReindexProgressType = {
  thumbnails: number;
  descriptions: number;
  processed_objects: number;
  total_objects: number;
  time_remaining: number;
  status: string;
};

export type ToggleableSetting = "ON" | "OFF";
