export interface Event {
  id: string;
  label: string;
  sub_label?: string;
  camera: string;
  start_time: number;
  end_time?: number;
  false_positive: boolean;
  zones: string[];
  thumbnail: string;
  has_clip: boolean;
  has_snapshot: boolean;
  retain_indefinitely: boolean;
  plus_id?: string;
  model_hash?: string;
  data: {
    top_score: number;
    score: number;
    sub_label_score?: number;
    region: number[];
    box: number[];
    area: number;
    ratio: number;
    type: "object" | "audio" | "manual";
    recognized_license_plate?: string;
    path_data: [number[], number][];
    // Allow arbitrary keys for attributes (e.g., model_name, model_name_score)
    [key: string]:
      | number
      | number[]
      | string
      | [number[], number][]
      | undefined;
  };
}
