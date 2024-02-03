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

export interface FrigateEvent {
  type: "new" | "update" | "end";
  before: FrigateObjectState;
  after: FrigateObjectState;
}
