export type Export = {
  id: string;
  camera: string;
  name: string;
  date: number;
  video_path: string;
  thumb_path: string;
  in_progress: boolean;
  export_case?: string | null;
  export_case_id?: string | null;
};

export type ExportCase = {
  id: string;
  name: string;
  description: string;
  created_at: number;
  updated_at: number;
};

export type BatchExportBody = {
  start_time: number;
  end_time: number;
  camera_ids: string[];
  name?: string;
  export_case_id?: string;
  new_case_name?: string;
  new_case_description?: string;
};

export type BatchExportResult = {
  camera: string;
  export_id?: string | null;
  success: boolean;
  error?: string | null;
};

export type BatchExportResponse = {
  export_case_id: string;
  export_ids: string[];
  results: BatchExportResult[];
};

export type CameraActivity = {
  camera: string;
  count: number;
  intensity: number;
  hasDetections: boolean;
};

export type DeleteClipType = {
  file: string;
  exportName: string;
};

// filtering

const EXPORT_FILTERS = ["cameras"] as const;
export type ExportFilters = (typeof EXPORT_FILTERS)[number];
export const DEFAULT_EXPORT_FILTERS: ExportFilters[] = ["cameras"];

export type ExportFilter = {
  cameras?: string[];
};
