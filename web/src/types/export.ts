export type Export = {
  id: string;
  camera: string;
  name: string;
  date: number;
  video_path: string;
  thumb_path: string;
  in_progress: boolean;
  export_case?: string;
};

export type ExportCase = {
  id: string;
  name: string;
  description: string;
  created_at: number;
  updated_at: number;
};

export type DeleteClipType = {
  file: string;
  exportName: string;
};
