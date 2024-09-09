type SearchSource = "thumbnail" | "description";

export type SearchResult = {
  id: string;
  camera: string;
  description?: string;
  start_time: number;
  end_time?: number;
  score: number;
  label: string;
  sub_label?: string;
  thumb_path?: string;
  zones: string[];
  search_source: SearchSource;
  search_distance: number;
};

export type SearchFilter = {
  cameras?: string[];
  labels?: string[];
  zones?: string[];
  before?: number;
  after?: number;
};
