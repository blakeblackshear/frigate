export type Export = {
  id: string;
  camera: string;
  name: string;
  date: number;
  video_path: string;
  thumb_path: string;
  in_progress: boolean;
};

export type DeleteClipType = {
  file: string;
  exportName: string;
};
