export interface LocalAnnotation {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LocalDatasetItem {
  id: string;
  event_id: string | null;
  camera: string;
  label: string | null;
  annotations: LocalAnnotation[];
}

export interface LocalDatasetListResponse {
  total: number;
  items: LocalDatasetItem[];
}
